import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar } from "../middleware/autorizar.js";
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
  listarRoles,
  listarUsuarios,
  obtenerUsuario,
  restablecerClave,
} from "../controladores/usuarios.controlador.js";

export const usuariosRutas = Router();

usuariosRutas.use(autenticar);
usuariosRutas.use(autorizar(ROLES.admin));
usuariosRutas.get("/roles", listarRoles);
usuariosRutas.get("/", listarUsuarios);
usuariosRutas.get("/:id", obtenerUsuario);
usuariosRutas.post("/", crearUsuario);
usuariosRutas.put("/:id", actualizarUsuario);
usuariosRutas.put("/:id/estado", cambiarEstadoUsuario);
usuariosRutas.put("/:id/clave", restablecerClave);
