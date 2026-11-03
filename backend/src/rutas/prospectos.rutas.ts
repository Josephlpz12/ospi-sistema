import { Router } from "express";
import {
  actualizarProspecto,
  cambiarEstadoProspecto,
  convertirProspecto,
  crearProspecto,
  listarProspectos,
  obtenerProspecto,
} from "../controladores/prospectos.controlador.js";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar } from "../middleware/autorizar.js";

export const prospectosRutas = Router();

prospectosRutas.use(autenticar);
prospectosRutas.use(autorizar(ROLES.admin));
prospectosRutas.get("/", listarProspectos);
prospectosRutas.get("/:id", obtenerProspecto);
prospectosRutas.post("/", crearProspecto);
prospectosRutas.put("/:id", actualizarProspecto);
prospectosRutas.post("/:id/estado", cambiarEstadoProspecto);
prospectosRutas.post("/:id/convertir", convertirProspecto);
