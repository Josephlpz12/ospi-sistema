import type { Request, Response } from "express";
import { pool } from "../db.js";
import { registrarCambioAparte } from "../servicios/bitacora.servicio.js";
import { proyectoExiste } from "./fases.controlador.js";

const LARGO_MAXIMO = 2000;

const SQL_COMENTARIO = `
  SELECT c.id_comentario, c.id_proyecto, c.id_tarea, c.id_usuario, c.texto, c.creado_en,
         u.nombre_usuario, t.titulo AS titulo_tarea, p.nombre AS nombre_proyecto
  FROM comentarios c
  JOIN proyectos p ON p.id_proyecto = c.id_proyecto
  LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
  LEFT JOIN tareas t ON t.id_tarea = c.id_tarea
`;

export async function listarComentarios(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  try {
    if (!Number.isInteger(idProyecto) || !(await proyectoExiste(idProyecto))) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }
    const resultado = await pool.query(
      `${SQL_COMENTARIO}
       WHERE c.id_proyecto = $1
       ORDER BY c.creado_en ASC, c.id_comentario ASC`,
      [idProyecto],
    );
    res.json({ ok: true, comentarios: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar comentarios" });
  }
}

export async function crearComentario(req: Request, res: Response) {
  const idProyecto = Number(req.params.id);
  const texto = String(req.body.texto ?? "").trim();
  const idTarea = req.body.id_tarea ? Number(req.body.id_tarea) : null;

  if (!texto) {
    res.status(400).json({ ok: false, mensaje: "El comentario no puede estar vacío" });
    return;
  }
  if (texto.length > LARGO_MAXIMO) {
    res.status(400).json({ ok: false, mensaje: `El comentario no puede superar los ${LARGO_MAXIMO} caracteres` });
    return;
  }
  if (idTarea !== null && (!Number.isInteger(idTarea) || idTarea <= 0)) {
    res.status(400).json({ ok: false, mensaje: "Seleccione una tarea válida" });
    return;
  }

  try {
    if (!Number.isInteger(idProyecto) || !(await proyectoExiste(idProyecto))) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }
    if (idTarea !== null) {
      const tarea = await pool.query("SELECT id_tarea FROM tareas WHERE id_tarea = $1 AND id_proyecto = $2", [
        idTarea,
        idProyecto,
      ]);
      if (!tarea.rows[0]) {
        res.status(400).json({ ok: false, mensaje: "La tarea no pertenece a este proyecto" });
        return;
      }
    }

    const insertado = await pool.query(
      `INSERT INTO comentarios (id_proyecto, id_tarea, id_usuario, texto)
       VALUES ($1, $2, $3, $4)
       RETURNING id_comentario`,
      [idProyecto, idTarea, req.usuario?.id_usuario ?? null, texto],
    );
    const idComentario = insertado.rows[0].id_comentario as number;
    const creado = await pool.query(`${SQL_COMENTARIO} WHERE c.id_comentario = $1`, [idComentario]);
    await registrarCambioAparte({
      idUsuario: req.usuario?.id_usuario,
      tabla: "comentarios",
      idRegistro: idComentario,
      accion: "COMENTAR",
      despues: creado.rows[0],
    });
    res.status(201).json({ ok: true, comentario: creado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al guardar el comentario" });
  }
}
