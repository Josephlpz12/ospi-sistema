export type Tema = "light" | "dark";

const CLAVE_TEMA = "ospi-tema";

export function leerTema(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === "light" || guardado === "dark") return guardado;
  } catch {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function aplicarTema(tema: Tema) {
  document.documentElement.setAttribute("data-theme", tema);
}

export function guardarTema(tema: Tema) {
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    return;
  }
}
