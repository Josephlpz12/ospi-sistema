import type { Request, Response } from "express";
import { pool } from "../db.js";

export const DIAS_PARA_MORA = 10;

const SQL_CLIENTE = `
  SELECT c.id_cliente, c.tipo_cliente, c.estado,
         ci.nombres, ci.apellidos, ce.razon_social
  FROM clientes c
  LEFT JOIN clientes_individuales ci ON ci.id_cliente = c.id_cliente
  LEFT JOIN clientes_empresas ce ON ce.id_cliente = c.id_cliente
`;

function idRuta(valor: string | string[] | undefined) {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  const numero = Number(texto);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function numero(valor: unknown) {
  const cantidad = Number(valor);
  return Number.isFinite(cantidad) ? cantidad : 0;
}

function redondear(valor: number) {
  return Math.round(valor * 100) / 100;
}

const SQL_DIAS_VENCIDO = `
  CASE
    WHEN f.fecha_vencimiento IS NOT NULL
     AND f.fecha_vencimiento < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guatemala')::date
    THEN ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Guatemala')::date - f.fecha_vencimiento)::int
    ELSE NULL
  END
`;

function datosFactura(estado: string, montoRaw: unknown, pagadoRaw: unknown, diasRaw: unknown) {
  const monto = numero(montoRaw);
  const pagado = numero(pagadoRaw);
  const saldo = redondear(Math.max(0, monto - pagado));
  const vencidaConSaldo =
    estado !== "PAGADA" && estado !== "ANULADA" && saldo > 0 && diasRaw !== null && diasRaw !== undefined;
  const dias = vencidaConSaldo ? Number(diasRaw) : null;
  return {
    pagado: redondear(pagado),
    saldo,
    dias_vencido: dias,
    en_mora: dias !== null && dias > DIAS_PARA_MORA,
  };
}

function fechaTexto(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return null;
  return String(valor).slice(0, 10);
}

type Totales = {
  moneda: string;
  contratado: number;
  facturado: number;
  pagado: number;
  saldo: number;
};

export async function obtenerResumenFinanciero(req: Request, res: Response) {
  const id = idRuta(req.params.id);
  if (!id) {
    res.status(404).json({ ok: false, mensaje: "Cliente no encontrado" });
    return;
  }

  try {
    const cliente = await pool.query(`${SQL_CLIENTE} WHERE c.id_cliente = $1`, [id]);
    if (!cliente.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Cliente no encontrado" });
      return;
    }

    const [contratos, facturas, pagos, multas] = await Promise.all([
      pool.query(
        `SELECT id_contrato, numero, to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
                monto_total, moneda, estado
         FROM contratos
         WHERE id_cliente = $1 AND estado <> 'BORRADOR'
         ORDER BY fecha_inicio DESC, id_contrato DESC`,
        [id],
      ),
      pool.query(
        `SELECT f.id_factura, f.numero,
                to_char(f.fecha_emision, 'YYYY-MM-DD') AS fecha_emision,
                to_char(f.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
                f.monto, f.estado, ct.moneda,
                COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.id_factura = f.id_factura), 0) AS pagado,
                ${SQL_DIAS_VENCIDO} AS dias_vencido
         FROM facturas f
         JOIN contratos ct ON ct.id_contrato = f.id_contrato
         WHERE ct.id_cliente = $1 AND ct.estado <> 'BORRADOR'
         ORDER BY f.fecha_emision DESC, f.id_factura DESC`,
        [id],
      ),
      pool.query(
        `SELECT p.id_pago, to_char(p.fecha_pago, 'YYYY-MM-DD') AS fecha_pago, p.monto,
                f.numero AS numero_factura, ct.moneda
         FROM pagos p
         JOIN facturas f ON f.id_factura = p.id_factura
         JOIN contratos ct ON ct.id_contrato = f.id_contrato
         WHERE ct.id_cliente = $1 AND ct.estado <> 'BORRADOR'
         ORDER BY p.fecha_pago DESC, p.id_pago DESC`,
        [id],
      ),
      pool.query(
        `SELECT m.id_multa, m.id_factura, m.motivo, m.monto, to_char(m.fecha, 'YYYY-MM-DD') AS fecha, m.estado
         FROM multas m
         JOIN facturas f ON f.id_factura = m.id_factura
         JOIN contratos ct ON ct.id_contrato = f.id_contrato
         WHERE ct.id_cliente = $1 AND ct.estado <> 'BORRADOR'
         ORDER BY m.fecha DESC, m.id_multa DESC`,
        [id],
      ),
    ]);

    const multasPorFactura = new Map<number, { id_multa: number; motivo: string | null; monto: string | number; fecha: string | null; estado: string }[]>();
    for (const multa of multas.rows) {
      const idFactura = Number(multa.id_factura);
      const lista = multasPorFactura.get(idFactura) ?? [];
      lista.push({
        id_multa: multa.id_multa,
        motivo: multa.motivo,
        monto: multa.monto,
        fecha: fechaTexto(multa.fecha),
        estado: multa.estado,
      });
      multasPorFactura.set(idFactura, lista);
    }

    const facturasLista = facturas.rows.map((fila) => {
      const calculo = datosFactura(fila.estado, fila.monto, fila.pagado, fila.dias_vencido);
      return {
        id_factura: fila.id_factura,
        numero: fila.numero,
        fecha_emision: fechaTexto(fila.fecha_emision),
        fecha_vencimiento: fechaTexto(fila.fecha_vencimiento),
        monto: fila.monto,
        estado: fila.estado,
        moneda: fila.moneda,
        pagado: calculo.pagado,
        saldo: calculo.saldo,
        dias_vencido: calculo.dias_vencido,
        en_mora: calculo.en_mora,
        multas: calculo.dias_vencido !== null ? (multasPorFactura.get(Number(fila.id_factura)) ?? []) : [],
      };
    });

    const totales = new Map<string, Totales>();
    function acumular(moneda: string) {
      const actual = totales.get(moneda);
      if (actual) return actual;
      const creado = { moneda, contratado: 0, facturado: 0, pagado: 0, saldo: 0 };
      totales.set(moneda, creado);
      return creado;
    }

    for (const contrato of contratos.rows) {
      acumular(contrato.moneda).contratado += numero(contrato.monto_total);
    }
    for (const factura of facturasLista) {
      if (factura.estado === "ANULADA") continue;
      const grupo = acumular(factura.moneda);
      grupo.facturado += numero(factura.monto);
      grupo.pagado += numero(factura.pagado);
    }
    const totalesLista = [...totales.values()].map((grupo) => ({
      moneda: grupo.moneda,
      contratado: redondear(grupo.contratado),
      facturado: redondear(grupo.facturado),
      pagado: redondear(grupo.pagado),
      saldo: redondear(Math.max(0, grupo.facturado - grupo.pagado)),
    }));

    res.json({
      ok: true,
      cliente: cliente.rows[0],
      contratos: contratos.rows,
      facturas: facturasLista,
      pagos: pagos.rows.map((fila) => ({
        id_pago: fila.id_pago,
        fecha_pago: fechaTexto(fila.fecha_pago),
        monto: fila.monto,
        numero_factura: fila.numero_factura,
        moneda: fila.moneda,
      })),
      totales: totalesLista,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener el resumen financiero" });
  }
}

export async function listarFilasResumenGeneral() {
  const [contratos, pagos, facturas] = await Promise.all([
    pool.query(
      `SELECT c.id_cliente, c.tipo_cliente,
              ci.nombres, ci.apellidos, ce.razon_social,
              ct.moneda, SUM(ct.monto_total) AS contratado
       FROM contratos ct
       JOIN clientes c ON c.id_cliente = ct.id_cliente
       LEFT JOIN clientes_individuales ci ON ci.id_cliente = c.id_cliente
       LEFT JOIN clientes_empresas ce ON ce.id_cliente = c.id_cliente
       WHERE ct.estado <> 'BORRADOR'
       GROUP BY c.id_cliente, c.tipo_cliente, ci.nombres, ci.apellidos, ce.razon_social, ct.moneda`,
    ),
    pool.query(
      `SELECT ct.id_cliente, ct.moneda, COALESCE(SUM(p.monto), 0) AS pagado
       FROM pagos p
       JOIN facturas f ON f.id_factura = p.id_factura
       JOIN contratos ct ON ct.id_contrato = f.id_contrato
       WHERE ct.estado <> 'BORRADOR' AND f.estado <> 'ANULADA'
       GROUP BY ct.id_cliente, ct.moneda`,
    ),
    pool.query(
      `SELECT ct.id_cliente, ct.moneda, f.estado, f.monto,
              COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.id_factura = f.id_factura), 0) AS pagado,
              ${SQL_DIAS_VENCIDO} AS dias_vencido
       FROM facturas f
       JOIN contratos ct ON ct.id_contrato = f.id_contrato
       WHERE ct.estado <> 'BORRADOR'`,
    ),
  ]);

  const pagadoPorClave = new Map<string, number>();
  for (const fila of pagos.rows) {
    pagadoPorClave.set(`${fila.id_cliente}|${fila.moneda}`, numero(fila.pagado));
  }
  const moraPorClave = new Set<string>();
  let facturasMora = 0;
  for (const fila of facturas.rows) {
    const calculo = datosFactura(fila.estado, fila.monto, fila.pagado, fila.dias_vencido);
    if (!calculo.en_mora) continue;
    facturasMora += 1;
    moraPorClave.add(`${fila.id_cliente}|${fila.moneda}`);
  }

  const filas = contratos.rows.map((fila) => {
    const clave = `${fila.id_cliente}|${fila.moneda}`;
    const contratado = redondear(numero(fila.contratado));
    const pagado = redondear(pagadoPorClave.get(clave) ?? 0);
    return {
      id_cliente: fila.id_cliente,
      tipo_cliente: fila.tipo_cliente,
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      razon_social: fila.razon_social,
      moneda: fila.moneda as string,
      contratado,
      pagado,
      saldo: redondear(Math.max(0, contratado - pagado)),
      en_mora: moraPorClave.has(clave),
    };
  });

  return { filas, facturas_mora: facturasMora };
}

export async function obtenerResumenGeneral(_req: Request, res: Response) {
  try {
    const { filas } = await listarFilasResumenGeneral();
    res.json({ ok: true, filas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener el resumen general" });
  }
}
