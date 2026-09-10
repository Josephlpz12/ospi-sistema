import type { Request, Response } from "express";
import { pool } from "../db.js";

export async function proyectoExiste(id: number) {
  const r = await pool.query("SELECT id_proyecto FROM proyectos WHERE id_proyecto = $1", [id]);
  return Boolean(r.rows[0]);
}

export async function listarFases(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  try {
    if (!(await proyectoExiste(idProyecto))) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }
    const resultado = await pool.query(
      `SELECT id_fase, id_proyecto, nombre, orden, fecha_inicio, fecha_fin, estado
       FROM fases_proyecto
       WHERE id_proyecto = $1
       ORDER BY orden, id_fase`,
      [idProyecto],
    );
    res.json({ ok: true, fases: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar fases" });
  }
}

export async function crearFase(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  const nombre = String(req.body.nombre ?? "").trim();
  if (!nombre) {
    res.status(400).json({ ok: false, mensaje: "El nombre de la fase es obligatorio" });
    return;
  }
  try {
    if (!(await proyectoExiste(idProyecto))) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }
    const maxOrden = await pool.query(
      "SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM fases_proyecto WHERE id_proyecto = $1",
      [idProyecto],
    );
    const orden = Number(req.body.orden) || Number(maxOrden.rows[0].siguiente);
    const insertado = await pool.query(
      `INSERT INTO fases_proyecto (id_proyecto, nombre, orden, fecha_inicio, fecha_fin, estado)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'PENDIENTE'))
       RETURNING id_fase, id_proyecto, nombre, orden, fecha_inicio, fecha_fin, estado`,
      [idProyecto, nombre, orden, req.body.fecha_inicio ?? null, req.body.fecha_fin ?? null, req.body.estado ?? "PENDIENTE"],
    );
    res.status(201).json({ ok: true, fase: insertado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al crear la fase" });
  }
}

export async function actualizarFase(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  const idFase = Number(req.params.idFase);
  try {
    const resultado = await pool.query(
      `UPDATE fases_proyecto SET
         nombre = COALESCE($3, nombre),
         orden = COALESCE($4, orden),
         fecha_inicio = COALESCE($5, fecha_inicio),
         fecha_fin = COALESCE($6, fecha_fin),
         estado = COALESCE($7, estado)
       WHERE id_fase = $1 AND id_proyecto = $2
       RETURNING id_fase, id_proyecto, nombre, orden, fecha_inicio, fecha_fin, estado`,
      [
        idFase,
        idProyecto,
        req.body.nombre ?? null,
        req.body.orden ?? null,
        req.body.fecha_inicio ?? null,
        req.body.fecha_fin ?? null,
        req.body.estado ?? null,
      ],
    );
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Fase no encontrada" });
      return;
    }
    res.json({ ok: true, fase: resultado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al actualizar la fase" });
  }
}

export async function eliminarFase(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  const idFase = Number(req.params.idFase);
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("UPDATE tareas SET id_fase = NULL WHERE id_fase = $1 AND id_proyecto = $2", [idFase, idProyecto]);
    const resultado = await cliente.query(
      "DELETE FROM fases_proyecto WHERE id_fase = $1 AND id_proyecto = $2 RETURNING id_fase",
      [idFase, idProyecto],
    );
    if (!resultado.rows[0]) {
      await cliente.query("ROLLBACK");
      res.status(404).json({ ok: false, mensaje: "Fase no encontrada" });
      return;
    }
    await cliente.query("COMMIT");
    res.json({ ok: true, mensaje: "Fase eliminada" });
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al eliminar la fase" });
  } finally {
    cliente.release();
  }
}
