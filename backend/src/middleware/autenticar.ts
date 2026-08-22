import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type PayloadToken = {
  id_usuario: number;
  id_rol: number;
  nombre_usuario: string;
  correo: string;
  nombre_rol: string;
};

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, mensaje: "No autenticado" });
    return;
  }

  const secreto = process.env.JWT_SECRET;
  if (!secreto) {
    res.status(500).json({ ok: false, mensaje: "Falta JWT_SECRET en .env" });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), secreto) as PayloadToken;
    req.usuario = payload;
    next();
  } catch {
    res.status(401).json({ ok: false, mensaje: "Token inválido o vencido" });
  }
}
