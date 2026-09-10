import type { Request, Response } from "express";
import { pool } from "../db.js";
import { proyectoExiste } from "./fases.controlador.js";

const SQL_TAREA = `
  SELECT t.id_tarea, t.id_proyecto, t.id_fase, t.id_asignado, t.titulo, t.descripcion,
         t.estado, t.fecha_limite, t.porcentaje,
         f.nombre AS nombre_fase,
         TRIM(COALESCE(e.nombres, '') || ' ' || COALESCE(e.apellidos, '')) AS nombre_asignado
  FROM tareas t
  LEFT JOIN fases_proyecto f ON f.id_fase = t.id_fase
  LEFT JOIN empleados e ON e.id_empleado = t.id_asignado
`;

export async function listarTareas(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  try {
    if (!(await proyectoExiste(idProyecto))) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }
    const resultado = await pool.query(`${SQL_TAREA} WHERE t.id_proyecto = $1 ORDER BY t.id_tarea`, [idProyecto]);
    res.json({ ok: true, tareas: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar tareas" });
  }
}

export async function crearTarea(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  const titulo = String(req.body.titulo ?? "").trim();
  if (!titulo) {
    res.status(400).json({ ok: false, mensaje: "El título de la tarea es obligatorio" });
    return;
  }
  try {
    if (!(await proyectoExiste(idProyecto))) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }
    const insertado = await pool.query(
      `INSERT INTO tareas (id_proyecto, id_fase, id_asignado, titulo, descripcion, estado, fecha_limite, porcentaje)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'PENDIENTE'), $7, COALESCE($8, 0))
       RETURNING id_tarea`,
      [
        idProyecto,
        req.body.id_fase || null,
        req.body.id_asignado || null,
        titulo,
        req.body.descripcion ?? null,
        req.body.estado ?? "PENDIENTE",
        req.body.fecha_limite ?? null,
        req.body.porcentaje ?? 0,
      ],
    );
    const creado = await pool.query(`${SQL_TAREA} WHERE t.id_tarea = $1`, [insertado.rows[0].id_tarea]);
    res.status(201).json({ ok: true, tarea: creado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al crear la tarea" });
  }
}

export async function actualizarTarea(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  const idTarea = Number(req.params.idTarea);
  try {
    const resultado = await pool.query(
      `UPDATE tareas SET
         id_fase = COALESCE($3, id_fase),
         id_asignado = COALESCE($4, id_asignado),
         titulo = COALESCE($5, titulo),
         descripcion = COALESCE($6, descripcion),
         estado = COALESCE($7, estado),
         fecha_limite = COALESCE($8, fecha_limite),
         porcentaje = COALESCE($9, porcentaje)
       WHERE id_tarea = $1 AND id_proyecto = $2
       RETURNING id_tarea`,
      [
        idTarea,
        idProyecto,
        req.body.id_fase ?? null,
        req.body.id_asignado ?? null,
        req.body.titulo ?? null,
        req.body.descripcion ?? null,
        req.body.estado ?? null,
        req.body.fecha_limite ?? null,
        req.body.porcentaje ?? null,
      ],
    );
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Tarea no encontrada" });
      return;
    }
    const actualizado = await pool.query(`${SQL_TAREA} WHERE t.id_tarea = $1`, [idTarea]);
    res.json({ ok: true, tarea: actualizado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al actualizar la tarea" });
  }
}

export async function eliminarTarea(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  const idTarea = Number(req.params.idTarea);
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("DELETE FROM asignaciones WHERE id_tarea = $1", [idTarea]);
    await cliente.query("UPDATE comentarios SET id_tarea = NULL WHERE id_tarea = $1", [idTarea]);
    const resultado = await cliente.query(
      "DELETE FROM tareas WHERE id_tarea = $1 AND id_proyecto = $2 RETURNING id_tarea",
      [idTarea, idProyecto],
    );
    if (!resultado.rows[0]) {
      await cliente.query("ROLLBACK");
      res.status(404).json({ ok: false, mensaje: "Tarea no encontrada" });
      return;
    }
    await cliente.query("COMMIT");
    res.json({ ok: true, mensaje: "Tarea eliminada" });
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al eliminar la tarea" });
  } finally {
    cliente.release();
  }
}
