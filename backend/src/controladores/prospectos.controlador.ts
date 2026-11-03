import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { registrarCambio } from "../servicios/bitacora.servicio.js";
import { correoValido, telefonoValido, textoOpcional } from "../servicios/validaciones.servicio.js";
import { rechazar } from "./usuarios.controlador.js";

const FUENTES = ["Referido", "Sitio web", "Llamada en frío", "Evento", "Otro"];
const ESTADOS_ABIERTOS = ["Nuevo", "Contactado", "Calificado", "Descartado"];
const ESTADOS_CONVERTIBLES = ["Contactado", "Calificado"];

const SQL_PROSPECTO = `
  SELECT p.id_prospecto, p.nombres, p.apellidos, p.empresa, p.cargo, p.correo, p.telefono,
         p.fuente, p.estado, p.id_responsable, p.notas, p.id_cliente, p.creado_en, p.convertido_en,
         NULLIF(TRIM(COALESCE(e.nombres, '') || ' ' || COALESCE(e.apellidos, '')), '') AS nombre_responsable,
         COALESCE(
           ce.razon_social,
           NULLIF(TRIM(COALESCE(ci.nombres, '') || ' ' || COALESCE(ci.apellidos, '')), '')
         ) AS nombre_cliente
  FROM prospectos p
  LEFT JOIN empleados e ON e.id_empleado = p.id_responsable
  LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
  LEFT JOIN clientes_individuales ci ON ci.id_cliente = c.id_cliente
  LEFT JOIN clientes_empresas ce ON ce.id_cliente = c.id_cliente
`;

const SQL_CLIENTE = `
  SELECT c.id_cliente, c.tipo_cliente, c.estado, c.origen, c.observaciones, c.creado_en,
         ci.nombres, ci.apellidos, ci.dpi, ci.nit AS nit_individual, ci.telefono AS telefono_individual, ci.correo AS correo_individual,
         ce.razon_social, ce.nombre_comercial, ce.nit AS nit_empresa, ce.representante_legal,
         ce.telefono AS telefono_empresa, ce.correo AS correo_empresa
  FROM clientes c
  LEFT JOIN clientes_individuales ci ON ci.id_cliente = c.id_cliente
  LEFT JOIN clientes_empresas ce ON ce.id_cliente = c.id_cliente
`;

const SQL_CONTACTO = `
  SELECT ct.id_contacto, ct.id_cliente, ct.nombres, ct.apellidos, ct.cargo, ct.telefono, ct.correo, ct.es_principal,
         COALESCE(ce.razon_social, TRIM(COALESCE(ci.nombres, '') || ' ' || COALESCE(ci.apellidos, ''))) AS nombre_cliente
  FROM contactos_cliente ct
  JOIN clientes c ON c.id_cliente = ct.id_cliente
  LEFT JOIN clientes_individuales ci ON ci.id_cliente = c.id_cliente
  LEFT JOIN clientes_empresas ce ON ce.id_cliente = c.id_cliente
`;

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

type DatosProspecto = {
  nombres: string;
  apellidos: string;
  empresa: string | null;
  cargo: string | null;
  correo: string | null;
  telefono: string | null;
  fuente: string;
  idResponsable: number | null;
  notas: string | null;
};

function idRuta(valor: string | string[] | undefined) {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  const numero = Number(texto);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function idOpcional(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) return undefined;
  return numero;
}

