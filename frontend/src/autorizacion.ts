export const ROL_ADMIN = "Administrador";
export const ROL_DESARROLLADOR = "Desarrollador";
export const ROL_GERENTE = "Gerente financiero";

export function esAdministrador(rol: string | undefined) {
  return rol === ROL_ADMIN;
}

export function puedeOperarFinanzas(rol: string | undefined) {
  return rol === ROL_ADMIN || rol === ROL_GERENTE;
}

export function puedeActualizarSeguimiento(rol: string | undefined) {
  return rol === ROL_ADMIN || rol === ROL_DESARROLLADOR;
}
