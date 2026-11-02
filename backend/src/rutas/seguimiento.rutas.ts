import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar, todosLosRoles } from "../middleware/autorizar.js";
import { actualizarFase, crearFase, eliminarFase, listarFases } from "../controladores/fases.controlador.js";
import { actualizarTarea, crearTarea, eliminarTarea, listarTareas } from "../controladores/tareas.controlador.js";
import { listarAvances, registrarAvance } from "../controladores/avances.controlador.js";

export const seguimientoRutas = Router();

const consulta = autorizar(...todosLosRoles);
const estado = autorizar(ROLES.admin, ROLES.desarrollador);
const soloAdmin = autorizar(ROLES.admin);

seguimientoRutas.use(autenticar);
seguimientoRutas.get("/:id/fases", consulta, listarFases);
seguimientoRutas.post("/:id/fases", soloAdmin, crearFase);
seguimientoRutas.put("/:id/fases/:idFase", estado, actualizarFase);
seguimientoRutas.delete("/:id/fases/:idFase", soloAdmin, eliminarFase);
seguimientoRutas.get("/:id/tareas", consulta, listarTareas);
seguimientoRutas.post("/:id/tareas", soloAdmin, crearTarea);
seguimientoRutas.put("/:id/tareas/:idTarea", estado, actualizarTarea);
seguimientoRutas.delete("/:id/tareas/:idTarea", soloAdmin, eliminarTarea);
seguimientoRutas.get("/:id/avances", consulta, listarAvances);
seguimientoRutas.post("/:id/avances", estado, registrarAvance);
