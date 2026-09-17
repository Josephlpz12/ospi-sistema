import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { generarAlertas, listarAlertas, marcarAlertaLeida } from "../controladores/alertas.controlador.js";

export const alertasRutas = Router();

alertasRutas.use(autenticar);
alertasRutas.get("/", listarAlertas);
alertasRutas.post("/generar", generarAlertas);
alertasRutas.put("/:id/leer", marcarAlertaLeida);
