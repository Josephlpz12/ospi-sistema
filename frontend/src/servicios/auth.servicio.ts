import type { UsuarioSesion } from "../tipos";
import { API, guardarSesion } from "./api";

type RespuestaLogin = {
  ok: boolean;
  token: string;
  usuario: UsuarioSesion;
};

export async function iniciarSesion(usuario: string, password: string) {
  const respuesta = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password }),
  });
  const datos = (await respuesta.json()) as RespuestaLogin & { mensaje?: string };
  if (!respuesta.ok) {
    throw new Error(datos.mensaje ?? "No se pudo iniciar sesión");
  }
  guardarSesion(datos.token, datos.usuario);
  return datos.usuario;
}
