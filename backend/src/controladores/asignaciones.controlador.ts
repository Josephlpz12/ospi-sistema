import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { registrarCambio } from "../servicios/bitacora.servicio.js";
import { proyectoExiste } from "./fases.controlador.js";
import { rechazar } from "./usuarios.controlador.js";

const ROL_RESPONSABLE = "Responsable";
const ROL_MIEMBRO = "Miembro del equipo";

const SQL_ASIGNACION = `
  SELECT a.id_asignacion, a.id_proyecto, a.id_empleado, a.id_tarea, a.rol_en_proyecto, a.fecha_asignacion,
         TRIM(e.nombres || ' ' || e.apellidos) AS nombre_empleado, e.cargo,
         t.titulo AS titulo_tarea, p.nombre AS nombre_proyecto
  FROM asignaciones a
  JOIN empleados e ON e.id_empleado = a.id_empleado
  JOIN proyectos p ON p.id_proyecto = a.id_proyecto
  LEFT JOIN tareas t ON t.id_tarea = a.id_tarea
`;

export async function listarAsignaciones(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  try {
    if (!Number.isInteger(idProyecto) || !(await proyectoExiste(idProyecto))) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }
    const resultado = await pool.query(
      `${SQL_ASIGNACION}
       WHERE a.id_proyecto = $1
       ORDER BY a.id_tarea NULLS FIRST, a.id_asignacion`,
      [idProyecto],
    );
    res.json({ ok: true, asignaciones: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar asignaciones" });
  }
}

export async function asignarEmpleado(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  const idEmpleado = Number(req.body.id_empleado);
  const idTarea = req.body.id_tarea ? Number(req.body.id_tarea) : null;
  const rol = String(req.body.rol_en_proyecto ?? "").trim() || ROL_MIEMBRO;

  if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
    res.status(400).json({ ok: false, mensaje: "Seleccione un empleado" });
    return;
  }
  if (idTarea !== null && (!Number.isInteger(idTarea) || idTarea <= 0)) {
    res.status(400).json({ ok: false, mensaje: "Seleccione una tarea válida" });
    return;
  }
  if (rol !== ROL_RESPONSABLE && rol !== ROL_MIEMBRO) {
    res.status(400).json({ ok: false, mensaje: "Rol inválido" });
    return;
  }

  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    const proyecto = await cx.query("SELECT id_proyecto FROM proyectos WHERE id_proyecto = $1 FOR UPDATE", [
      Number.isInteger(idProyecto) ? idProyecto : null,
    ]);
    if (!proyecto.rows[0]) {
      await rechazar(cx, res, 404, "Proyecto no encontrado");
      return;
    }

    const empleado = await cx.query(
      `SELECT e.id_empleado
       FROM empleados e
       JOIN usuarios u ON u.id_usuario = e.id_usuario
       WHERE e.id_empleado = $1 AND e.activo = TRUE AND u.activo = TRUE`,
      [idEmpleado],
    );
    if (!empleado.rows[0]) {
      await rechazar(cx, res, 400, "El empleado no está disponible: debe estar activo y tener un usuario activo");
      return;
    }

    if (idTarea !== null) {
      const tarea = await cx.query("SELECT id_tarea FROM tareas WHERE id_tarea = $1 AND id_proyecto = $2", [
        idTarea,
        idProyecto,
      ]);
      if (!tarea.rows[0]) {
        await rechazar(cx, res, 400, "La tarea no pertenece a este proyecto");
        return;
      }
    }

    const repetida = await cx.query(
      `SELECT id_asignacion FROM asignaciones
       WHERE id_proyecto = $1 AND id_empleado = $2 AND id_tarea IS NOT DISTINCT FROM $3::int`,
      [idProyecto, idEmpleado, idTarea],
    );
    if (repetida.rows[0]) {
      await rechazar(
        cx,
        res,
        409,
        idTarea === null ? "Ese empleado ya está asignado a este proyecto" : "Ese empleado ya está asignado a esta tarea",
      );
      return;
    }

    if (rol === ROL_RESPONSABLE) {
      const responsable = await cx.query(
        `SELECT id_asignacion FROM asignaciones
         WHERE id_proyecto = $1 AND id_tarea IS NOT DISTINCT FROM $2::int AND rol_en_proyecto = $3`,
        [idProyecto, idTarea, ROL_RESPONSABLE],
      );
      if (responsable.rows[0]) {
        await rechazar(cx, res, 409, "Ya hay un responsable asignado; quítelo antes de asignar otro");
        return;
      }
    }

    const insertada = await cx.query(
      `INSERT INTO asignaciones (id_proyecto, id_empleado, id_tarea, rol_en_proyecto)
       VALUES ($1, $2, $3, $4)
       RETURNING id_asignacion`,
      [idProyecto, idEmpleado, idTarea, rol],
    );
    const idAsignacion = insertada.rows[0].id_asignacion as number;
    const creada = await cx.query(`${SQL_ASIGNACION} WHERE a.id_asignacion = $1`, [idAsignacion]);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "asignaciones",
      idRegistro: idAsignacion,
      accion: "ASIGNAR",
      despues: creada.rows[0],
    });
    await cx.query("COMMIT");
    res.status(201).json({ ok: true, asignacion: creada.rows[0] });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al asignar el empleado" });
  } finally {
    cx.release();
  }
}

export async function quitarAsignacion(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  const idAsignacion = Number(req.params.idAsignacion);
  if (!Number.isInteger(idProyecto) || !Number.isInteger(idAsignacion)) {
    res.status(404).json({ ok: false, mensaje: "Asignación no encontrada" });
    return;
  }
  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    const existente = await cx.query(
      `${SQL_ASIGNACION} WHERE a.id_asignacion = $1 AND a.id_proyecto = $2 FOR UPDATE OF a`,
      [idAsignacion, idProyecto],
    );
    if (!existente.rows[0]) {
      await rechazar(cx, res, 404, "Asignación no encontrada");
      return;
    }
    await cx.query("DELETE FROM asignaciones WHERE id_asignacion = $1", [idAsignacion]);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "asignaciones",
      idRegistro: idAsignacion,
      accion: "DESASIGNAR",
      antes: existente.rows[0],
    });
    await cx.query("COMMIT");
    res.json({ ok: true, mensaje: "Asignación eliminada" });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al quitar la asignación" });
  } finally {
    cx.release();
  }
}

export async function quitarAsignacionesDeTarea(
  cx: PoolClient,
  idTarea: number,
  idUsuario: number | undefined,
) {
  const existentes = await cx.query(`${SQL_ASIGNACION} WHERE a.id_tarea = $1`, [idTarea]);
  await cx.query("DELETE FROM asignaciones WHERE id_tarea = $1", [idTarea]);
  for (const fila of existentes.rows) {
    await registrarCambio(cx, {
      idUsuario,
      tabla: "asignaciones",
      idRegistro: fila.id_asignacion,
      accion: "DESASIGNAR",
      antes: fila,
      nota: "La tarea fue eliminada",
    });
  }
}
