import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { registrarCambio } from "../servicios/bitacora.servicio.js";
import { textoOpcional } from "../servicios/validaciones.servicio.js";
import { rechazar } from "./usuarios.controlador.js";

const TIPOS_DIRECCION = ["FISCAL", "ENTREGA", "OTRA"];

const SQL_DIRECCION = `
  SELECT d.id_direccion, d.id_cliente, d.tipo, d.departamento_gt, d.municipio, d.detalle,
         COALESCE(ce.razon_social, TRIM(COALESCE(ci.nombres, '') || ' ' || COALESCE(ci.apellidos, ''))) AS nombre_cliente
  FROM direcciones d
  JOIN clientes c ON c.id_cliente = d.id_cliente
  LEFT JOIN clientes_individuales ci ON ci.id_cliente = c.id_cliente
  LEFT JOIN clientes_empresas ce ON ce.id_cliente = c.id_cliente
`;

type DatosDireccion = {
  tipo: string;
  departamento: string | null;
  municipio: string | null;
  detalle: string;
};

function leerDireccion(cuerpo: Record<string, unknown>): { error: string } | { datos: DatosDireccion } {
  const tipo = String(cuerpo.tipo ?? "FISCAL").trim().toUpperCase();
  const departamento = textoOpcional(cuerpo.departamento_gt);
  const municipio = textoOpcional(cuerpo.municipio);
  const detalle = String(cuerpo.detalle ?? "").trim();

  if (!TIPOS_DIRECCION.includes(tipo)) {
    return { error: "Seleccione un tipo de dirección válido (fiscal, entrega u otra)" };
  }
  if (!detalle || detalle.length > 500) {
    return { error: "El detalle de la dirección es obligatorio (máximo 500 caracteres)" };
  }
  if (departamento && departamento.length > 80) {
    return { error: "El departamento no puede superar los 80 caracteres" };
  }
  if (municipio && municipio.length > 80) {
    return { error: "El municipio no puede superar los 80 caracteres" };
  }
  return { datos: { tipo, departamento, municipio, detalle } };
}

async function bloquearCliente(cx: PoolClient, idCliente: number) {
  const resultado = await cx.query("SELECT id_cliente FROM clientes WHERE id_cliente = $1 FOR UPDATE", [
    Number.isInteger(idCliente) ? idCliente : null,
  ]);
  return Boolean(resultado.rows[0]);
}

export async function listarDirecciones(req: Request, res: Response) {
  const idCliente = Number(req.params.id);
  try {
    const cliente = await pool.query("SELECT id_cliente FROM clientes WHERE id_cliente = $1", [
      Number.isInteger(idCliente) ? idCliente : null,
    ]);
    if (!cliente.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Cliente no encontrado" });
      return;
    }
    const resultado = await pool.query(`${SQL_DIRECCION} WHERE d.id_cliente = $1 ORDER BY d.id_direccion`, [idCliente]);
    res.json({ ok: true, direcciones: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar direcciones" });
  }
}

export async function crearDireccion(req: Request, res: Response) {
  const idCliente = Number(req.params.id);
  const lectura = leerDireccion(req.body ?? {});
  if ("error" in lectura) {
    res.status(400).json({ ok: false, mensaje: lectura.error });
    return;
  }
  const { datos } = lectura;

  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    if (!(await bloquearCliente(cx, idCliente))) {
      await rechazar(cx, res, 404, "Cliente no encontrado");
      return;
    }
    const insertada = await cx.query(
      `INSERT INTO direcciones (id_cliente, tipo, departamento_gt, municipio, detalle)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_direccion`,
      [idCliente, datos.tipo, datos.departamento, datos.municipio, datos.detalle],
    );
    const idDireccion = insertada.rows[0].id_direccion as number;
    const creada = await cx.query(`${SQL_DIRECCION} WHERE d.id_direccion = $1`, [idDireccion]);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "direcciones",
      idRegistro: idDireccion,
      accion: "CREAR",
      despues: creada.rows[0],
    });
    await cx.query("COMMIT");
    res.status(201).json({ ok: true, direccion: creada.rows[0] });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al crear la dirección" });
  } finally {
    cx.release();
  }
}

export async function actualizarDireccion(req: Request, res: Response) {
  const idCliente = Number(req.params.id);
  const idDireccion = Number(req.params.idDireccion);
  if (!Number.isInteger(idDireccion)) {
    res.status(404).json({ ok: false, mensaje: "Dirección no encontrada" });
    return;
  }
  const lectura = leerDireccion(req.body ?? {});
  if ("error" in lectura) {
    res.status(400).json({ ok: false, mensaje: lectura.error });
    return;
  }
  const { datos } = lectura;

  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    if (!(await bloquearCliente(cx, idCliente))) {
      await rechazar(cx, res, 404, "Cliente no encontrado");
      return;
    }
    const antes = await cx.query(
      `${SQL_DIRECCION} WHERE d.id_direccion = $1 AND d.id_cliente = $2 FOR UPDATE OF d`,
      [idDireccion, idCliente],
    );
    if (!antes.rows[0]) {
      await rechazar(cx, res, 404, "Dirección no encontrada");
      return;
    }
    await cx.query(
      `UPDATE direcciones
       SET tipo = $2, departamento_gt = $3, municipio = $4, detalle = $5
       WHERE id_direccion = $1`,
      [idDireccion, datos.tipo, datos.departamento, datos.municipio, datos.detalle],
    );
    const despues = await cx.query(`${SQL_DIRECCION} WHERE d.id_direccion = $1`, [idDireccion]);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "direcciones",
      idRegistro: idDireccion,
      accion: "EDITAR",
      antes: antes.rows[0],
      despues: despues.rows[0],
    });
    await cx.query("COMMIT");
    res.json({ ok: true, direccion: despues.rows[0] });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al actualizar la dirección" });
  } finally {
    cx.release();
  }
}

export async function eliminarDireccion(req: Request, res: Response) {
  const idCliente = Number(req.params.id);
  const idDireccion = Number(req.params.idDireccion);
  if (!Number.isInteger(idDireccion)) {
    res.status(404).json({ ok: false, mensaje: "Dirección no encontrada" });
    return;
  }

  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    if (!(await bloquearCliente(cx, idCliente))) {
      await rechazar(cx, res, 404, "Cliente no encontrado");
      return;
    }
    const existente = await cx.query(
      `${SQL_DIRECCION} WHERE d.id_direccion = $1 AND d.id_cliente = $2 FOR UPDATE OF d`,
      [idDireccion, idCliente],
    );
    if (!existente.rows[0]) {
      await rechazar(cx, res, 404, "Dirección no encontrada");
      return;
    }
    await cx.query("DELETE FROM direcciones WHERE id_direccion = $1", [idDireccion]);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "direcciones",
      idRegistro: idDireccion,
      accion: "ELIMINAR",
      antes: existente.rows[0],
    });
    await cx.query("COMMIT");
    res.json({ ok: true, mensaje: "Dirección eliminada" });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al eliminar la dirección" });
  } finally {
    cx.release();
  }
}
