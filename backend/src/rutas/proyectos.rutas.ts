import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar, todosLosRoles } from "../middleware/autorizar.js";
import {
  actualizarProyecto,
  cancelarProyecto,
  crearProyecto,
  listarProyectos,
  obtenerProyecto,
} from "../controladores/proyectos.controlador.js";

export const proyectosRutas = Router();

proyectosRutas.use(autenticar);
proyectosRutas.get("/", autorizar(...todosLosRoles), listarProyectos);
proyectosRutas.get("/:id", autorizar(...todosLosRoles), obtenerProyecto);
proyectosRutas.post("/", autorizar(ROLES.admin), crearProyecto);
proyectosRutas.put("/:id", autorizar(ROLES.admin), actualizarProyecto);
proyectosRutas.delete("/:id", autorizar(ROLES.admin), cancelarProyecto);
