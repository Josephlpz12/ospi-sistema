import type { Request, Response } from "express";
import { pool } from "../db.js";

export async function listarSuscripciones(req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      `SELECT s.id_suscripcion, s.id_cliente, s.id_producto, s.estado, s.fecha_inicio, s.fecha_fin,
              p.nombre AS nombre_producto
       FROM suscripciones s
       JOIN productos_software p ON p.id_producto = s.id_producto
       WHERE s.id_cliente = $1
       ORDER BY s.id_suscripcion DESC`,
      [req.params.id],
    );
    res.json({ ok: true, suscripciones: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar suscripciones" });
  }
}

export async function crearSuscripcion(req: Request, res: Response) {
  const idCliente = Number(req.params.id);
  const idProducto = Number(req.body.id_producto);
  const fechaInicio = req.body.fecha_inicio ?? new Date().toISOString().slice(0, 10);
  if (!idProducto) {
    res.status(400).json({ ok: false, mensaje: "id_producto es obligatorio" });
    return;
  }
  try {
    const cliente = await pool.query("SELECT id_cliente FROM clientes WHERE id_cliente = $1", [idCliente]);
    if (!cliente.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Cliente no encontrado" });
      return;
    }
    const insertado = await pool.query(
      `INSERT INTO suscripciones (id_cliente, id_producto, estado, fecha_inicio, fecha_fin)
       VALUES ($1, $2, COALESCE($3, 'ACTIVA'), $4, $5)
       RETURNING id_suscripcion, id_cliente, id_producto, estado, fecha_inicio, fecha_fin`,
      [idCliente, idProducto, req.body.estado ?? "ACTIVA", fechaInicio, req.body.fecha_fin ?? null],
    );
    res.status(201).json({ ok: true, suscripcion: insertado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al crear la suscripción" });
  }
}

export async function actualizarSuscripcion(req: Request, res: Response) {
  const estado = req.body.estado as string | undefined;
  if (estado && !["ACTIVA", "SUSPENDIDA", "CANCELADA"].includes(estado)) {
    res.status(400).json({ ok: false, mensaje: "Estado de suscripción inválido" });
    return;
  }
  try {
    const resultado = await pool.query(
      `UPDATE suscripciones SET
         estado = COALESCE($2, estado),
         fecha_fin = COALESCE($3, fecha_fin)
       WHERE id_suscripcion = $1
       RETURNING id_suscripcion, id_cliente, id_producto, estado, fecha_inicio, fecha_fin`,
      [req.params.id, estado ?? null, req.body.fecha_fin ?? null],
    );
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Suscripción no encontrada" });
      return;
    }
    res.json({ ok: true, suscripcion: resultado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al actualizar la suscripción" });
  }
}
