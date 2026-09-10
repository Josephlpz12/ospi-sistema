import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { actualizarFase, crearFase, eliminarFase, listarFases } from "../controladores/fases.controlador.js";
import { actualizarTarea, crearTarea, eliminarTarea, listarTareas } from "../controladores/tareas.controlador.js";
import { listarAvances, registrarAvance } from "../controladores/avances.controlador.js";

export const seguimientoRutas = Router();

seguimientoRutas.use(autenticar);
seguimientoRutas.get("/:id/fases", listarFases);
seguimientoRutas.post("/:id/fases", crearFase);
seguimientoRutas.put("/:id/fases/:idFase", actualizarFase);
seguimientoRutas.delete("/:id/fases/:idFase", eliminarFase);
seguimientoRutas.get("/:id/tareas", listarTareas);
seguimientoRutas.post("/:id/tareas", crearTarea);
seguimientoRutas.put("/:id/tareas/:idTarea", actualizarTarea);
seguimientoRutas.delete("/:id/tareas/:idTarea", eliminarTarea);
seguimientoRutas.get("/:id/avances", listarAvances);
seguimientoRutas.post("/:id/avances", registrarAvance);
