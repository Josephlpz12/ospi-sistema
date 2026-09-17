import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Request, Response } from "express";
import multer from "multer";
import { pool } from "../db.js";

export const carpetaUploads = join(process.cwd(), "uploads");
mkdirSync(carpetaUploads, { recursive: true });

const almacenamiento = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, carpetaUploads),
  filename: (_req, file, cb) => {
    const seguro = file.originalname.replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]+/g, "_");
    cb(null, `${Date.now()}-${seguro}`);
  },
});

export const subirArchivo = multer({
  storage: almacenamiento,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function listarDocumentos(req: Request, res: Response) {
  const idCliente = req.query.id_cliente ? Number(req.query.id_cliente) : null;
  const idProyecto = req.query.id_proyecto ? Number(req.query.id_proyecto) : null;
  if (!idCliente && !idProyecto) {
    res.status(400).json({ ok: false, mensaje: "Indique id_cliente o id_proyecto" });
    return;
  }
  try {
    const resultado = await pool.query(
      `SELECT id_documento, id_cliente, id_proyecto, nombre, tipo, ruta_archivo, subido_en
       FROM documentos
       WHERE ($1::int IS NULL OR id_cliente = $1)
         AND ($2::int IS NULL OR id_proyecto = $2)
       ORDER BY subido_en DESC`,
      [idCliente, idProyecto],
    );
    res.json({ ok: true, documentos: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar documentos" });
  }
}

export async function crearDocumento(req: Request, res: Response) {
  const archivo = req.file;
  if (!archivo) {
    res.status(400).json({ ok: false, mensaje: "Debe adjuntar un archivo" });
    return;
  }
  const idCliente = req.body.id_cliente ? Number(req.body.id_cliente) : null;
  const idProyecto = req.body.id_proyecto ? Number(req.body.id_proyecto) : null;
  if (!idCliente && !idProyecto) {
    res.status(400).json({ ok: false, mensaje: "Indique id_cliente o id_proyecto" });
    return;
  }
  try {
    const insertado = await pool.query(
      `INSERT INTO documentos (id_cliente, id_proyecto, nombre, tipo, ruta_archivo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_documento, id_cliente, id_proyecto, nombre, tipo, ruta_archivo, subido_en`,
      [idCliente, idProyecto, archivo.originalname, archivo.mimetype, archivo.filename],
    );
    res.status(201).json({ ok: true, documento: insertado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al guardar el documento" });
  }
}

export async function eliminarDocumento(req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      `DELETE FROM documentos WHERE id_documento = $1 RETURNING id_documento`,
      [req.params.id],
    );
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Documento no encontrado" });
      return;
    }
    res.json({ ok: true, mensaje: "Documento eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al eliminar el documento" });
  }
}
