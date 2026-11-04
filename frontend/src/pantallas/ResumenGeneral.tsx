import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { dinero, fechaHoyArchivo, imprimirConTitulo, momentoActual, nombreCliente } from "../formatoFinanciero";
import { obtenerResumenGeneral } from "../servicios/finanzas.servicio";
import type { ResumenGeneralFila } from "../tipos";

function redondear(valor: number) {
  return Math.round(valor * 100) / 100;
}

export function ResumenGeneral() {
  const [filas, setFilas] = useState<ResumenGeneralFila[] | null>(null);
  const [generadoEn, setGeneradoEn] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    obtenerResumenGeneral()
      .then((respuesta) => {
        if (!vigente) return;
        setFilas(respuesta);
        setGeneradoEn(momentoActual());
      })
      .catch((err: Error) => {
        if (vigente) setError(err.message);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const visibles = useMemo(() => {
    if (!filas) return [];
    const texto = busqueda.trim().toLocaleLowerCase("es");
    const filtradas = texto
      ? filas.filter((fila) => nombreCliente(fila).toLocaleLowerCase("es").includes(texto))
      : filas;
    return [...filtradas].sort((a, b) => b.saldo - a.saldo || nombreCliente(a).localeCompare(nombreCliente(b), "es"));
  }, [filas, busqueda]);

  const totales = useMemo(() => {
    const grupos = new Map<string, { moneda: string; contratado: number; pagado: number; saldo: number }>();
    for (const fila of visibles) {
      const actual = grupos.get(fila.moneda) ?? { moneda: fila.moneda, contratado: 0, pagado: 0, saldo: 0 };
      actual.contratado += fila.contratado;
      actual.pagado += fila.pagado;
      actual.saldo += fila.saldo;
      grupos.set(fila.moneda, actual);
    }
    return [...grupos.values()].map((grupo) => ({
      moneda: grupo.moneda,
      contratado: redondear(grupo.contratado),
      pagado: redondear(grupo.pagado),
      saldo: redondear(grupo.saldo),
    }));
  }, [visibles]);

  if (!filas) {
    return (
      <section>
        {error ? <p className="alerta">{error}</p> : <p>Cargando resumen…</p>}
      </section>
    );
  }

  return (
    <section className="resumen-financiero">
      <p className="solo-imprimir resumen-impresion">
        <span className="dato-fuerte">OSPI</span>
        <span>Generado: {generadoEn}</span>
      </p>
      <div className="page-head">
        <h1>Resumen general</h1>
        <button
          type="button"
          className="btn no-imprimir"
          onClick={() => imprimirConTitulo(`OSPI - Resumen general ${fechaHoyArchivo()}`)}
        >
          Imprimir
        </button>
      </div>
      <div className="filtros-bitacora no-imprimir">
        <label>
          Buscar
          <input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
        </label>
      </div>
      {visibles.length === 0 ? (
        <p>{filas.length === 0 ? "No hay clientes con contratos." : "No hay clientes que coincidan con la búsqueda."}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contratado</th>
              <th>Pagado</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((fila) => (
              <tr key={`${fila.id_cliente}-${fila.moneda}`}>
                <td>
                  <Link
                    to={`/clientes/${fila.id_cliente}/resumen-financiero`}
                    state={{ origen: "resumen-general" }}
                  >
                    {nombreCliente(fila)}
                  </Link>
                  {fila.en_mora ? <span className="insignia insignia-peligro">En mora</span> : null}
                </td>
                <td>{dinero(fila.contratado)}</td>
                <td>{dinero(fila.pagado)}</td>
                <td className="dato-fuerte">{dinero(fila.saldo)}</td>
              </tr>
            ))}
            {totales.map((total) => (
              <tr key={`total-${total.moneda}`}>
                <td className="dato-fuerte">Total {total.moneda}</td>
                <td className="dato-fuerte">{dinero(total.contratado)}</td>
                <td className="dato-fuerte">{dinero(total.pagado)}</td>
                <td className="dato-fuerte">{dinero(total.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
