import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ContenedorToasts, type AvisoToast } from "../componentes/ContenedorToasts";

type ApiToast = {
  exito: (mensaje: string) => void;
  error: (mensaje: string) => void;
  info: (mensaje: string) => void;
};

const ToastContexto = createContext<ApiToast | null>(null);

export function ToastProveedor({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<AvisoToast[]>([]);

  const mostrar = useCallback((variante: AvisoToast["variante"], mensaje: string) => {
    setAvisos((lista) => [...lista, { id: Date.now() + Math.random(), variante, mensaje }]);
  }, []);

  const quitar = useCallback((id: number) => {
    setAvisos((lista) => lista.filter((aviso) => aviso.id !== id));
  }, []);

  const api = useMemo<ApiToast>(
    () => ({
      exito: (mensaje) => mostrar("exito", mensaje),
      error: (mensaje) => mostrar("error", mensaje),
      info: (mensaje) => mostrar("info", mensaje),
    }),
    [mostrar],
  );

  return (
    <ToastContexto.Provider value={api}>
      {children}
      <ContenedorToasts avisos={avisos} onCerrar={quitar} />
    </ToastContexto.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContexto);
  if (!contexto) throw new Error("useToast debe usarse dentro de ToastProveedor");
  return contexto;
}
