import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import {
  actualizarMulta,
  crearContrato,
  listarContratos,
  obtenerContrato,
  reactivarContrato,
} from "../controladores/contratos.controlador.js";
import {
  aplicarMora,
  crearFactura,
  listarFacturas,
  registrarPago,
  revisarFacturasVencidas,
} from "../controladores/facturas.controlador.js";
import { actualizarSuscripcion } from "../controladores/suscripciones.controlador.js";

export const finanzasRutas = Router();

finanzasRutas.use(autenticar);

finanzasRutas.get("/contratos", listarContratos);
finanzasRutas.post("/contratos", crearContrato);
finanzasRutas.get("/contratos/:id", obtenerContrato);
finanzasRutas.get("/contratos/:id/facturas", listarFacturas);
finanzasRutas.post("/contratos/:id/facturas", crearFactura);
finanzasRutas.post("/contratos/:id/reactivar", reactivarContrato);

finanzasRutas.post("/facturas/revisar-vencidas", revisarFacturasVencidas);
finanzasRutas.post("/facturas/:id/pagos", registrarPago);
finanzasRutas.post("/facturas/:id/mora", aplicarMora);

finanzasRutas.put("/multas/:id", actualizarMulta);
finanzasRutas.put("/suscripciones/:id", actualizarSuscripcion);
