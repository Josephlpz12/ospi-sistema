import type { Rol, Usuario } from "../tipos";
import { api } from "./api";

export async function listarUsuarios() {
  const datos = await api<{ usuarios: Usuario[] }>("/usuarios");
  return datos.usuarios;
}

export async function listarRoles() {
  const datos = await api<{ roles: Rol[] }>("/usuarios/roles");
  return datos.roles;
}

export async function obtenerUsuario(id: number) {
  const datos = await api<{ usuario: Usuario }>(`/usuarios/${id}`);
  return datos.usuario;
}

export async function guardarUsuario(cuerpo: Record<string, unknown>, id?: number) {
  if (id) {
    const datos = await api<{ usuario: Usuario }>(`/usuarios/${id}`, { method: "PUT", body: cuerpo });
    return datos.usuario;
  }
  const datos = await api<{ usuario: Usuario }>("/usuarios", { method: "POST", body: cuerpo });
  return datos.usuario;
}

export async function cambiarEstadoUsuario(id: number, activo: boolean) {
  const datos = await api<{ usuario: Usuario }>(`/usuarios/${id}/estado`, { method: "PUT", body: { activo } });
  return datos.usuario;
}

export async function restablecerClave(id: number, password: string) {
  await api(`/usuarios/${id}/clave`, { method: "PUT", body: { password } });
}
