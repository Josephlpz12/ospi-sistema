import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import {
  crearDocumento,
  eliminarDocumento,
  listarDocumentos,
  subirArchivo,
} from "../controladores/documentos.controlador.js";

export const documentosRutas = Router();

documentosRutas.use(autenticar);
documentosRutas.get("/", listarDocumentos);
documentosRutas.post("/", subirArchivo.single("archivo"), crearDocumento);
documentosRutas.delete("/:id", eliminarDocumento);
