import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
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
clientesRutas.get("/", listarClientes);
clientesRutas.get("/:id/suscripciones", listarSuscripciones);
clientesRutas.post("/:id/suscripciones", crearSuscripcion);
clientesRutas.get("/:id", obtenerCliente);
clientesRutas.post("/", crearCliente);
clientesRutas.put("/:id", actualizarCliente);
clientesRutas.delete("/:id", desactivarCliente);
