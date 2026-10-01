import type { Request, Response } from "express";
import { pool } from "../db.js";

export async function listarProductos(_req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      `SELECT p.id_producto, p.nombre, p.descripcion, p.activo, c.nombre AS categoria
       FROM productos_software p
       LEFT JOIN categorias_producto c ON c.id_categoria = p.id_categoria
       WHERE p.activo = TRUE
       ORDER BY p.nombre`,
    );
    res.json({ ok: true, productos: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar productos" });
  }
}

export async function crearProducto(req: Request, res: Response) {
  const nombre = String(req.body.nombre ?? "").trim();
  if (!nombre) {
    res.status(400).json({ ok: false, mensaje: "El nombre del producto es obligatorio" });
    return;
  }
  try {
    const insertado = await pool.query(
      `INSERT INTO productos_software (id_categoria, nombre, descripcion, activo)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id_producto, nombre, descripcion, activo`,
      [req.body.id_categoria ?? null, nombre, req.body.descripcion ?? null],
    );
    res.status(201).json({ ok: true, producto: insertado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al crear el producto" });
  }
}
