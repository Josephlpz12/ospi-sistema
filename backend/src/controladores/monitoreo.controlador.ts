import type { Request, Response } from "express";
import { pool } from "../db.js";

export async function listarProyectosActivos(_req: Request, res: Response) {
  try {
    const resultado = await pool.query(
      `SELECT p.id_proyecto, p.codigo, p.nombre, p.fecha_fin_plan, p.porcentaje_avance,
              p.id_responsable, p.id_cliente,
              e.nombre AS estado,
              COALESCE(ci.nombres || ' ' || ci.apellidos, ce.razon_social) AS nombre_cliente,
              COALESCE(
                resp.nombre,
                TRIM(COALESCE(em.nombres, '') || ' ' || COALESCE(em.apellidos, ''))
              ) AS nombre_responsable
       FROM proyectos p
       JOIN estados_proyecto e ON e.id_estado = p.id_estado
       JOIN clientes c ON c.id_cliente = p.id_cliente
       LEFT JOIN clientes_individuales ci ON ci.id_cliente = c.id_cliente
       LEFT JOIN clientes_empresas ce ON ce.id_cliente = c.id_cliente
       LEFT JOIN empleados em ON em.id_empleado = p.id_responsable
       LEFT JOIN LATERAL (
         SELECT TRIM(ea.nombres || ' ' || ea.apellidos) AS nombre
         FROM asignaciones a
         JOIN empleados ea ON ea.id_empleado = a.id_empleado
         WHERE a.id_proyecto = p.id_proyecto
           AND a.id_tarea IS NULL
           AND a.rol_en_proyecto = 'Responsable'
         ORDER BY a.id_asignacion
         LIMIT 1
       ) resp ON TRUE
       WHERE e.nombre = 'Activo'
       ORDER BY p.fecha_fin_plan NULLS LAST, p.id_proyecto`,
    );
    res.json({ ok: true, proyectos: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar el tablero de monitoreo" });
  }
}
