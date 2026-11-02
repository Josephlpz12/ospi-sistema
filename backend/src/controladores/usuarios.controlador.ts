import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { ROLES } from "../middleware/autorizar.js";
import { registrarCambio, registrarCambioAparte } from "../servicios/bitacora.servicio.js";

const SQL_USUARIO = `
  SELECT u.id_usuario, u.nombre_usuario, u.correo, u.id_rol, r.nombre AS nombre_rol, u.activo, u.creado_en,
         em.id_empleado, em.nombres AS nombres_empleado, em.apellidos AS apellidos_empleado, em.cargo AS cargo_empleado
  FROM usuarios u
  JOIN roles r ON r.id_rol = u.id_rol
  LEFT JOIN empleados em ON em.id_usuario = u.id_usuario
`;

type DatosEmpleado = { nombres: string; apellidos: string; cargo: string | null };

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function idValido(valor: string | string[] | undefined) {
  const id = Number(Array.isArray(valor) ? valor[0] : valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validarClave(clave: string) {
  if (clave.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (clave.length > 72) return "La contraseña no puede tener más de 72 caracteres";
  return null;
}

function leerEmpleado(cuerpo: unknown): { error: string } | { empleado: DatosEmpleado | null } {
  if (cuerpo === undefined || cuerpo === null) return { empleado: null };
  const datos = cuerpo as Record<string, unknown>;
  const nombres = String(datos.nombres ?? "").trim();
  const apellidos = String(datos.apellidos ?? "").trim();
  const cargo = String(datos.cargo ?? "").trim();
  if (!nombres || !apellidos) return { error: "Ingrese nombres y apellidos del empleado" };
  if (nombres.length > 100 || apellidos.length > 100) {
    return { error: "Los nombres y apellidos del empleado no pueden superar los 100 caracteres" };
  }
  if (cargo.length > 80) return { error: "El cargo no puede superar los 80 caracteres" };
  return { empleado: { nombres, apellidos, cargo: cargo || null } };
}

async function insertarEmpleado(cx: PoolClient, idUsuario: number, empleado: DatosEmpleado) {
  await cx.query(
    "INSERT INTO empleados (id_usuario, nombres, apellidos, cargo, activo) VALUES ($1, $2, $3, $4, TRUE)",
    [idUsuario, empleado.nombres, empleado.apellidos, empleado.cargo],
  );
}

function mensajeDuplicado(error: unknown) {
  const detalle = error as { code?: string; constraint?: string };
  if (detalle.code !== "23505") return null;
  if (detalle.constraint?.includes("correo")) return "Ese correo ya está registrado";
  return "Ese nombre de usuario ya está en uso";
}

export async function rechazar(cx: PoolClient, res: Response, estado: number, mensaje: string) {
  await cx.query("ROLLBACK");
  res.status(estado).json({ ok: false, mensaje });
}

async function bloquearUsuario(cx: PoolClient, id: number) {
  const resultado = await cx.query(
    `SELECT u.id_usuario, u.id_rol, u.activo, r.nombre AS nombre_rol
     FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = $1
     FOR UPDATE OF u`,
    [id],
  );
  return resultado.rows[0] as
    | { id_usuario: number; id_rol: number; activo: boolean; nombre_rol: string }
    | undefined;
}

async function leerUsuario(cx: PoolClient, id: number) {
  const resultado = await cx.query(`${SQL_USUARIO} WHERE u.id_usuario = $1`, [id]);
  return resultado.rows[0];
}

async function otrosAdministradoresActivos(cx: PoolClient, idExcluido: number) {
  const resultado = await cx.query(
    `SELECT u.id_usuario
     FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     WHERE r.nombre = $1 AND u.activo = TRUE AND u.id_usuario <> $2
     FOR UPDATE OF u`,
    [ROLES.admin, idExcluido],
  );
  return resultado.rowCount ?? 0;
}

export async function listarUsuarios(_req: Request, res: Response) {
  try {
    const resultado = await pool.query(`${SQL_USUARIO} ORDER BY u.id_usuario ASC`);
    res.json({ ok: true, usuarios: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar usuarios" });
  }
}

export async function listarRoles(_req: Request, res: Response) {
  try {
    const resultado = await pool.query("SELECT id_rol, nombre, descripcion FROM roles ORDER BY id_rol ASC");
    res.json({ ok: true, roles: resultado.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al listar roles" });
  }
}

export async function obtenerUsuario(req: Request, res: Response) {
  const id = idValido(req.params.id);
  if (!id) {
    res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
    return;
  }
  try {
    const resultado = await pool.query(`${SQL_USUARIO} WHERE u.id_usuario = $1`, [id]);
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
      return;
    }
    res.json({ ok: true, usuario: resultado.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al obtener el usuario" });
  }
}

export async function crearUsuario(req: Request, res: Response) {
  const nombreUsuario = String(req.body.nombre_usuario ?? "").trim();
  const correo = String(req.body.correo ?? "").trim().toLowerCase();
  const idRol = Number(req.body.id_rol);
  const clave = String(req.body.password ?? "");

  if (!nombreUsuario || nombreUsuario.length > 80) {
    res.status(400).json({ ok: false, mensaje: "El nombre de usuario es obligatorio (máximo 80 caracteres)" });
    return;
  }
  if (!FORMATO_CORREO.test(correo) || correo.length > 150) {
    res.status(400).json({ ok: false, mensaje: "Ingrese un correo válido" });
    return;
  }
  const errorClave = validarClave(clave);
  if (errorClave) {
    res.status(400).json({ ok: false, mensaje: errorClave });
    return;
  }
  const datosEmpleado = leerEmpleado(req.body.empleado);
  if ("error" in datosEmpleado) {
    res.status(400).json({ ok: false, mensaje: datosEmpleado.error });
    return;
  }
  const empleado = datosEmpleado.empleado;

  try {
    const rol = await pool.query("SELECT id_rol FROM roles WHERE id_rol = $1", [
      Number.isInteger(idRol) ? idRol : null,
    ]);
    if (!rol.rows[0]) {
      res.status(400).json({ ok: false, mensaje: "Seleccione un rol válido" });
      return;
    }

    const repetido = await pool.query(
      `SELECT nombre_usuario, correo FROM usuarios
       WHERE LOWER(nombre_usuario) = LOWER($1) OR LOWER(correo) = LOWER($2)`,
      [nombreUsuario, correo],
    );
    if (repetido.rows.some((f) => String(f.nombre_usuario).toLowerCase() === nombreUsuario.toLowerCase())) {
      res.status(409).json({ ok: false, mensaje: "Ese nombre de usuario ya está en uso" });
      return;
    }
    if (repetido.rows[0]) {
      res.status(409).json({ ok: false, mensaje: "Ese correo ya está registrado" });
      return;
    }

    const hash = await bcrypt.hash(clave, 10);
    const cx = await pool.connect();
    try {
      await cx.query("BEGIN");
      const insertado = await cx.query(
        `INSERT INTO usuarios (id_rol, nombre_usuario, correo, hash_password, activo)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id_usuario`,
        [idRol, nombreUsuario, correo, hash],
      );
      const idNuevo = insertado.rows[0].id_usuario as number;
      if (empleado) await insertarEmpleado(cx, idNuevo, empleado);
      const creado = await leerUsuario(cx, idNuevo);
      await registrarCambio(cx, {
        idUsuario: req.usuario?.id_usuario,
        tabla: "usuarios",
        idRegistro: idNuevo,
        accion: "CREAR",
        despues: creado,
        nota: empleado
          ? `Se definió una contraseña inicial y se registró como empleado: ${empleado.nombres} ${empleado.apellidos}`
          : "Se definió una contraseña inicial",
      });
      await cx.query("COMMIT");
      res.status(201).json({ ok: true, usuario: creado });
    } catch (error) {
      await cx.query("ROLLBACK");
      throw error;
    } finally {
      cx.release();
    }
  } catch (error) {
    const duplicado = mensajeDuplicado(error);
    if (duplicado) {
      res.status(409).json({ ok: false, mensaje: duplicado });
      return;
    }
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al crear el usuario" });
  }
}

export async function actualizarUsuario(req: Request, res: Response) {
  const id = idValido(req.params.id);
  if (!id) {
    res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
    return;
  }

  const correo = String(req.body.correo ?? "").trim().toLowerCase();
  const idRol = Number(req.body.id_rol);
  if (!FORMATO_CORREO.test(correo) || correo.length > 150) {
    res.status(400).json({ ok: false, mensaje: "Ingrese un correo válido" });
    return;
  }
  const datosEmpleado = leerEmpleado(req.body.empleado);
  if ("error" in datosEmpleado) {
    res.status(400).json({ ok: false, mensaje: datosEmpleado.error });
    return;
  }
  const empleado = datosEmpleado.empleado;

  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    const objetivo = await bloquearUsuario(cx, id);
    if (!objetivo) {
      await rechazar(cx, res, 404, "Usuario no encontrado");
      return;
    }

    const rol = await cx.query("SELECT nombre FROM roles WHERE id_rol = $1", [
      Number.isInteger(idRol) ? idRol : null,
    ]);
    if (!rol.rows[0]) {
      await rechazar(cx, res, 400, "Seleccione un rol válido");
      return;
    }

    const cambiaRol = idRol !== objetivo.id_rol;
    if (cambiaRol && id === req.usuario?.id_usuario) {
      await rechazar(cx, res, 400, "No puede cambiar su propio rol");
      return;
    }
    if (cambiaRol && objetivo.nombre_rol === ROLES.admin && objetivo.activo) {
      if ((await otrosAdministradoresActivos(cx, id)) === 0) {
        await rechazar(cx, res, 400, "No se puede quitar el rol al último administrador activo");
        return;
      }
    }

    const repetido = await cx.query(
      "SELECT id_usuario FROM usuarios WHERE LOWER(correo) = LOWER($1) AND id_usuario <> $2",
      [correo, id],
    );
    if (repetido.rows[0]) {
      await rechazar(cx, res, 409, "Ese correo ya está registrado");
      return;
    }

    const antes = await leerUsuario(cx, id);
    if (empleado && antes.id_empleado) {
      await rechazar(cx, res, 409, "Ese usuario ya está registrado como empleado");
      return;
    }
    await cx.query("UPDATE usuarios SET correo = $2, id_rol = $3 WHERE id_usuario = $1", [id, correo, idRol]);
    if (empleado) await insertarEmpleado(cx, id, empleado);
    const despues = await leerUsuario(cx, id);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "usuarios",
      idRegistro: id,
      accion: "EDITAR",
      antes,
      despues,
      nota: empleado ? `Se registró como empleado: ${empleado.nombres} ${empleado.apellidos}` : undefined,
    });
    await cx.query("COMMIT");
    res.json({ ok: true, usuario: despues });
  } catch (error) {
    await cx.query("ROLLBACK");
    const duplicado = mensajeDuplicado(error);
    if (duplicado) {
      res.status(409).json({ ok: false, mensaje: duplicado });
      return;
    }
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al actualizar el usuario" });
  } finally {
    cx.release();
  }
}

export async function cambiarEstadoUsuario(req: Request, res: Response) {
  const id = idValido(req.params.id);
  if (!id) {
    res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
    return;
  }
  if (typeof req.body.activo !== "boolean") {
    res.status(400).json({ ok: false, mensaje: "Indique si el usuario queda activo o inactivo" });
    return;
  }
  const activo = req.body.activo as boolean;

  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    const objetivo = await bloquearUsuario(cx, id);
    if (!objetivo) {
      await rechazar(cx, res, 404, "Usuario no encontrado");
      return;
    }

    if (!activo) {
      if (id === req.usuario?.id_usuario) {
        await rechazar(cx, res, 400, "No puede inactivar su propio usuario");
        return;
      }
      if (objetivo.nombre_rol === ROLES.admin && objetivo.activo) {
        if ((await otrosAdministradoresActivos(cx, id)) === 0) {
          await rechazar(cx, res, 400, "No se puede inactivar al último administrador activo");
          return;
        }
      }
    }

    const antes = await leerUsuario(cx, id);
    await cx.query("UPDATE usuarios SET activo = $2 WHERE id_usuario = $1", [id, activo]);
    await registrarCambio(cx, {
      idUsuario: req.usuario?.id_usuario,
      tabla: "usuarios",
      idRegistro: id,
      accion: activo ? "ACTIVAR" : "INACTIVAR",
      antes,
      despues: await leerUsuario(cx, id),
    });
    await cx.query("COMMIT");
    const actualizado = await pool.query(`${SQL_USUARIO} WHERE u.id_usuario = $1`, [id]);
    res.json({ ok: true, usuario: actualizado.rows[0] });
  } catch (error) {
    await cx.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al cambiar el estado del usuario" });
  } finally {
    cx.release();
  }
}

export async function restablecerClave(req: Request, res: Response) {
  const id = idValido(req.params.id);
  if (!id) {
    res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
    return;
  }
  const clave = String(req.body.password ?? "");
  const errorClave = validarClave(clave);
  if (errorClave) {
    res.status(400).json({ ok: false, mensaje: errorClave });
    return;
  }

  try {
    const hash = await bcrypt.hash(clave, 10);
    const resultado = await pool.query(
      "UPDATE usuarios SET hash_password = $2 WHERE id_usuario = $1 RETURNING id_usuario",
      [id, hash],
    );
    if (!resultado.rows[0]) {
      res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
      return;
    }
    await registrarCambioAparte({
      idUsuario: req.usuario?.id_usuario,
      tabla: "usuarios",
      idRegistro: id,
      accion: "RESTABLECER_CLAVE",
      nota: "Se restableció la contraseña",
    });
    res.json({ ok: true, mensaje: "Contraseña restablecida" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al restablecer la contraseña" });
  }
}
