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
                <td>{p.nombre}</td>
                <td>{p.nombre_cliente}</td>
                <td>{p.estado}</td>
                <td>{Number(p.porcentaje_avance)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