function leerEntrada(cuerpo: Record<string, unknown>): { error: string } | { datos: DatosProspecto } {
  const nombres = String(cuerpo.nombres ?? "").trim();
  const apellidos = String(cuerpo.apellidos ?? "").trim();
  const empresa = textoOpcional(cuerpo.empresa);
  const cargo = textoOpcional(cuerpo.cargo);
  const telefono = textoOpcional(cuerpo.telefono);
  const correo = textoOpcional(cuerpo.correo)?.toLowerCase() ?? null;
  const fuente = String(cuerpo.fuente ?? "").trim();
  const notas = textoOpcional(cuerpo.notas);
  const idResponsable = idOpcional(cuerpo.id_responsable);

  if (!nombres || nombres.length > 100) {
    return { error: "Los nombres son obligatorios (máximo 100 caracteres)" };
  }
  if (!apellidos || apellidos.length > 100) {
    return { error: "Los apellidos son obligatorios (máximo 100 caracteres)" };
  }
  if (empresa && empresa.length > 180) {
    return { error: "La empresa no puede superar los 180 caracteres" };
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
  if (!FUENTES.includes(fuente)) {
    return { error: "Seleccione una fuente válida" };
  }
  if (idResponsable === undefined) {
    return { error: "Responsable inválido" };
  }
  return { datos: { nombres, apellidos, empresa, cargo, correo, telefono, fuente, idResponsable, notas } };
}

async function leerProspecto(cx: Pick<PoolClient, "query">, id: number) {
  const resultado = await cx.query(`${SQL_PROSPECTO} WHERE p.id_prospecto = $1`, [id]);
  return resultado.rows[0];
}

async function responsableDisponible(cx: PoolClient, id: number) {
  const resultado = await cx.query(
    `SELECT e.id_empleado
     FROM empleados e
     JOIN usuarios u ON u.id_usuario = e.id_usuario
     WHERE e.id_empleado = $1 AND e.activo = TRUE AND u.activo = TRUE`,
    [id],
  );
  return Boolean(resultado.rows[0]);
}

async function asegurarResponsable(cx: PoolClient, id: number | null, idActual: number | null) {
  if (id === null || id === idActual) return true;
  return responsableDisponible(cx, id);
}

function representanteLegal(nombres: string, apellidos: string) {
  return `${nombres} ${apellidos}`.trim().slice(0, 150);
}

export async function listarProspectos(req: Request, res: Response) {
  const estado = textoOpcional(req.query.estado);
  const fuente = textoOpcional(req.query.fuente);
  const incluirCerrados = req.query.incluir_cerrados === "1" || req.query.incluir_cerrados === "true";
  if (estado && !["Nuevo", "Contactado", "Calificado", "Descartado", "Convertido"].includes(estado)) {
    res.status(400).json({ ok: false, mensaje: "Estado inválido" });
    return;
  }
  if (fuente && !FUENTES.includes(fuente)) {
    res.status(400).json({ ok: false, mensaje: "Fuente inválida" });
    return;
  }
  try {
    const resultado = await pool.query(
      `${SQL_PROSPECTO}
       WHERE ($1::text IS NULL OR p.estado = $1)
         AND ($2::text IS NULL OR p.fuente = $2)
         AND ($3::boolean OR p.estado NOT IN ('Descartado', 'Convertido') OR p.estado IS NOT DISTINCT FROM $1)
       ORDER BY p.id_prospecto DESC`,
      [estado, fuente, incluirCerrados],
    );
    res.json({ ok: true, prospectos: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar prospectos" });
  }
}

export async function obtenerProspecto(req: Request, res: Response) {
  const id = idRuta(req.params.id);
  if (!id) {
    res.status(404).json({ ok: false, mensaje: "Prospecto no encontrado" });
    return;
  }
  try {
    const prospecto = await leerProspecto(pool, id);
    if (!prospecto) {
      res.status(404).json({ ok: false, mensaje: "Prospecto no encontrado" });
      return;
    }
    res.json({ ok: true, prospecto });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener el prospecto" });
  }
}

export async function crearProspecto(req: Request, res: Response) {
  const lectura = leerEntrada((req.body ?? {}) as Record<string, unknown>);
  if ("error" in lectura) {
    res.status(400).json({ ok: false, mensaje: lectura.error });
    return;
  }
  const { datos } = lectura;
  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    if (!(await asegurarResponsable(cx, datos.idResponsable, null))) {
      await rechazar(cx, res, 400, "El responsable no está disponible: debe estar activo y tener un usuario activo");
      return;
    }
    const insertado = await cx.query(
      `INSERT INTO prospectos
        (nombres, apellidos, empresa, cargo, correo, telefono, fuente, estado, id_responsable, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Nuevo', $8, $9)
       RETURNING id_prospecto`,
      [
        datos.nombres,
        datos.apellidos,
        datos.empresa,
        datos.cargo,
        datos.correo,
        datos.telefono,
        datos.fuente,
        datos.idResponsable,
        datos.notas,
      ],
    );
    const id = insertado.rows[0].id_prospecto as number;
    const creado = await leerProspecto(cx, id);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "prospectos",
      idRegistro: id,
      accion: "CREAR",
      despues: creado,
    });
    await cx.query("COMMIT");
    res.status(201).json({ ok: true, prospecto: creado });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    if (!res.headersSent) res.status(500).json({ ok: false, mensaje: "Error al crear el prospecto" });
  } finally {
    cx.release();
  }
}

