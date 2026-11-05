export function BarraAvance({ valor }: { valor: string | number }) {
  const porcentaje = Number(valor);
  const ancho = Number.isFinite(porcentaje) ? Math.min(100, Math.max(0, porcentaje)) : 0;
  const nivel = ancho >= 100 ? "completo" : ancho >= 40 ? "medio" : "bajo";
  return (
    <span className="barra-avance">
      <span className="barra-avance-pista" aria-hidden>
        <span className={`barra-avance-relleno barra-avance-${nivel}`} style={{ width: `${ancho}%` }} />
      </span>
      <span>{Number.isFinite(porcentaje) ? porcentaje : 0}%</span>
    </span>
  );
}
