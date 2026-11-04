import type { Request, Response } from "express";
import { pool } from "../db.js";
import { ROLES } from "../middleware/autorizar.js";
import { listarFilasResumenGeneral } from "./resumen.controlador.js";

function entero(valor: unknown) {
  const cantidad = Number(valor);
  return Number.isFinite(cantidad) ? cantidad : 0;
}

function redondear(valor: number) {
  return Math.round(valor * 100) / 100;
}

export async function obtenerDashboard(req: Request, res: Response) {
  try {
    const [clientes, proyectos, alertas] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM clientes WHERE estado = 'ACTIVO'`),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COALESCE(ROUND(AVG(p.porcentaje_avance), 1), 0) AS avance
         FROM proyectos p
         JOIN estados_proyecto e ON e.id_estado = p.id_estado
         WHERE e.nombre = 'Activo'`,
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM alertas WHERE leida = FALSE`),
    ]);

    const cuerpo: {
      ok: true;
      clientes_activos: number;
      proyectos_activos: number;
      avance_promedio: number;
      alertas_pendientes: number;
      contratos_vigentes?: number;
      facturas_mora?: number;
      saldos?: { moneda: string; monto: number }[];
      contratados?: { moneda: string; monto: number }[];
    } = {
      ok: true,
      clientes_activos: entero(clientes.rows[0].total),
      proyectos_activos: entero(proyectos.rows[0].total),
      avance_promedio: Math.round(entero(proyectos.rows[0].avance) * 10) / 10,
      alertas_pendientes: entero(alertas.rows[0].total),
    };

    const rol = req.usuario?.nombre_rol;
    if (rol === ROLES.admin || rol === ROLES.gerente) {
      const [contratos, resumen] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS total FROM contratos WHERE estado = 'VIGENTE'`),
        listarFilasResumenGeneral(),
      ]);
      const contratado = new Map<string, number>();
      const saldo = new Map<string, number>();
      for (const fila of resumen.filas) {
        contratado.set(fila.moneda, (contratado.get(fila.moneda) ?? 0) + fila.contratado);
        saldo.set(fila.moneda, (saldo.get(fila.moneda) ?? 0) + fila.saldo);
      }
      const monedas = [...contratado.keys()].sort((a, b) => a.localeCompare(b, "es"));
      cuerpo.contratos_vigentes = entero(contratos.rows[0].total);
      cuerpo.facturas_mora = resumen.facturas_mora;
      cuerpo.saldos = monedas.map((moneda) => ({ moneda, monto: redondear(saldo.get(moneda) ?? 0) }));
      cuerpo.contratados = monedas.map((moneda) => ({ moneda, monto: redondear(contratado.get(moneda) ?? 0) }));
    }

    res.json(cuerpo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener el dashboard" });
  }
}