export async function actualizarProspecto(req: Request, res: Response) {
  const id = idRuta(req.params.id);
  if (!id) {
    res.status(404).json({ ok: false, mensaje: "Prospecto no encontrado" });
    return;
  }
  const lectura = leerEntrada((req.body ?? {}) as Record<string, unknown>);
  if ("error" in lectura) {
    res.status(400).json({ ok: false, mensaje: lectura.error });
    return;
  }
  const { datos } = lectura;
  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    const bloqueo = await cx.query("SELECT id_prospecto, estado, id_responsable FROM prospectos WHERE id_prospecto = $1 FOR UPDATE", [
      id,
    ]);
    if (!bloqueo.rows[0]) {
      await rechazar(cx, res, 404, "Prospecto no encontrado");
      return;
    }
    if (bloqueo.rows[0].estado === "Convertido") {
      await rechazar(cx, res, 400, "Un prospecto convertido no se puede editar");
      return;
    }
    const idActual = (bloqueo.rows[0].id_responsable as number | null) ?? null;
    if (!(await asegurarResponsable(cx, datos.idResponsable, idActual))) {
      await rechazar(cx, res, 400, "El responsable no está disponible: debe estar activo y tener un usuario activo");
      return;
    }
    const antes = await leerProspecto(cx, id);
    await cx.query(
      `UPDATE prospectos SET
         nombres = $2,
         apellidos = $3,
         empresa = $4,
         cargo = $5,
         correo = $6,
         telefono = $7,
         fuente = $8,
         id_responsable = $9,
         notas = $10
       WHERE id_prospecto = $1 AND estado <> 'Convertido'`,
      [
        id,
        datos.nombres,
        datos.apellidos,
        datos.empresa,
        datos.cargo,
        datos.correo,
        datos.telefono,
        datos.fuente,
        datos.idResponsable,
        datos.notas,
      ],
    );
    const actualizado = await leerProspecto(cx, id);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "prospectos",
      idRegistro: id,
      accion: "EDITAR",
      antes,
      despues: actualizado,
    });
    await cx.query("COMMIT");
    res.json({ ok: true, prospecto: actualizado });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    if (!res.headersSent) res.status(500).json({ ok: false, mensaje: "Error al actualizar el prospecto" });
  } finally {
    cx.release();
  }
}

export async function cambiarEstadoProspecto(req: Request, res: Response) {
  const id = idRuta(req.params.id);
  if (!id) {
    res.status(404).json({ ok: false, mensaje: "Prospecto no encontrado" });
    return;
  }
  const estado = String(req.body?.estado ?? "").trim();
  if (estado === "Convertido") {
    res.status(400).json({ ok: false, mensaje: "La conversión se hace con el botón Convertir" });
    return;
  }
  if (!ESTADOS_ABIERTOS.includes(estado)) {
    res.status(400).json({ ok: false, mensaje: "Estado inválido" });
    return;
  }
  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    const bloqueo = await cx.query("SELECT estado FROM prospectos WHERE id_prospecto = $1 FOR UPDATE", [id]);
    if (!bloqueo.rows[0]) {
      await rechazar(cx, res, 404, "Prospecto no encontrado");
      return;
    }
    if (bloqueo.rows[0].estado === "Convertido") {
      await rechazar(cx, res, 400, "Un prospecto convertido no cambia de estado");
      return;
    }
    if (bloqueo.rows[0].estado === estado) {
      await rechazar(cx, res, 400, "El prospecto ya está en ese estado");
      return;
    }
    const antes = await leerProspecto(cx, id);
    await cx.query("UPDATE prospectos SET estado = $2 WHERE id_prospecto = $1 AND estado <> 'Convertido'", [id, estado]);
    const actualizado = await leerProspecto(cx, id);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "prospectos",
      idRegistro: id,
      accion: "CAMBIAR_ESTADO",
      antes,
      despues: actualizado,
    });
    await cx.query("COMMIT");
    res.json({ ok: true, prospecto: actualizado });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    if (!res.headersSent) res.status(500).json({ ok: false, mensaje: "Error al cambiar el estado" });
  } finally {
    cx.release();
  }
}

