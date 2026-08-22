const API = "http://localhost:4000/api";

const TOKEN_KEY = "ospi_token";
const USUARIO_KEY = "ospi_usuario";

export function leerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function guardarSesion(token: string, usuario: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function borrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

export function leerUsuarioGuardado() {
  const raw = localStorage.getItem(USUARIO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

type Opciones = Omit<RequestInit, "body"> & { body?: unknown };

export async function api<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const token = leerToken();
  const headers = new Headers(opciones.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const respuesta = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers,
    body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (respuesta.status === 401) {
    borrarSesion();
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
    throw new Error(datos.mensaje ?? "No autenticado");
  }

  if (!respuesta.ok) {
    throw new Error(datos.mensaje ?? "Error en el servidor");
  }

  return datos as T;
}

export { API };
