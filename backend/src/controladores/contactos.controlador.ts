import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { registrarCambio } from "../servicios/bitacora.servicio.js";
import { correoValido, telefonoValido, textoOpcional } from "../servicios/validaciones.servicio.js";
import { rechazar } from "./usuarios.controlador.js";

const SQL_CONTACTO = `
  SELECT ct.id_contacto, ct.id_cliente, ct.nombres, ct.apellidos, ct.cargo, ct.telefono, ct.correo, ct.es_principal,
         COALESCE(ce.razon_social, TRIM(COALESCE(ci.nombres, '') || ' ' || COALESCE(ci.apellidos, ''))) AS nombre_cliente
  FROM contactos_cliente ct
  JOIN clientes c ON c.id_cliente = ct.id_cliente
  LEFT JOIN clientes_individuales ci ON ci.id_cliente = c.id_cliente
  LEFT JOIN clientes_empresas ce ON ce.id_cliente = c.id_cliente
`;

type DatosContacto = {
  nombres: string;
  apellidos: string;
  cargo: string | null;
  telefono: string | null;
  correo: string | null;
  esPrincipal: boolean;
};

function leerContacto(cuerpo: Record<string, unknown>): { error: string } | { datos: DatosContacto } {
  const nombres = String(cuerpo.nombres ?? "").trim();
  const apellidos = String(cuerpo.apellidos ?? "").trim();
  const cargo = textoOpcional(cuerpo.cargo);
  const telefono = textoOpcional(cuerpo.telefono);
  const correo = textoOpcional(cuerpo.correo)?.toLowerCase() ?? null;

  if (!nombres || nombres.length > 100) {
    return { error: "Los nombres del contacto son obligatorios (máximo 100 caracteres)" };
  }
  if (!apellidos || apellidos.length > 100) {
    return { error: "Los apellidos del contacto son obligatorios (máximo 100 caracteres)" };
  }
  if (cargo && cargo.length > 80) {
    return { error: "El cargo no puede superar los 80 caracteres" };
  }
  if (telefono && telefono.length > 30) {
    return { error: "El teléfono no puede superar los 30 caracteres" };
  }
  if (telefono && !telefonoValido(telefono)) {
    return { error: "Ingrese un teléfono válido (de 8 a 15 dígitos; se permiten espacios, +, - y paréntesis)" };
  }
  if (correo && !correoValido(correo)) {
    return { error: "Ingrese un correo válido" };
  }
  return { datos: { nombres, apellidos, cargo, telefono, correo, esPrincipal: cuerpo.es_principal === true } };
}

async function bloquearCliente(cx: PoolClient, idCliente: number) {
  const resultado = await cx.query("SELECT id_cliente FROM clientes WHERE id_cliente = $1 FOR UPDATE", [
    Number.isInteger(idCliente) ? idCliente : null,
  ]);
  return Boolean(resultado.rows[0]);
}

async function quitarPrincipalAnterior(cx: PoolClient, idCliente: number, idExcluido: number, idUsuario?: number) {
  const anteriores = await cx.query(
    `${SQL_CONTACTO} WHERE ct.id_cliente = $1 AND ct.es_principal = TRUE AND ct.id_contacto <> $2 FOR UPDATE OF ct`,
    [idCliente, idExcluido],
  );
  for (const anterior of anteriores.rows) {
    await cx.query("UPDATE contactos_cliente SET es_principal = FALSE WHERE id_contacto = $1", [anterior.id_contacto]);
    await registrarCambio(cx, {
      idUsuario,
      tabla: "contactos_cliente",
      idRegistro: anterior.id_contacto,
      accion: "EDITAR",
      antes: anterior,
      despues: { ...anterior, es_principal: false },
      nota: "Dejó de ser el contacto principal porque se designó otro",
    });
  }
}

