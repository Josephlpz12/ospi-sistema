import type { Request, Response } from "express";
import { pool } from "../db.js";
import { TABLAS_BITACORA, describirDetalle } from "../servicios/bitacora.servicio.js";

const TAMANO_MAXIMO = 100;
const TAMANO_PREDETERMINADO = 20;

const FILTROS = `
  WHERE ($1::int IS NULL OR h.id_usuario = $1)
    AND ($2::text IS NULL OR h.tabla = $2)
    AND ($3::date IS NULL OR h.creado_en >= (($3::date)::timestamp AT TIME ZONE 'America/Guatemala'))
    AND ($4::date IS NULL OR h.creado_en < ((($4::date) + 1)::timestamp AT TIME ZONE 'America/Guatemala'))
`;

function texto(valor: unknown) {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;
}

function enteroPositivo(valor: string | null) {
  if (valor === null) return null;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : undefined;
}

function fechaValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export async function listarBitacora(req: Request, res: Response) {
  const idUsuario = enteroPositivo(texto(req.query.id_usuario));
  if (idUsuario === undefined) {
    res.status(400).json({ ok: false, mensaje: "Usuario inválido" });
    return;
  }

  const tabla = texto(req.query.tabla);
  if (tabla !== null && !(TABLAS_BITACORA as readonly string[]).includes(tabla)) {
    res.status(400).json({ ok: false, mensaje: "Tipo de registro inválido" });
    return;
  }

  const desde = texto(req.query.desde);
  const hasta = texto(req.query.hasta);
  if ((desde !== null && !fechaValida(desde)) || (hasta !== null && !fechaValida(hasta))) {
    res.status(400).json({ ok: false, mensaje: "Fecha inválida" });
    return;
  }
  if (desde !== null && hasta !== null && desde > hasta) {
    res.status(400).json({ ok: false, mensaje: "La fecha inicial no puede ser posterior a la fecha final" });
    return;
  }

  const pagina = enteroPositivo(texto(req.query.pagina)) ?? 1;
  const tamano = Math.min(enteroPositivo(texto(req.query.tamano)) ?? TAMANO_PREDETERMINADO, TAMANO_MAXIMO);
  const filtros = [idUsuario, tabla, desde, hasta];

  try {
    const [total, filas] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM historial_cambios h ${FILTROS}`, filtros),
      pool.query(
        `SELECT h.id_historial, h.tabla, h.id_registro, h.accion, h.id_usuario, u.nombre_usuario,
                h.detalle, h.creado_en
         FROM historial_cambios h
         LEFT JOIN usuarios u ON u.id_usuario = h.id_usuario
         ${FILTROS}
         ORDER BY h.creado_en DESC, h.id_historial DESC
         LIMIT $5 OFFSET $6`,
        [...filtros, tamano, (pagina - 1) * tamano],
      ),
    ]);

    const registros = filas.rows.map(({ detalle, ...registro }) => ({
      ...registro,
      lineas: describirDetalle(detalle),
    }));
    res.json({ ok: true, registros, total: total.rows[0].total, pagina, tamano });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al consultar la bitácora" });
  }
}
