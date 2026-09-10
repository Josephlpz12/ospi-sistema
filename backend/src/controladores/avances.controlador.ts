import type { Request, Response } from "express";
import { pool } from "../db.js";
import { proyectoExiste } from "./fases.controlador.js";

export async function listarAvances(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  try {
    if (!(await proyectoExiste(idProyecto))) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }
    const resultado = await pool.query(
      `SELECT a.id_avance, a.id_proyecto, a.id_usuario, a.porcentaje, a.comentario, a.registrado_en,
              u.nombre_usuario
       FROM avances a
       LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
       WHERE a.id_proyecto = $1
       ORDER BY a.registrado_en DESC`,
      [idProyecto],
    );
    res.json({ ok: true, avances: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar avances" });
  }
}

export async function registrarAvance(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  const porcentaje = Number(req.body.porcentaje);
  const comentario = String(req.body.comentario ?? "").trim();
  if (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    res.status(400).json({ ok: false, mensaje: "El porcentaje debe estar entre 0 y 100" });
    return;
  }
  try {
    if (!(await proyectoExiste(idProyecto))) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }
    const insertado = await pool.query(
      `INSERT INTO avances (id_proyecto, id_usuario, porcentaje, comentario)
       VALUES ($1, $2, $3, $4)
       RETURNING id_avance, id_proyecto, id_usuario, porcentaje, comentario, registrado_en`,
      [idProyecto, req.usuario?.id_usuario ?? null, porcentaje, comentario || null],
    );
    await pool.query("UPDATE proyectos SET porcentaje_avance = $2 WHERE id_proyecto = $1", [idProyecto, porcentaje]);
    res.status(201).json({ ok: true, avance: insertado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al registrar el avance" });
  }
}

export async function listarEmpleados(_req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      `SELECT id_empleado, nombres, apellidos, cargo, activo
       FROM empleados
       WHERE activo = TRUE
       ORDER BY apellidos, nombres`,
    );
    res.json({ ok: true, empleados: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar empleados" });
  }
}
