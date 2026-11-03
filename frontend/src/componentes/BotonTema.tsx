import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { aplicarTema, guardarTema, leerTema, type Tema } from "../tema";

export function BotonTema() {
  const [tema, setTema] = useState<Tema>(leerTema);

  function alternar() {
    const siguiente: Tema = tema === "dark" ? "light" : "dark";
    aplicarTema(siguiente);
    guardarTema(siguiente);
    setTema(siguiente);
  }

  const oscuro = tema === "dark";

  return (
    <button
      type="button"
      className="btn-tema"
      onClick={alternar}
      aria-label={oscuro ? "Usar tema claro" : "Usar tema oscuro"}
      title={oscuro ? "Tema claro" : "Tema oscuro"}
    >
      {oscuro ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  );
}
