import { useEffect, useId, useRef } from "react";

type Props = {
  titulo: string;
  mensaje: string;
  peligro: boolean;
  textoConfirmar: string;
  textoCancelar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export function CuadroConfirmacion({
  titulo,
  mensaje,
  peligro,
  textoConfirmar,
  textoCancelar,
  onConfirmar,
  onCancelar,
}: Props) {
  const tituloId = useId();
  const mensajeId = useId();
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);

  useEffect(() => {
    focoPrevio.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmarRef.current?.focus();

    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onCancelar();
        return;
      }
      if (evento.key === "Enter") {
        evento.preventDefault();
        onConfirmar();
        return;
      }
      if (evento.key !== "Tab") return;
      const primero = cancelarRef.current;
      const ultimo = confirmarRef.current;
      if (!primero || !ultimo) return;
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("keydown", tecla);
      focoPrevio.current?.focus();
    };
  }, [onCancelar, onConfirmar]);

  return (
    <div className="modal-fondo" onMouseDown={onCancelar}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={mensajeId}
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <h2 id={tituloId}>{titulo}</h2>
        <p id={mensajeId}>{mensaje}</p>
        <div className="form-actions modal-acciones">
          <button ref={cancelarRef} type="button" className="btn btn-secundario" onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button ref={confirmarRef} type="button" className={peligro ? "btn btn-peligro" : "btn"} onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
