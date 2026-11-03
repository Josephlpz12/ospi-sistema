import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Info, X, CircleAlert } from "lucide-react";

export type VarianteToast = "exito" | "error" | "info";

export type AvisoToast = {
  id: number;
  variante: VarianteToast;
  mensaje: string;
};

const DURACION: Record<VarianteToast, number> = { exito: 4000, error: 6000, info: 4000 };

const ICONO = {
  exito: CheckCircle2,
  error: CircleAlert,
  info: Info,
};

function Aviso({ aviso, onCerrar }: { aviso: AvisoToast; onCerrar: (id: number) => void }) {
  const [pausado, setPausado] = useState(false);
  const restante = useRef(DURACION[aviso.variante]);
  const inicio = useRef(0);
  const Icono = ICONO[aviso.variante];

  useEffect(() => {
    if (pausado) return;
    inicio.current = Date.now();
    const temporizador = window.setTimeout(() => onCerrar(aviso.id), restante.current);
    return () => {
      restante.current -= Date.now() - inicio.current;
      window.clearTimeout(temporizador);
    };
  }, [pausado, aviso.id, onCerrar]);

  return (
    <div
      className={`toast toast-${aviso.variante}`}
      role={aviso.variante === "error" ? "alert" : "status"}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <Icono size={18} aria-hidden />
      <p>{aviso.mensaje}</p>
      <button type="button" className="btn-text toast-cerrar" aria-label="Cerrar aviso" onClick={() => onCerrar(aviso.id)}>
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}

export function ContenedorToasts({ avisos, onCerrar }: { avisos: AvisoToast[]; onCerrar: (id: number) => void }) {
  if (avisos.length === 0) return null;
  return (
    <div className="toasts">
      {avisos.map((aviso) => (
        <Aviso key={aviso.id} aviso={aviso} onCerrar={onCerrar} />
      ))}
    </div>
  );
}
