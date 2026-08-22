import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

export async function login(req: Request, res: Response) {
  const identificador = String(req.body.usuario ?? req.body.correo ?? "").trim();
  const password = String(req.body.password ?? "");

  if (!identificador || !password) {
    res.status(400).json({ ok: false, mensaje: "Usuario y contraseña son obligatorios" });
    return;
  }

  const secreto = process.env.JWT_SECRET;
  if (!secreto) {
    res.status(500).json({ ok: false, mensaje: "Falta JWT_SECRET en .env" });
    return;
  }

  try {
    const resultado = await pool.query(
      `SELECT u.id_usuario, u.id_rol, u.nombre_usuario, u.correo, u.hash_password, u.activo,
              r.nombre AS nombre_rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.correo = $1 OR u.nombre_usuario = $1
       LIMIT 1`,
      [identificador],
    );

    const fila = resultado.rows[0];
    if (!fila || !fila.activo) {
      res.status(401).json({ ok: false, mensaje: "Credenciales incorrectas" });
      return;
    }

    const coincide = await bcrypt.compare(password, fila.hash_password);
    if (!coincide) {
      res.status(401).json({ ok: false, mensaje: "Credenciales incorrectas" });
      return;
    }

    const usuario = {
      id_usuario: fila.id_usuario,
      id_rol: fila.id_rol,
      nombre_usuario: fila.nombre_usuario,
      correo: fila.correo,
      nombre_rol: fila.nombre_rol,
    };

    const token = jwt.sign(usuario, secreto, { expiresIn: "8h" });
    res.json({ ok: true, token, usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: "Error al iniciar sesión" });
  }
}

export async function perfil(req: Request, res: Response) {
  res.json({ ok: true, usuario: req.usuario });
}
