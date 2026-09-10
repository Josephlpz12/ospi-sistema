import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarClientes } from "../servicios/clientes.servicio";
import { listarProyectos } from "../servicios/proyectos.servicio";
import type { Proyecto } from "../tipos";

export function Panel() {
  const [clientes, setClientes] = useState(0);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listarClientes(), listarProyectos()])
      .then(([listaClientes, listaProyectos]) => {
        setClientes(listaClientes.length);
        setProyectos(listaProyectos);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const activos = proyectos.filter((p) => p.estado === "Activo").length;
  const hoy = new Date();
  const limite = new Date();
  limite.setDate(hoy.getDate() + 14);
  const atencion = proyectos.filter((p) => {
    if (p.estado === "Cancelado" || p.estado === "Entregado") return false;
    const bajo = Number(p.porcentaje_avance) < 40;
    if (!p.fecha_fin_plan) return bajo;
    const fin = new Date(p.fecha_fin_plan);
    return bajo || fin <= limite;
  });

  return (
    <section>
      <h1>Panel</h1>
      {error ? <p className="alerta">{error}</p> : null}
      <div className="stats">
        <article className="card stat">
          <span>Clientes</span>
          <strong>{clientes}</strong>
        </article>
        <article className="card stat">
          <span>Proyectos</span>
          <strong>{proyectos.length}</strong>
        </article>
        <article className="card stat">
          <span>Activos</span>
          <strong>{activos}</strong>
        </article>
      </div>
      <h2>Últimos proyectos</h2>
      {proyectos.length === 0 ? (
        <p>
          Aún no hay proyectos. <Link to="/proyectos/nuevo">Crear uno</Link>
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Avance</th>
            </tr>
          </thead>
          <tbody>
            {proyectos.slice(0, 5).map((p) => (
              <tr key={p.id_proyecto}>
                <td>{p.codigo}</td>
                <td>
                  <Link to={`/proyectos/${p.id_proyecto}/seguimiento`}>{p.nombre}</Link>
                </td>
                <td>{p.nombre_cliente}</td>
                <td>{p.estado}</td>
                <td>{Number(p.porcentaje_avance)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {atencion.length > 0 ? (
        <>
          <h2>Requieren atención</h2>
          <p>Avance menor a 40% o fecha de fin en los próximos 14 días.</p>
          <table>
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Fin plan</th>
                <th>Avance</th>
              </tr>
            </thead>
            <tbody>
              {atencion.map((p) => (
                <tr key={p.id_proyecto}>
                  <td>
                    <Link to={`/proyectos/${p.id_proyecto}/seguimiento`}>{p.nombre}</Link>
                  </td>
                  <td>{p.fecha_fin_plan ? String(p.fecha_fin_plan).slice(0, 10) : "—"}</td>
                  <td>{Number(p.porcentaje_avance)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
