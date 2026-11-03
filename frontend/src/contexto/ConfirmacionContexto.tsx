import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CuadroConfirmacion } from "../componentes/CuadroConfirmacion";

export type OpcionesConfirmacion = {
  titulo: string;
  mensaje: string;
  peligro?: boolean;
  textoConfirmar?: string;
  textoCancelar?: string;
};

type Pendiente = OpcionesConfirmacion & { resolver: (valor: boolean) => void };

const ConfirmacionContexto = createContext<((opciones: OpcionesConfirmacion) => Promise<boolean>) | null>(null);

export function ConfirmacionProveedor({ children }: { children: ReactNode }) {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const pendienteRef = useRef<Pendiente | null>(null);
  pendienteRef.current = pendiente;

  const confirmar = useCallback((opciones: OpcionesConfirmacion) => {
    return new Promise<boolean>((resolver) => {
      setPendiente((actual) => {
        actual?.resolver(false);
        return { ...opciones, resolver };
      });
    });
  }, []);

  const cerrar = useCallback((valor: boolean) => {
    pendienteRef.current?.resolver(valor);
    pendienteRef.current = null;
    setPendiente(null);
  }, []);
  const aceptar = useCallback(() => cerrar(true), [cerrar]);
  const rechazar = useCallback(() => cerrar(false), [cerrar]);

  return (
    <ConfirmacionContexto.Provider value={confirmar}>
      {children}
      {pendiente ? (
        <CuadroConfirmacion
          titulo={pendiente.titulo}
          mensaje={pendiente.mensaje}
          peligro={pendiente.peligro === true}
          textoConfirmar={pendiente.textoConfirmar ?? "Confirmar"}
          textoCancelar={pendiente.textoCancelar ?? "Cancelar"}
          onConfirmar={aceptar}
          onCancelar={rechazar}
        />
      ) : null}
    </ConfirmacionContexto.Provider>
  );
}

export function useConfirmar() {
  const confirmar = useContext(ConfirmacionContexto);
  if (!confirmar) throw new Error("useConfirmar debe usarse dentro de ConfirmacionProveedor");
  return confirmar;
}
