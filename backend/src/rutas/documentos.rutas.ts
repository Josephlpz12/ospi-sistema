import { Router, type NextFunction, type Request, type Response } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar, todosLosRoles } from "../middleware/autorizar.js";
import {
  crearDocumento,
  descargarDocumento,
  eliminarDocumento,
  listarDocumentos,
  subirArchivo,
} from "../controladores/documentos.controlador.js";

export const documentosRutas = Router();

function subirConLimite(req: Request, res: Response, next: NextFunction) {
  subirArchivo.single("archivo")(req, res, (error) => {
    if (error && (error as { code?: string }).code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        ok: false,
        mensaje: "El archivo supera el tamaño máximo de 10 MB",
      });
      return;
    }
    next(error);
  });
}

documentosRutas.use(autenticar);
documentosRutas.get("/", autorizar(...todosLosRoles), listarDocumentos);
documentosRutas.get("/:id", autorizar(...todosLosRoles), descargarDocumento);
documentosRutas.post("/", autorizar(ROLES.admin), subirConLimite, crearDocumento);
documentosRutas.delete("/:id", autorizar(ROLES.admin), eliminarDocumento);
