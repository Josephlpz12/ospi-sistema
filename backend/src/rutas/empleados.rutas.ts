import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar } from "../middleware/autorizar.js";
import { listarEmpleados } from "../controladores/avances.controlador.js";

export const empleadosRutas = Router();

empleadosRutas.use(autenticar);
empleadosRutas.get("/", autorizar(ROLES.admin), listarEmpleados);
