import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarProyectosActivos } from "../servicios/monitoreo.servicio";
import type { ProyectoMonitoreo } from "../tipos";

function fecha(valor: string | null) {
  return valor ? valor.slice(0, 10) : "Sin plazo";
}

export function Monitoreo() {
  const [proyectos, setProyectos] = useState<ProyectoMonitoreo[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listarProyectosActivos()
      .then(setProyectos)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section>
      <h1>Monitoreo</h1>
      <p className="muted-line">Todos los proyectos en estado Activo (no es el recorte “Requieren atención”).</p>
      {error ? <p className="alerta">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Proyecto</th>
            <th>Cliente</th>
            <th>Responsable</th>
            <th>Plazo</th>
            <th>Avance</th>
          </tr>
        </thead>
        <tbody>
          {proyectos.map((p) => (
            <tr key={p.id_proyecto}>
              <td>{p.codigo}</td>
              <td>
                <Link to={`/proyectos/${p.id_proyecto}/seguimiento`}>{p.nombre}</Link>
              </td>
              <td>
                <Link to={`/clientes/${p.id_cliente}`}>{p.nombre_cliente}</Link>
              </td>
              <td>{p.nombre_responsable?.trim() ? p.nombre_responsable : "Sin asignar"}</td>
              <td>{fecha(p.fecha_fin_plan)}</td>
              <td>{Number(p.porcentaje_avance)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {proyectos.length === 0 && !error ? <p>No hay proyectos activos.</p> : null}
    </section>
  );
}
