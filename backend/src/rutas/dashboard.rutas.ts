import { Router } from "express";
import { obtenerDashboard } from "../controladores/dashboard.controlador.js";
import { autenticar } from "../middleware/autenticar.js";
import { autorizar, todosLosRoles } from "../middleware/autorizar.js";

export const dashboardRutas = Router();

dashboardRutas.use(autenticar);
dashboardRutas.use(autorizar(...todosLosRoles));
dashboardRutas.get("/", obtenerDashboard);
