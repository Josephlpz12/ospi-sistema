import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { ROLES, autorizar } from "../middleware/autorizar.js";
import { crearProducto, listarProductos } from "../controladores/productos.controlador.js";

export const productosRutas = Router();

productosRutas.use(autenticar);
productosRutas.get("/", autorizar(ROLES.admin, ROLES.gerente), listarProductos);
productosRutas.post("/", autorizar(ROLES.admin), crearProducto);
