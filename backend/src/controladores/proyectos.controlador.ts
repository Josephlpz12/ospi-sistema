import type { Request, Response } from "express";
import { pool } from "../db.js";

const SQL_PROYECTO = `
  SELECT p.id_proyecto, p.id_cliente, p.id_estado, p.id_responsable, p.codigo, p.nombre,
         p.descripcion, p.fecha_inicio, p.fecha_fin_plan, p.fecha_fin_real, p.porcentaje_avance, p.creado_en,
         e.nombre AS estado,
         COALESCE(ci.nombres || ' ' || ci.apellidos, ce.razon_social) AS nombre_cliente,
         c.tipo_cliente
  FROM proyectos p
  JOIN estados_proyecto e ON e.id_estado = p.id_estado
  JOIN clientes c ON c.id_cliente = p.id_cliente
  LEFT JOIN clientes_individuales ci ON ci.id_cliente = c.id_cliente
  LEFT JOIN clientes_empresas ce ON ce.id_cliente = c.id_cliente
`;

async function idEstadoPorNombre(nombre: string) {
  const resultado = await pool.query(
    "SELECT id_estado FROM estados_proyecto WHERE nombre = $1",
    [nombre],
  );
  return resultado.rows[0]?.id_estado as number | undefined;
}

export async function listarProyectos(_req: Request, res: Response) {
  try {
    const resultado = await pool.query(`${SQL_PROYECTO} ORDER BY p.id_proyecto DESC`);
    res.json({ ok: true, proyectos: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar proyectos" });
  }
}

export async function obtenerProyecto(req: Request, res: Response) {
  try {
    const resultado = await pool.query(`${SQL_PROYECTO} WHERE p.id_proyecto = $1`, [req.params.id]);
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }
    res.json({ ok: true, proyecto: resultado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener el proyecto" });
  }
}

export async function crearProyecto(req: Request, res: Response) {
  const idCliente = Number(req.body.id_cliente);
  const nombre = String(req.body.nombre ?? "").trim();
  if (!idCliente || !nombre) {
    res.status(400).json({ ok: false, mensaje: "id_cliente y nombre son obligatorios" });
    return;
  }

  try {
    const cliente = await pool.query("SELECT id_cliente FROM clientes WHERE id_cliente = $1", [idCliente]);
    if (!cliente.rows[0]) {
      res.status(400).json({ ok: false, mensaje: "El cliente no existe" });
      return;
    }

    const idEstado = Number(req.body.id_estado) || (await idEstadoPorNombre("Activo"));
    if (!idEstado) {
      res.status(500).json({ ok: false, mensaje: "No hay estados de proyecto en el catálogo" });
      return;
    }

    const codigo =
      String(req.body.codigo ?? "").trim() ||
      `PRY-${String(Date.now()).slice(-6)}`;

    const insertado = await pool.query(
      `INSERT INTO proyectos
        (id_cliente, id_estado, id_responsable, codigo, nombre, descripcion, fecha_inicio, fecha_fin_plan, porcentaje_avance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 0))
       RETURNING id_proyecto`,
      [
        idCliente,
        idEstado,
        req.body.id_responsable ?? null,
        codigo,
        nombre,
        req.body.descripcion ?? null,
        req.body.fecha_inicio ?? null,
        req.body.fecha_fin_plan ?? null,
        req.body.porcentaje_avance ?? 0,
      ],
    );

    const creado = await pool.query(`${SQL_PROYECTO} WHERE p.id_proyecto = $1`, [insertado.rows[0].id_proyecto]);
    res.status(201).json({ ok: true, proyecto: creado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al crear el proyecto" });
  }
}

export async function actualizarProyecto(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const resultado = await pool.query(
      `UPDATE proyectos SET
         id_estado = COALESCE($2, id_estado),
         id_responsable = COALESCE($3, id_responsable),
         codigo = COALESCE($4, codigo),
         nombre = COALESCE($5, nombre),
         descripcion = COALESCE($6, descripcion),
         fecha_inicio = COALESCE($7, fecha_inicio),
         fecha_fin_plan = COALESCE($8, fecha_fin_plan),
         fecha_fin_real = COALESCE($9, fecha_fin_real),
         porcentaje_avance = COALESCE($10, porcentaje_avance)
       WHERE id_proyecto = $1
       RETURNING id_proyecto`,
      [
        id,
        req.body.id_estado ?? null,
        req.body.id_responsable ?? null,
        req.body.codigo ?? null,
        req.body.nombre ?? null,
        req.body.descripcion ?? null,
        req.body.fecha_inicio ?? null,
        req.body.fecha_fin_plan ?? null,
        req.body.fecha_fin_real ?? null,
        req.body.porcentaje_avance ?? null,
      ],
    );

    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }

    const actualizado = await pool.query(`${SQL_PROYECTO} WHERE p.id_proyecto = $1`, [id]);
    res.json({ ok: true, proyecto: actualizado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al actualizar el proyecto" });
  }
}

export async function cancelarProyecto(req: Request, res: Response) {
  try {
    const idCancelado = await idEstadoPorNombre("Cancelado");
    if (!idCancelado) {
      res.status(500).json({ ok: false, mensaje: "No existe el estado Cancelado" });
      return;
    }

    const resultado = await pool.query(
      `UPDATE proyectos SET id_estado = $2 WHERE id_proyecto = $1 RETURNING id_proyecto`,
      [req.params.id, idCancelado],
    );
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Proyecto no encontrado" });
      return;
    }
    res.json({ ok: true, mensaje: "Proyecto cancelado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al cancelar el proyecto" });
  }
}
