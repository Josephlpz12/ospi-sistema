import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar } from "../middleware/autorizar.js";
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

const soloFinanzas = autorizar(ROLES.admin, ROLES.gerente);

finanzasRutas.use(autenticar);
finanzasRutas.get("/contratos", soloFinanzas, listarContratos);
finanzasRutas.post("/contratos", soloFinanzas, crearContrato);
finanzasRutas.get("/contratos/:id", soloFinanzas, obtenerContrato);
finanzasRutas.get("/contratos/:id/facturas", soloFinanzas, listarFacturas);
finanzasRutas.post("/contratos/:id/facturas", soloFinanzas, crearFactura);
finanzasRutas.post("/contratos/:id/reactivar", soloFinanzas, reactivarContrato);

finanzasRutas.post("/facturas/revisar-vencidas", soloFinanzas, revisarFacturasVencidas);
finanzasRutas.post("/facturas/:id/pagos", soloFinanzas, registrarPago);
finanzasRutas.post("/facturas/:id/mora", soloFinanzas, aplicarMora);

finanzasRutas.put("/multas/:id", soloFinanzas, actualizarMulta);
finanzasRutas.put("/suscripciones/:id", soloFinanzas, actualizarSuscripcion);
