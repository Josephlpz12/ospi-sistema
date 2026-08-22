import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import { authRutas } from "./rutas/auth.rutas.js";
import { clientesRutas } from "./rutas/clientes.rutas.js";
import { proyectosRutas } from "./rutas/proyectos.rutas.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS hora");
    res.json({
      ok: true,
      servicio: "OSPI API",
      baseDatos: "ospi_sistema",
      horaServidor: result.rows[0].hora,
    });
  } catch {
    res.status(500).json({
      ok: false,
      mensaje: "No se pudo conectar a PostgreSQL. Revisa usuario y contraseña en backend/.env",
    });
  }
});

app.use("/api/auth", authRutas);
app.use("/api/clientes", clientesRutas);
app.use("/api/proyectos", proyectosRutas);

app.listen(port, () => {
  console.log(`API OSPI escuchando en http://localhost:${port}`);
});
