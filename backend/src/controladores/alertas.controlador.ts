import type { Request, Response } from "express";
import { pool } from "../db.js";

export async function asegurarAlerta(idProyecto: number, tipo: string, mensaje: string) {
  const existe = await pool.query(
    `SELECT id_alerta FROM alertas
     WHERE id_proyecto = $1 AND tipo = $2 AND mensaje = $3 AND leida = FALSE
     LIMIT 1`,
    [idProyecto, tipo, mensaje],
  );
  if (existe.rows[0]) return;
  await pool.query(
    `INSERT INTO alertas (id_proyecto, tipo, mensaje) VALUES ($1, $2, $3)`,
    [idProyecto, tipo, mensaje],
  );
}

export async function listarAlertas(req: Request, res: Response) {
  try {
    const soloNoLeidas = String(req.query.solo_no_leidas ?? "") === "1";
    const resultado = await pool.query(
      `SELECT a.id_alerta, a.id_proyecto, a.tipo, a.mensaje, a.leida, a.programada_en, a.creada_en,
              p.nombre AS nombre_proyecto, p.codigo
       FROM alertas a
       LEFT JOIN proyectos p ON p.id_proyecto = a.id_proyecto
       ${soloNoLeidas ? "WHERE a.leida = FALSE" : ""}
       ORDER BY a.leida ASC, a.creada_en DESC`,
    );
    res.json({ ok: true, alertas: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar alertas" });
  }
}

export async function generarAlertas(_req: Request, res: Response) {
  try {
    const vencidas = await pool.query(
      `SELECT t.id_proyecto, t.titulo
       FROM tareas t
       JOIN proyectos p ON p.id_proyecto = t.id_proyecto
       JOIN estados_proyecto e ON e.id_estado = p.id_estado
       WHERE t.fecha_limite < CURRENT_DATE
         AND t.estado <> 'COMPLETADA'
         AND e.nombre NOT IN ('Cancelado', 'Entregado')`,
    );
    for (const fila of vencidas.rows) {
      await asegurarAlerta(fila.id_proyecto, "TAREA_VENCIDA", `Tarea vencida: ${fila.titulo}`);
    }

    const bajos = await pool.query(
      `SELECT p.id_proyecto, p.nombre, p.porcentaje_avance
       FROM proyectos p
       JOIN estados_proyecto e ON e.id_estado = p.id_estado
       WHERE p.porcentaje_avance < 40
         AND e.nombre NOT IN ('Cancelado', 'Entregado')`,
    );
    for (const fila of bajos.rows) {
      await asegurarAlerta(
        fila.id_proyecto,
        "AVANCE_BAJO",
        `Avance bajo (${Number(fila.porcentaje_avance)}%) en ${fila.nombre}`,
      );
    }

    const listado = await pool.query(
      `SELECT a.id_alerta, a.id_proyecto, a.tipo, a.mensaje, a.leida, a.creada_en,
              p.nombre AS nombre_proyecto, p.codigo
       FROM alertas a
       LEFT JOIN proyectos p ON p.id_proyecto = a.id_proyecto
       WHERE a.leida = FALSE
       ORDER BY a.creada_en DESC`,
    );
    res.json({ ok: true, creadas: (vencidas.rowCount ?? 0) + (bajos.rowCount ?? 0), alertas: listado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al generar alertas" });
  }
}

export async function marcarAlertaLeida(req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      `UPDATE alertas SET leida = TRUE WHERE id_alerta = $1 RETURNING id_alerta, leida`,
      [req.params.id],
    );
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Alerta no encontrada" });
      return;
    }
    res.json({ ok: true, alerta: resultado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al marcar la alerta" });
  }
}
