import { Router } from "express";
import { login, perfil } from "../controladores/auth.controlador.js";
import { autenticar } from "../middleware/autenticar.js";

export const authRutas = Router();

authRutas.post("/login", login);
authRutas.get("/me", autenticar, perfil);