async function crearContacto(
  cx: PoolClient,
  idCliente: number,
  persona: { nombres: string; apellidos: string; cargo: string | null; telefono: string | null; correo: string | null },
  esPrincipal: boolean,
  idUsuario: number | null | undefined,
) {
  const insertado = await cx.query(
    `INSERT INTO contactos_cliente (id_cliente, nombres, apellidos, cargo, telefono, correo, es_principal)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_contacto`,
    [idCliente, persona.nombres, persona.apellidos, persona.cargo, persona.telefono, persona.correo, esPrincipal],
  );
  const idContacto = insertado.rows[0].id_contacto as number;
  const creado = await cx.query(`${SQL_CONTACTO} WHERE ct.id_contacto = $1`, [idContacto]);
  await registrarCambio(cx, {
    idUsuario,
    tabla: "contactos_cliente",
    idRegistro: idContacto,
    accion: "CREAR",
    despues: creado.rows[0],
  });
  return idContacto;
}

export async function convertirProspecto(req: Request, res: Response) {
  const id = idRuta(req.params.id);
  if (!id) {
    res.status(404).json({ ok: false, mensaje: "Prospecto no encontrado" });
    return;
  }
  const cuerpo = (req.body ?? {}) as Record<string, unknown>;
  const modo = String(cuerpo.modo ?? "");
  if (modo !== "nuevo" && modo !== "existente") {
    res.status(400).json({ ok: false, mensaje: "Indique si el cliente es nuevo o existente" });
    return;
  }
  const crearProyecto = cuerpo.crear_proyecto === true;
  const confirmarDuplicado = cuerpo.confirmar_duplicado === true;
  const nombreProyecto = String(cuerpo.nombre_proyecto ?? "").trim();
  const descripcionProyecto = textoOpcional(cuerpo.descripcion_proyecto);
  const idClientePedido = idOpcional(cuerpo.id_cliente);

  if (crearProyecto && (!nombreProyecto || nombreProyecto.length > 180)) {
    res.status(400).json({ ok: false, mensaje: "El nombre del proyecto es obligatorio (máximo 180 caracteres)" });
    return;
  }
  if (modo === "existente" && !idClientePedido) {
    res.status(400).json({ ok: false, mensaje: "Seleccione un cliente" });
    return;
  }

  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    const bloqueo = await cx.query("SELECT id_prospecto FROM prospectos WHERE id_prospecto = $1 FOR UPDATE", [id]);
    if (!bloqueo.rows[0]) {
      await rechazar(cx, res, 404, "Prospecto no encontrado");
      return;
    }
    const antes = await leerProspecto(cx, id);
    if (antes.estado === "Convertido" || antes.id_cliente) {
      await rechazar(cx, res, 400, "Este prospecto ya fue convertido");
      return;
    }
    if (!ESTADOS_CONVERTIBLES.includes(antes.estado)) {
      await rechazar(cx, res, 400, "Solo se puede convertir un prospecto contactado o calificado");
      return;
    }

    const idUsuario = req.usuario?.id_usuario;
    let idCliente = 0;

    if (modo === "nuevo") {
      const empresa = textoOpcional(antes.empresa);
      if (!empresa) {
        await rechazar(cx, res, 400, "Indique la empresa del prospecto para crear un cliente nuevo");
        return;
      }
      const repetidos = await cx.query(
        `SELECT ce.razon_social
         FROM clientes_empresas ce
         WHERE LOWER(TRIM(ce.razon_social)) = LOWER(TRIM($1))
         ORDER BY ce.id_cliente`,
        [empresa],
      );
      if (repetidos.rows.length > 0 && !confirmarDuplicado) {
        const lista = repetidos.rows.map((fila) => fila.razon_social as string).join(", ");
        await rechazar(
          cx,
          res,
          409,
          `Ya existe un cliente con la razón social «${empresa}»: ${lista}. Confirme si desea crear otro.`,
        );
        return;
      }
      const cliente = await cx.query(
        `INSERT INTO clientes (tipo_cliente, estado, origen, observaciones)
         VALUES ('EMPRESA', 'ACTIVO', $1, $2)
         RETURNING id_cliente`,
        [antes.fuente, antes.notas],
      );
      idCliente = cliente.rows[0].id_cliente as number;
      await cx.query(
        `INSERT INTO clientes_empresas
          (id_cliente, razon_social, nombre_comercial, nit, representante_legal, telefono, correo)
         VALUES ($1, $2, NULL, NULL, $3, $4, $5)`,
        [idCliente, empresa, representanteLegal(antes.nombres, antes.apellidos), antes.telefono, antes.correo],
      );
      const clienteCreado = await cx.query(`${SQL_CLIENTE} WHERE c.id_cliente = $1`, [idCliente]);
      await registrarCambio(cx, {
        idUsuario,
        tabla: "clientes",
        idRegistro: idCliente,
        accion: "CREAR",
        despues: clienteCreado.rows[0],
      });
      await crearContacto(
        cx,
        idCliente,
        {
          nombres: antes.nombres,
          apellidos: antes.apellidos,
          cargo: antes.cargo,
          telefono: antes.telefono,
          correo: antes.correo,
        },
        true,
        idUsuario,
      );
    } else {
      const cliente = await cx.query("SELECT id_cliente, estado FROM clientes WHERE id_cliente = $1 FOR UPDATE", [idClientePedido]);
      if (!cliente.rows[0]) {
        await rechazar(cx, res, 404, "Cliente no encontrado");
        return;
      }
      if (cliente.rows[0].estado !== "ACTIVO") {
        await rechazar(cx, res, 400, "Solo se puede vincular un prospecto a un cliente activo");
        return;
      }
      idCliente = cliente.rows[0].id_cliente as number;
      const principal = await cx.query(
        "SELECT id_contacto FROM contactos_cliente WHERE id_cliente = $1 AND es_principal = TRUE LIMIT 1",
        [idCliente],
      );
      await crearContacto(
        cx,
        idCliente,
        {
          nombres: antes.nombres,
          apellidos: antes.apellidos,
          cargo: antes.cargo,
          telefono: antes.telefono,
          correo: antes.correo,
        },
        !principal.rows[0],
        idUsuario,
      );
    }

    let idProyecto: number | null = null;
    let nota: string | undefined;
    if (crearProyecto) {
      const catalogo = await cx.query("SELECT id_estado FROM estados_proyecto WHERE nombre = 'Cotización'", []);
      if (!catalogo.rows[0]) {
        await rechazar(cx, res, 500, "No existe el estado Cotización");
        return;
      }
      let idResponsable: number | null = null;
      if (antes.id_responsable && (await responsableDisponible(cx, antes.id_responsable))) {
        idResponsable = antes.id_responsable;
      }
      const codigo = `PRY-${String(Date.now()).slice(-6)}`;
      const proyecto = await cx.query(
        `INSERT INTO proyectos
          (id_cliente, id_estado, id_responsable, codigo, nombre, descripcion, porcentaje_avance)
         VALUES ($1, $2, $3, $4, $5, $6, 0)
         RETURNING id_proyecto`,
        [idCliente, catalogo.rows[0].id_estado, idResponsable, codigo, nombreProyecto, descripcionProyecto],
      );
      idProyecto = proyecto.rows[0].id_proyecto as number;
      const proyectoCreado = await cx.query(`${SQL_PROYECTO} WHERE p.id_proyecto = $1`, [idProyecto]);
      await registrarCambio(cx, {
        idUsuario,
        tabla: "proyectos",
        idRegistro: idProyecto,
        accion: "CREAR",
        despues: proyectoCreado.rows[0],
      });
      nota = `Proyecto creado en cotización: ${nombreProyecto}`;
    }

    const convertido = await cx.query(
      `UPDATE prospectos
       SET estado = 'Convertido', id_cliente = $2, convertido_en = NOW()
       WHERE id_prospecto = $1
         AND estado IN ('Contactado', 'Calificado')
         AND id_cliente IS NULL
       RETURNING id_prospecto`,
      [id, idCliente],
    );
    if (!convertido.rows[0]) {
      await rechazar(cx, res, 400, "Este prospecto ya fue convertido");
      return;
    }
    const despues = await leerProspecto(cx, id);
    await registrarCambio(cx, {
      idUsuario,
      tabla: "prospectos",
      idRegistro: id,
      accion: "CONVERTIR",
      antes,
      despues,
      nota,
    });
    await cx.query("COMMIT");
    res.json({ ok: true, prospecto: despues, id_proyecto: idProyecto });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    if (!res.headersSent) res.status(500).json({ ok: false, mensaje: "Error al convertir el prospecto" });
  } finally {
    cx.release();
  }
}
