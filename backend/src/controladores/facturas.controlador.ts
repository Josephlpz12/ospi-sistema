import type { Request, Response } from "express";
import { pool } from "../db.js";

export async function listarFacturas(req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      `SELECT f.*,
              COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.id_factura = f.id_factura), 0) AS pagado
       FROM facturas f
       WHERE f.id_contrato = $1
       ORDER BY f.id_factura DESC`,
      [req.params.id],
    );
    res.json({ ok: true, facturas: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar facturas" });
  }
}

export async function crearFactura(req: Request, res: Response) {
  const idContrato = Number(req.params.id);
  const monto = Number(req.body.monto);
  if (!monto || monto <= 0) {
    res.status(400).json({ ok: false, mensaje: "El monto de la factura es obligatorio" });
    return;
  }
  const numero = String(req.body.numero ?? "").trim() || `FAC-${Date.now().toString().slice(-8)}`;
  try {
    const contrato = await pool.query("SELECT id_contrato, estado FROM contratos WHERE id_contrato = $1", [idContrato]);
    if (!contrato.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Contrato no encontrado" });
      return;
    }
    const insertado = await pool.query(
      `INSERT INTO facturas (id_contrato, numero, fecha_emision, fecha_vencimiento, monto, estado)
       VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5, 'PENDIENTE')
       RETURNING *`,
      [idContrato, numero, req.body.fecha_emision ?? null, req.body.fecha_vencimiento ?? null, monto],
    );
    res.status(201).json({ ok: true, factura: insertado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al emitir la factura" });
  }
}

export async function revisarFacturasVencidas(_req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      `UPDATE facturas
       SET estado = 'VENCIDA'
       WHERE estado = 'PENDIENTE'
         AND fecha_vencimiento IS NOT NULL
         AND fecha_vencimiento < CURRENT_DATE
       RETURNING id_factura, numero, id_contrato`,
    );
    for (const fila of resultado.rows) {
      await pool.query(
        `INSERT INTO alertas (id_proyecto, id_factura, tipo, mensaje)
         SELECT ct.id_proyecto, $1, 'FACTURA_VENCIDA', $2
         FROM facturas f
         JOIN contratos ct ON ct.id_contrato = f.id_contrato
         WHERE f.id_factura = $1
           AND NOT EXISTS (
             SELECT 1 FROM alertas a
             WHERE a.id_factura = $1 AND a.tipo = 'FACTURA_VENCIDA' AND a.leida = FALSE
           )`,
        [fila.id_factura, `Factura vencida: ${fila.numero}`],
      );
    }
    res.json({ ok: true, actualizadas: resultado.rowCount ?? 0, facturas: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al revisar facturas vencidas" });
  }
}

export async function registrarPago(req: Request, res: Response) {
  const idFactura = Number(req.params.id);
  const monto = Number(req.body.monto);
  if (!monto || monto <= 0) {
    res.status(400).json({ ok: false, mensaje: "El monto del pago es obligatorio" });
    return;
  }
  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    const factura = await cx.query(
      `SELECT id_factura, id_contrato, monto, estado FROM facturas WHERE id_factura = $1 FOR UPDATE`,
      [idFactura],
    );
    if (!factura.rows[0]) {
      await cx.query("ROLLBACK");
      res.status(404).json({ ok: false, mensaje: "Factura no encontrada" });
      return;
    }
    if (factura.rows[0].estado === "ANULADA") {
      await cx.query("ROLLBACK");
      res.status(400).json({ ok: false, mensaje: "No se puede pagar una factura anulada" });
      return;
    }
    const pago = await cx.query(
      `INSERT INTO pagos (id_factura, fecha_pago, monto, metodo, referencia)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5)
       RETURNING *`,
      [idFactura, req.body.fecha_pago ?? null, monto, req.body.metodo ?? null, req.body.referencia ?? null],
    );
    const suma = await cx.query(`SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE id_factura = $1`, [idFactura]);
    const cubierto = Number(suma.rows[0].total) >= Number(factura.rows[0].monto);
    if (cubierto) {
      await cx.query(`UPDATE facturas SET estado = 'PAGADA' WHERE id_factura = $1`, [idFactura]);
    }
    await cx.query("COMMIT");
    const actualizada = await pool.query(
      `SELECT f.*, COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.id_factura = f.id_factura), 0) AS pagado
       FROM facturas f WHERE f.id_factura = $1`,
      [idFactura],
    );
    res.status(201).json({ ok: true, pago: pago.rows[0], factura: actualizada.rows[0] });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al registrar el pago" });
  } finally {
    cx.release();
  }
}

export async function aplicarMora(req: Request, res: Response) {
  const idFactura = Number(req.params.id);
  const motivo = String(req.body.motivo ?? "Mora por impago de factura").trim();
  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    const factura = await cx.query(
      `SELECT f.id_factura, f.numero, f.monto, f.estado, f.id_contrato,
              c.id_cliente, c.id_proyecto, c.id_suscripcion
       FROM facturas f
       JOIN contratos c ON c.id_contrato = f.id_contrato
       WHERE f.id_factura = $1
       FOR UPDATE`,
      [idFactura],
    );
    if (!factura.rows[0]) {
      await cx.query("ROLLBACK");
      res.status(404).json({ ok: false, mensaje: "Factura no encontrada" });
      return;
    }
    const f = factura.rows[0];
    if (f.estado === "PAGADA" || f.estado === "ANULADA") {
      await cx.query("ROLLBACK");
      res.status(400).json({ ok: false, mensaje: "No se aplica mora a una factura pagada o anulada" });
      return;
    }

    await cx.query(`UPDATE facturas SET estado = 'VENCIDA' WHERE id_factura = $1`, [idFactura]);

    const porcentaje = Number(req.body.porcentaje);
    const montoMulta =
      Number(req.body.monto) ||
      Math.round(Number(f.monto) * (Number.isNaN(porcentaje) || porcentaje <= 0 ? 0.1 : porcentaje / 100) * 100) / 100;

    const multa = await cx.query(
      `INSERT INTO multas (id_contrato, id_factura, motivo, monto, estado)
       VALUES ($1, $2, $3, $4, 'PENDIENTE')
       RETURNING *`,
      [f.id_contrato, idFactura, motivo, montoMulta],
    );

    await cx.query(`UPDATE contratos SET estado = 'INCUMPLIDO' WHERE id_contrato = $1`, [f.id_contrato]);
    await cx.query(`UPDATE clientes SET estado = 'SUSPENDIDO' WHERE id_cliente = $1`, [f.id_cliente]);

    if (f.id_suscripcion) {
      await cx.query(`UPDATE suscripciones SET estado = 'SUSPENDIDA' WHERE id_suscripcion = $1`, [f.id_suscripcion]);
    } else {
      await cx.query(
        `UPDATE suscripciones SET estado = 'SUSPENDIDA'
         WHERE id_cliente = $1 AND estado = 'ACTIVA'`,
        [f.id_cliente],
      );
    }

    await cx.query(
      `INSERT INTO alertas (id_proyecto, id_factura, tipo, mensaje)
       VALUES ($1, $2, 'SERVICIO_SUSPENDIDO', $3)`,
      [f.id_proyecto, idFactura, `Servicio suspendido por mora. Factura ${f.numero}. Multa Q${montoMulta}`],
    );

    await cx.query("COMMIT");
    res.json({
      ok: true,
      mensaje: "Mora aplicada: multa generada y servicio suspendido",
      multa: multa.rows[0],
    });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al aplicar mora" });
  } finally {
    cx.release();
  }
}
