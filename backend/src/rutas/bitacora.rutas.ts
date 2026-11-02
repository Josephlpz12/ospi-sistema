import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar } from "../middleware/autorizar.js";
import { listarBitacora } from "../controladores/bitacora.controlador.js";

export const bitacoraRutas = Router();

bitacoraRutas.use(autenticar);
bitacoraRutas.use(autorizar(ROLES.admin));
bitacoraRutas.get("/", listarBitacora);
