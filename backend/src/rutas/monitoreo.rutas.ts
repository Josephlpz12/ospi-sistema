import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { listarProyectosActivos } from "../controladores/monitoreo.controlador.js";

export const monitoreoRutas = Router();

monitoreoRutas.use(autenticar);
monitoreoRutas.get("/proyectos-activos", listarProyectosActivos);
