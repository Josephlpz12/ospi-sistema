import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { UsuarioSesion } from "../tipos";
import { borrarSesion, leerToken, leerUsuarioGuardado } from "../servicios/api";
import { iniciarSesion as loginApi } from "../servicios/auth.servicio";

type AuthEstado = {
  usuario: UsuarioSesion | null;
  autenticado: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContexto = createContext<AuthEstado | null>(null);

export function AuthProveedor({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(
    () => (leerToken() ? (leerUsuarioGuardado() as UsuarioSesion | null) : null),
  );

  const valor = useMemo<AuthEstado>(
    () => ({
      usuario,
      autenticado: Boolean(usuario && leerToken()),
      login: async (nombre, password) => {
        const sesion = await loginApi(nombre, password);
        setUsuario(sesion);
      },
      logout: () => {
        borrarSesion();
        setUsuario(null);
      },
    }),
    [usuario],
  );

  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContexto);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProveedor");
  return ctx;
}
