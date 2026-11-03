export const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CARACTERES_TELEFONO = /^\+?[\d\s()-]+$/;

export function correoValido(texto: string) {
  return FORMATO_CORREO.test(texto) && texto.length <= 150;
}

export function telefonoValido(texto: string) {
  if (!CARACTERES_TELEFONO.test(texto)) return false;
  const digitos = texto.replace(/\D/g, "").length;
  return digitos >= 8 && digitos <= 15;
}

export function textoOpcional(valor: unknown) {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}
