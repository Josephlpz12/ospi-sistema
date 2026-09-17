import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { generarAlertas, listarAlertas, marcarAlertaLeida } from "../servicios/alertas.servicio";
import type { Alerta } from "../tipos";

function etiqueta(tipo: string) {
  if (tipo === "TAREA_VENCIDA") return "Tarea vencida";
  if (tipo === "AVANCE_BAJO") return "Avance bajo";
  return tipo;
}

export function AlertasLista() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [error, setError] = useState("");

  async function cargar() {
    setAlertas(await listarAlertas());
  }

  useEffect(() => {
    cargar().catch((err: Error) => setError(err.message));
  }, []);

  async function generar() {
    setError("");
    try {
      await generarAlertas();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron generar");
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Alertas</h1>
        <button type="button" className="btn" onClick={() => void generar()}>
          Generar alertas
        </button>
      </div>
      {error ? <p className="alerta">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Mensaje</th>
            <th>Proyecto</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((a) => (
            <tr key={a.id_alerta}>
              <td>{etiqueta(a.tipo)}</td>
              <td>{a.mensaje}</td>
              <td>
                {a.id_proyecto ? (
                  <Link to={`/proyectos/${a.id_proyecto}/seguimiento`}>{a.nombre_proyecto ?? a.codigo}</Link>
                ) : (
                  "—"
                )}
              </td>
              <td>{a.leida ? "Leída" : "Nueva"}</td>
              <td>
                {!a.leida ? (
                  <button
                    type="button"
                    className="btn-text"
                    onClick={() => void marcarAlertaLeida(a.id_alerta).then(cargar).catch((err: Error) => setError(err.message))}
                  >
                    Marcar leída
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {alertas.length === 0 ? (
        <p>No hay alertas. Use “Generar alertas” para revisar plazos y avances bajos.</p>
      ) : null}
    </section>
  );
}