export async function listarContactos(req: Request, res: Response) {
  const idCliente = Number(req.params.id);
  try {
    const cliente = await pool.query("SELECT id_cliente FROM clientes WHERE id_cliente = $1", [
      Number.isInteger(idCliente) ? idCliente : null,
    ]);
    if (!cliente.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Cliente no encontrado" });
      return;
    }
    const resultado = await pool.query(
      `${SQL_CONTACTO} WHERE ct.id_cliente = $1 ORDER BY ct.es_principal DESC, ct.id_contacto`,
      [idCliente],
    );
    res.json({ ok: true, contactos: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar contactos" });
  }
}

export async function crearContacto(req: Request, res: Response) {
  const idCliente = Number(req.params.id);
  const lectura = leerContacto(req.body ?? {});
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
    if (datos.esPrincipal) {
      await quitarPrincipalAnterior(cx, idCliente, 0, req.usuario?.id_usuario);
    }
    const insertado = await cx.query(
      `INSERT INTO contactos_cliente (id_cliente, nombres, apellidos, cargo, telefono, correo, es_principal)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_contacto`,
      [idCliente, datos.nombres, datos.apellidos, datos.cargo, datos.telefono, datos.correo, datos.esPrincipal],
    );
    const idContacto = insertado.rows[0].id_contacto as number;
    const creado = await cx.query(`${SQL_CONTACTO} WHERE ct.id_contacto = $1`, [idContacto]);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "contactos_cliente",
      idRegistro: idContacto,
      accion: "CREAR",
      despues: creado.rows[0],
    });
    await cx.query("COMMIT");
    res.status(201).json({ ok: true, contacto: creado.rows[0] });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al crear el contacto" });
  } finally {
    cx.release();
  }
}

export async function actualizarContacto(req: Request, res: Response) {
  const idCliente = Number(req.params.id);
  const idContacto = Number(req.params.idContacto);
  if (!Number.isInteger(idContacto)) {
    res.status(404).json({ ok: false, mensaje: "Contacto no encontrado" });
    return;
  }
  const lectura = leerContacto(req.body ?? {});
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
      `${SQL_CONTACTO} WHERE ct.id_contacto = $1 AND ct.id_cliente = $2 FOR UPDATE OF ct`,
      [idContacto, idCliente],
    );
    if (!antes.rows[0]) {
      await rechazar(cx, res, 404, "Contacto no encontrado");
      return;
    }
    if (datos.esPrincipal) {
      await quitarPrincipalAnterior(cx, idCliente, idContacto, req.usuario?.id_usuario);
    }
    await cx.query(
      `UPDATE contactos_cliente
       SET nombres = $2, apellidos = $3, cargo = $4, telefono = $5, correo = $6, es_principal = $7
       WHERE id_contacto = $1`,
      [idContacto, datos.nombres, datos.apellidos, datos.cargo, datos.telefono, datos.correo, datos.esPrincipal],
    );
    const despues = await cx.query(`${SQL_CONTACTO} WHERE ct.id_contacto = $1`, [idContacto]);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "contactos_cliente",
      idRegistro: idContacto,
      accion: "EDITAR",
      antes: antes.rows[0],
      despues: despues.rows[0],
    });
    await cx.query("COMMIT");
    res.json({ ok: true, contacto: despues.rows[0] });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al actualizar el contacto" });
  } finally {
    cx.release();
  }
}

export async function eliminarContacto(req: Request, res: Response) {
  const idCliente = Number(req.params.id);
  const idContacto = Number(req.params.idContacto);
  if (!Number.isInteger(idContacto)) {
    res.status(404).json({ ok: false, mensaje: "Contacto no encontrado" });
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
      `${SQL_CONTACTO} WHERE ct.id_contacto = $1 AND ct.id_cliente = $2 FOR UPDATE OF ct`,
      [idContacto, idCliente],
    );
    if (!existente.rows[0]) {
      await rechazar(cx, res, 404, "Contacto no encontrado");
      return;
    }
    await cx.query("DELETE FROM contactos_cliente WHERE id_contacto = $1", [idContacto]);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "contactos_cliente",
      idRegistro: idContacto,
      accion: "ELIMINAR",
      antes: existente.rows[0],
    });
    await cx.query("COMMIT");
    res.json({ ok: true, mensaje: "Contacto eliminado" });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al eliminar el contacto" });
  } finally {
    cx.release();
  }
}
