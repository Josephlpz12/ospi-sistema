import type { Request, Response } from "express";
import { pool } from "../db.js";

const SQL_CLIENTE = `
  SELECT c.id_cliente, c.tipo_cliente, c.estado, c.origen, c.observaciones, c.creado_en,
         ci.nombres, ci.apellidos, ci.dpi, ci.nit AS nit_individual, ci.telefono AS telefono_individual, ci.correo AS correo_individual,
         ce.razon_social, ce.nombre_comercial, ce.nit AS nit_empresa, ce.representante_legal,
         ce.telefono AS telefono_empresa, ce.correo AS correo_empresa
  FROM clientes c
  LEFT JOIN clientes_individuales ci ON ci.id_cliente = c.id_cliente
  LEFT JOIN clientes_empresas ce ON ce.id_cliente = c.id_cliente
`;

export async function listarClientes(_req: Request, res: Response) {
  try {
    const resultado = await pool.query(`${SQL_CLIENTE} ORDER BY c.id_cliente DESC`);
    res.json({ ok: true, clientes: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar clientes" });
  }
}

export async function obtenerCliente(req: Request, res: Response) {
  try {
    const resultado = await pool.query(`${SQL_CLIENTE} WHERE c.id_cliente = $1`, [req.params.id]);
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Cliente no encontrado" });
      return;
    }
    res.json({ ok: true, cliente: resultado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener el cliente" });
  }
}

export async function crearCliente(req: Request, res: Response) {
  const tipo = String(req.body.tipo_cliente ?? "").toUpperCase();
  if (tipo !== "INDIVIDUAL" && tipo !== "EMPRESA") {
    res.status(400).json({ ok: false, mensaje: "tipo_cliente debe ser INDIVIDUAL o EMPRESA" });
    return;
  }

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const insertado = await cliente.query(
      `INSERT INTO clientes (tipo_cliente, estado, origen, observaciones)
       VALUES ($1, 'ACTIVO', $2, $3)
       RETURNING id_cliente`,
      [tipo, req.body.origen ?? null, req.body.observaciones ?? null],
    );
    const id = insertado.rows[0].id_cliente as number;

    if (tipo === "INDIVIDUAL") {
      const nombres = String(req.body.nombres ?? "").trim();
      const apellidos = String(req.body.apellidos ?? "").trim();
      if (!nombres || !apellidos) {
        await cliente.query("ROLLBACK");
        res.status(400).json({ ok: false, mensaje: "Nombres y apellidos son obligatorios" });
        return;
      }
      await cliente.query(
        `INSERT INTO clientes_individuales (id_cliente, nombres, apellidos, dpi, nit, telefono, correo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, nombres, apellidos, req.body.dpi ?? null, req.body.nit ?? null, req.body.telefono ?? null, req.body.correo ?? null],
      );
    } else {
      const razonSocial = String(req.body.razon_social ?? "").trim();
      if (!razonSocial) {
        await cliente.query("ROLLBACK");
        res.status(400).json({ ok: false, mensaje: "La razón social es obligatoria" });
        return;
      }
      await cliente.query(
        `INSERT INTO clientes_empresas
          (id_cliente, razon_social, nombre_comercial, nit, representante_legal, telefono, correo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          razonSocial,
          req.body.nombre_comercial ?? null,
          req.body.nit ?? null,
          req.body.representante_legal ?? null,
          req.body.telefono ?? null,
          req.body.correo ?? null,
        ],
      );
    }

    await cliente.query("COMMIT");
    const creado = await pool.query(`${SQL_CLIENTE} WHERE c.id_cliente = $1`, [id]);
    res.status(201).json({ ok: true, cliente: creado.rows[0] });
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al crear el cliente" });
  } finally {
    cliente.release();
  }
}

export async function actualizarCliente(req: Request, res: Response) {
  const id = Number(req.params.id);
  const existente = await pool.query("SELECT tipo_cliente FROM clientes WHERE id_cliente = $1", [id]);
  if (!existente.rows[0]) {
    res.status(404).json({ ok: false, mensaje: "Cliente no encontrado" });
    return;
  }

  const tipo = existente.rows[0].tipo_cliente as string;
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query(
      `UPDATE clientes
       SET estado = COALESCE($2, estado), origen = COALESCE($3, origen), observaciones = COALESCE($4, observaciones)
       WHERE id_cliente = $1`,
      [id, req.body.estado ?? null, req.body.origen ?? null, req.body.observaciones ?? null],
    );

    if (tipo === "INDIVIDUAL") {
      await cliente.query(
        `UPDATE clientes_individuales
         SET nombres = COALESCE($2, nombres),
             apellidos = COALESCE($3, apellidos),
             dpi = COALESCE($4, dpi),
             nit = COALESCE($5, nit),
             telefono = COALESCE($6, telefono),
             correo = COALESCE($7, correo)
         WHERE id_cliente = $1`,
        [id, req.body.nombres ?? null, req.body.apellidos ?? null, req.body.dpi ?? null, req.body.nit ?? null, req.body.telefono ?? null, req.body.correo ?? null],
      );
    } else {
      await cliente.query(
        `UPDATE clientes_empresas
         SET razon_social = COALESCE($2, razon_social),
             nombre_comercial = COALESCE($3, nombre_comercial),
             nit = COALESCE($4, nit),
             representante_legal = COALESCE($5, representante_legal),
             telefono = COALESCE($6, telefono),
             correo = COALESCE($7, correo)
         WHERE id_cliente = $1`,
        [id, req.body.razon_social ?? null, req.body.nombre_comercial ?? null, req.body.nit ?? null, req.body.representante_legal ?? null, req.body.telefono ?? null, req.body.correo ?? null],
      );
    }

    await cliente.query("COMMIT");
    const actualizado = await pool.query(`${SQL_CLIENTE} WHERE c.id_cliente = $1`, [id]);
    res.json({ ok: true, cliente: actualizado.rows[0] });
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al actualizar el cliente" });
  } finally {
    cliente.release();
  }
}

export async function desactivarCliente(req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      `UPDATE clientes SET estado = 'INACTIVO' WHERE id_cliente = $1 RETURNING id_cliente`,
      [req.params.id],
    );
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Cliente no encontrado" });
      return;
    }
    res.json({ ok: true, mensaje: "Cliente inactivado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al inactivar el cliente" });
  }
}
