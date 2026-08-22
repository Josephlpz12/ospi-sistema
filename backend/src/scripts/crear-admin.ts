import bcrypt from "bcryptjs";
import { pool } from "../db.js";

const USUARIO = "admin";
const CORREO = "admin@ospi.gt";
const PASSWORD = "OspiAdmin2026";

async function crearAdmin() {
  const rol = await pool.query("SELECT id_rol FROM roles WHERE nombre = 'Administrador'");
  if (!rol.rows[0]) {
    throw new Error("No existe el rol Administrador. Ejecuta backend/sql/002_seed.sql");
  }

  const existente = await pool.query(
    "SELECT id_usuario FROM usuarios WHERE nombre_usuario = $1 OR correo = $2",
    [USUARIO, CORREO],
  );
  if (existente.rows[0]) {
    console.log("El usuario admin ya existe. Puedes iniciar sesión con admin / OspiAdmin2026");
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  await pool.query(
    `INSERT INTO usuarios (id_rol, nombre_usuario, correo, hash_password, activo)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [rol.rows[0].id_rol, USUARIO, CORREO, hash],
  );

  console.log("Usuario administrador creado:");
  console.log("  usuario: admin");
  console.log("  contraseña: OspiAdmin2026");
  await pool.end();
}

crearAdmin().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
