import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar, todosLosRoles } from "../middleware/autorizar.js";
import {
  actualizarCliente,
  crearCliente,
  activarCliente,
  desactivarCliente,
  listarClientes,
  obtenerCliente,
} from "../controladores/clientes.controlador.js";
import {
  actualizarContacto,
  crearContacto,
  eliminarContacto,
  listarContactos,
} from "../controladores/contactos.controlador.js";
import {
  actualizarDireccion,
  crearDireccion,
  eliminarDireccion,
  listarDirecciones,
} from "../controladores/direcciones.controlador.js";
import { crearSuscripcion, listarSuscripciones } from "../controladores/suscripciones.controlador.js";
import { obtenerResumenFinanciero, obtenerResumenGeneral } from "../controladores/resumen.controlador.js";

export const clientesRutas = Router();

clientesRutas.use(autenticar);
clientesRutas.get("/", autorizar(...todosLosRoles), listarClientes);
clientesRutas.get("/:id/suscripciones", autorizar(...todosLosRoles), listarSuscripciones);
clientesRutas.post("/:id/suscripciones", autorizar(ROLES.admin), crearSuscripcion);
clientesRutas.get("/:id/contactos", autorizar(...todosLosRoles), listarContactos);
clientesRutas.post("/:id/contactos", autorizar(ROLES.admin), crearContacto);
clientesRutas.put("/:id/contactos/:idContacto", autorizar(ROLES.admin), actualizarContacto);
clientesRutas.delete("/:id/contactos/:idContacto", autorizar(ROLES.admin), eliminarContacto);
clientesRutas.get("/:id/direcciones", autorizar(...todosLosRoles), listarDirecciones);
clientesRutas.post("/:id/direcciones", autorizar(ROLES.admin), crearDireccion);
clientesRutas.put("/:id/direcciones/:idDireccion", autorizar(ROLES.admin), actualizarDireccion);
clientesRutas.delete("/:id/direcciones/:idDireccion", autorizar(ROLES.admin), eliminarDireccion);
clientesRutas.get("/resumen-general", autorizar(ROLES.admin, ROLES.gerente), obtenerResumenGeneral);
clientesRutas.get("/:id/resumen-financiero", autorizar(ROLES.admin, ROLES.gerente), obtenerResumenFinanciero);
clientesRutas.get("/:id", autorizar(...todosLosRoles), obtenerCliente);
clientesRutas.post("/", autorizar(ROLES.admin), crearCliente);
clientesRutas.put("/:id", autorizar(ROLES.admin), actualizarCliente);
clientesRutas.post("/:id/activar", autorizar(ROLES.admin), activarCliente);
clientesRutas.delete("/:id", autorizar(ROLES.admin), desactivarCliente);
