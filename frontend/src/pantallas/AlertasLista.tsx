import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../contexto/ToastContexto";
import { generarAlertas, listarAlertas, marcarAlertaLeida } from "../servicios/alertas.servicio";
import type { Alerta } from "../tipos";

function etiqueta(tipo: string) {
  if (tipo === "TAREA_VENCIDA") return "Tarea vencida";
  if (tipo === "AVANCE_BAJO") return "Avance bajo";
  if (tipo === "FACTURA_VENCIDA") return "Factura vencida";
  if (tipo === "SERVICIO_SUSPENDIDO") return "Servicio suspendido";
  return tipo;
}

export function AlertasLista() {
  const toast = useToast();
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  async function cargar() {
    setAlertas(await listarAlertas());
  }

  useEffect(() => {
    cargar().catch((err: Error) => toast.error(err.message));
  }, []);

  async function generar() {
    try {
      await generarAlertas();
      toast.exito("Alertas generadas");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron generar");
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
                    onClick={() =>
                      void marcarAlertaLeida(a.id_alerta)
                        .then(() => {
                          toast.exito("Alerta marcada como leída");
                          return cargar();
                        })
                        .catch((err: Error) => toast.error(err.message))
                    }
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
