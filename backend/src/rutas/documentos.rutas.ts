import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar, todosLosRoles } from "../middleware/autorizar.js";
import {
  crearDocumento,
  eliminarDocumento,
  listarDocumentos,
  subirArchivo,
} from "../controladores/documentos.controlador.js";

export const documentosRutas = Router();

documentosRutas.use(autenticar);
documentosRutas.get("/", autorizar(...todosLosRoles), listarDocumentos);
documentosRutas.post("/", autorizar(ROLES.admin), subirArchivo.single("archivo"), crearDocumento);
documentosRutas.delete("/:id", autorizar(ROLES.admin), eliminarDocumento);
