import type { Request, Response } from "express";
import { pool } from "../db.js";

const SQL_CONTRATO = `
  SELECT c.id_contrato, c.id_cliente, c.id_proyecto, c.id_suscripcion, c.numero,
         c.fecha_inicio, c.fecha_fin, c.monto_total, c.moneda, c.clausula_mora, c.estado,
         cl.tipo_cliente,
         COALESCE(ci.nombres || ' ' || ci.apellidos, ce.razon_social) AS nombre_cliente,
         p.nombre AS nombre_proyecto,
         s.estado AS estado_suscripcion
  FROM contratos c
  JOIN clientes cl ON cl.id_cliente = c.id_cliente
  LEFT JOIN clientes_individuales ci ON ci.id_cliente = cl.id_cliente
  LEFT JOIN clientes_empresas ce ON ce.id_cliente = cl.id_cliente
  LEFT JOIN proyectos p ON p.id_proyecto = c.id_proyecto
  LEFT JOIN suscripciones s ON s.id_suscripcion = c.id_suscripcion
`;

export async function listarContratos(req: Request, res: Response) {
  const idCliente = req.query.id_cliente ? Number(req.query.id_cliente) : null;
  try {
    const resultado = await pool.query(
      `${SQL_CONTRATO}
       WHERE ($1::int IS NULL OR c.id_cliente = $1)
       ORDER BY c.id_contrato DESC`,
      [idCliente],
    );
    res.json({ ok: true, contratos: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar contratos" });
  }
}

export async function obtenerContrato(req: Request, res: Response) {
  try {
    const contrato = await pool.query(`${SQL_CONTRATO} WHERE c.id_contrato = $1`, [req.params.id]);
    if (!contrato.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Contrato no encontrado" });
      return;
    }
    const facturas = await pool.query(
      `SELECT f.*,
              COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.id_factura = f.id_factura), 0) AS pagado
       FROM facturas f
       WHERE f.id_contrato = $1
       ORDER BY f.id_factura DESC`,
      [req.params.id],
    );
    const multas = await pool.query(
      `SELECT * FROM multas WHERE id_contrato = $1 ORDER BY id_multa DESC`,
      [req.params.id],
    );
    res.json({ ok: true, contrato: contrato.rows[0], facturas: facturas.rows, multas: multas.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener el contrato" });
  }
}

export async function crearContrato(req: Request, res: Response) {
  const idCliente = Number(req.body.id_cliente);
  if (!idCliente) {
    res.status(400).json({ ok: false, mensaje: "id_cliente es obligatorio" });
    return;
  }
  const numero = String(req.body.numero ?? "").trim() || `CTR-${Date.now().toString().slice(-8)}`;
  try {
    const insertado = await pool.query(
      `INSERT INTO contratos
        (id_cliente, id_proyecto, id_suscripcion, numero, fecha_inicio, fecha_fin, monto_total, moneda, clausula_mora, estado)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0), COALESCE($8, 'GTQ'), $9, COALESCE($10, 'VIGENTE'))
       RETURNING id_contrato`,
      [
        idCliente,
        req.body.id_proyecto || null,
        req.body.id_suscripcion || null,
        numero,
        req.body.fecha_inicio ?? new Date().toISOString().slice(0, 10),
        req.body.fecha_fin ?? null,
        req.body.monto_total ?? 0,
        req.body.moneda ?? "GTQ",
        req.body.clausula_mora ?? "El impago puede generar multa y suspensión del servicio.",
        req.body.estado ?? "VIGENTE",
      ],
    );
    const creado = await pool.query(`${SQL_CONTRATO} WHERE c.id_contrato = $1`, [insertado.rows[0].id_contrato]);
    res.status(201).json({ ok: true, contrato: creado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al crear el contrato" });
  }
}

export async function reactivarContrato(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const abiertas = await pool.query(
      `SELECT id_factura FROM facturas
       WHERE id_contrato = $1 AND estado IN ('PENDIENTE', 'VENCIDA')`,
      [id],
    );
    if (abiertas.rows[0]) {
      res.status(400).json({
        ok: false,
        mensaje: "No se puede reactivar: hay facturas pendientes o vencidas. Registre el pago primero.",
      });
      return;
    }
    const multasPendientes = await pool.query(
      `SELECT id_multa FROM multas WHERE id_contrato = $1 AND estado = 'PENDIENTE'`,
      [id],
    );
    if (multasPendientes.rows[0]) {
      res.status(400).json({
        ok: false,
        mensaje: "No se puede reactivar: hay multas pendientes. Márquelas como pagadas o condonadas.",
      });
      return;
    }

    const contrato = await pool.query(
      "SELECT id_cliente, id_suscripcion FROM contratos WHERE id_contrato = $1",
      [id],
    );
    if (!contrato.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Contrato no encontrado" });
      return;
    }

    const cx = await pool.connect();
    try {
      await cx.query("BEGIN");
      await cx.query(`UPDATE contratos SET estado = 'VIGENTE' WHERE id_contrato = $1`, [id]);
      if (contrato.rows[0].id_suscripcion) {
        await cx.query(`UPDATE suscripciones SET estado = 'ACTIVA' WHERE id_suscripcion = $1`, [
          contrato.rows[0].id_suscripcion,
        ]);
      }
      await cx.query(`UPDATE clientes SET estado = 'ACTIVO' WHERE id_cliente = $1`, [contrato.rows[0].id_cliente]);
      await cx.query("COMMIT");
    } catch (error) {
      await cx.query("ROLLBACK");
      throw error;
    } finally {
      cx.release();
    }

    const actualizado = await pool.query(`${SQL_CONTRATO} WHERE c.id_contrato = $1`, [id]);
    res.json({ ok: true, contrato: actualizado.rows[0], mensaje: "Servicio reactivado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al reactivar el servicio" });
  }
}

export async function actualizarMulta(req: Request, res: Response) {
  const estado = String(req.body.estado ?? "");
  if (!["PENDIENTE", "PAGADA", "CONDONADA"].includes(estado)) {
    res.status(400).json({ ok: false, mensaje: "Estado de multa inválido" });
    return;
  }
  try {
    const resultado = await pool.query(
      `UPDATE multas SET estado = $2 WHERE id_multa = $1
       RETURNING id_multa, id_contrato, id_factura, motivo, monto, fecha, estado`,
      [req.params.id, estado],
    );
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Multa no encontrada" });
      return;
    }
    res.json({ ok: true, multa: resultado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al actualizar la multa" });
  }
}
