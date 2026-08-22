import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import {
  actualizarProyecto,
  cancelarProyecto,
  crearProyecto,
  listarProyectos,
  obtenerProyecto,
} from "../controladores/proyectos.controlador.js";

export const proyectosRutas = Router();

proyectosRutas.use(autenticar);
proyectosRutas.get("/", listarProyectos);
proyectosRutas.get("/:id", obtenerProyecto);
proyectosRutas.post("/", crearProyecto);
proyectosRutas.put("/:id", actualizarProyecto);
proyectosRutas.delete("/:id", cancelarProyecto);
