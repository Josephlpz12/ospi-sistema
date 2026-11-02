import bcrypt from "bcryptjs";
import { pool } from "../db.js";

const cuentas = [
  {
    usuario: "admin",
    correo: "admin@ospi.gt",
    password: "OspiAdmin2026",
    rol: "Administrador",
  },
  {
    usuario: "desarrollador",
    correo: "desarrollador@ospi.gt",
    password: "OspiDev2026",
    rol: "Desarrollador",
  },
  {
    usuario: "gerente",
    correo: "gerente@ospi.gt",
    password: "OspiFinanzas2026",
    rol: "Gerente financiero",
  },
];

async function crearUsuariosPrueba() {
  for (const cuenta of cuentas) {
    const rol = await pool.query("SELECT id_rol FROM roles WHERE nombre = $1", [cuenta.rol]);
    if (!rol.rows[0]) {
      throw new Error(
        `No existe el rol ${cuenta.rol}. Actualiza los roles en la base antes de crear usuarios.`,
      );
    }

    const existente = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE nombre_usuario = $1 OR correo = $2",
      [cuenta.usuario, cuenta.correo],
    );
    if (existente.rows[0]) {
      console.log(`El usuario ${cuenta.usuario} ya existe. No se modificó.`);
      continue;
    }

    const hash = await bcrypt.hash(cuenta.password, 10);
    await pool.query(
      `INSERT INTO usuarios (id_rol, nombre_usuario, correo, hash_password, activo)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [rol.rows[0].id_rol, cuenta.usuario, cuenta.correo, hash],
    );
    console.log(`Usuario creado: ${cuenta.usuario} / ${cuenta.password} (${cuenta.rol})`);
  }
}

crearUsuariosPrueba()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
