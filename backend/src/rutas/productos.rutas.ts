import { Router } from "express";
import { autenticar } from "../middleware/autenticar.js";
import { crearProducto, listarProductos } from "../controladores/productos.controlador.js";

export const productosRutas = Router();

productosRutas.use(autenticar);
productosRutas.get("/", listarProductos);
productosRutas.post("/", crearProducto);
