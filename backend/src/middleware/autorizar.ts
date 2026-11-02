import type { NextFunction, Request, Response } from "express";

export const ROLES = {
  admin: "Administrador",
  desarrollador: "Desarrollador",
  gerente: "Gerente financiero",
} as const;

export const todosLosRoles = [ROLES.admin, ROLES.desarrollador, ROLES.gerente];

export function autorizar(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const nombre = req.usuario?.nombre_rol;
    if (!nombre || !roles.includes(nombre)) {
      res.status(403).json({ ok: false, mensaje: "No tiene permiso para esta acción" });
      return;
    }
    next();
  };
}
