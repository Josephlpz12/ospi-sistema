import { createReadStream, mkdirSync } from "node:fs";
import { realpath } from "node:fs/promises";
import { basename, extname, join, resolve, sep } from "node:path";
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

const TIPOS_EN_LINEA: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function dentroDeCarpeta(archivo: string, carpeta: string) {
  const base = process.platform === "win32" ? carpeta.toLowerCase() : carpeta;
  const destino = process.platform === "win32" ? archivo.toLowerCase() : archivo;
  const prefijo = base.endsWith(sep) ? base : `${base}${sep}`;
  return destino.startsWith(prefijo);
}

function nombreParaCabecera(nombre: string) {
  const limpio = nombre.replace(/[\u0000-\u001F"\\;]/g, "").trim();
  return limpio || "documento";
}

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

export async function descargarDocumento(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(404).json({ ok: false, mensaje: "Documento no encontrado" });
    return;
  }
  try {
    const resultado = await pool.query(
      "SELECT nombre, ruta_archivo FROM documentos WHERE id_documento = $1",
      [id],
    );
    const fila = resultado.rows[0];
    const guardado = String(fila?.ruta_archivo ?? "");
    if (!fila || !guardado || guardado !== basename(guardado)) {
      res.status(404).json({ ok: false, mensaje: "Documento no encontrado" });
      return;
    }
    const absoluto = resolve(carpetaUploads, guardado);
    const raiz = await realpath(carpetaUploads);
    let real: string;
    try {
      real = await realpath(absoluto);
    } catch {
      res.status(404).json({ ok: false, mensaje: "Documento no encontrado" });
      return;
    }
    if (!dentroDeCarpeta(real, raiz)) {
      res.status(404).json({ ok: false, mensaje: "Documento no encontrado" });
      return;
    }
    const extension = extname(guardado).toLowerCase();
    const tipo = TIPOS_EN_LINEA[extension] ?? "application/octet-stream";
    const modo = extension in TIPOS_EN_LINEA ? "inline" : "attachment";
    const visible = nombreParaCabecera(String(fila.nombre));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", tipo);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader(
      "Content-Disposition",
      `${modo}; filename="${visible}"; filename*=UTF-8''${encodeURIComponent(visible)}`,
    );
    const flujo = createReadStream(real);
    flujo.on("error", () => {
      if (!res.headersSent) {
        res.status(500).json({ ok: false, mensaje: "Error al descargar el documento" });
        return;
      }
      res.destroy();
    });
    flujo.pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, mensaje: "Error al descargar el documento" });
    }
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
