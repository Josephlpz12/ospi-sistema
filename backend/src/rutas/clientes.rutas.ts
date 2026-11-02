import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar, todosLosRoles } from "../middleware/autorizar.js";
import {
  actualizarCliente,
  crearCliente,
  desactivarCliente,
  listarClientes,
  obtenerCliente,
} from "../controladores/clientes.controlador.js";
import { crearSuscripcion, listarSuscripciones } from "../controladores/suscripciones.controlador.js";

export const clientesRutas = Router();

clientesRutas.use(autenticar);
clientesRutas.get("/", autorizar(...todosLosRoles), listarClientes);
clientesRutas.get("/:id/suscripciones", autorizar(...todosLosRoles), listarSuscripciones);
clientesRutas.post("/:id/suscripciones", autorizar(ROLES.admin), crearSuscripcion);
clientesRutas.get("/:id", autorizar(...todosLosRoles), obtenerCliente);
clientesRutas.post("/", autorizar(ROLES.admin), crearCliente);
clientesRutas.put("/:id", autorizar(ROLES.admin), actualizarCliente);
clientesRutas.delete("/:id", autorizar(ROLES.admin), desactivarCliente);
