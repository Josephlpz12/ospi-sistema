import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cancelarProyecto, listarProyectos } from "../servicios/proyectos.servicio";
import type { Proyecto } from "../tipos";

export function ProyectosLista() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [error, setError] = useState("");

  async function cargar() {
    try {
      setProyectos(await listarProyectos());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function cancelar(id: number) {
    if (!confirm("¿Cancelar este proyecto?")) return;
    try {
      await cancelarProyecto(id);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar");
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Proyectos</h1>
        <Link className="btn" to="/proyectos/nuevo">
          Nuevo proyecto
        </Link>
      </div>
      {error ? <p className="alerta">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Avance</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {proyectos.map((p) => (
            <tr key={p.id_proyecto}>
              <td>{p.codigo}</td>
              <td>{p.nombre}</td>
              <td>{p.nombre_cliente}</td>
              <td>{p.estado}</td>
              <td>{Number(p.porcentaje_avance)}%</td>
              <td className="acciones">
                <Link to={`/proyectos/${p.id_proyecto}/editar`}>Editar</Link>
                {p.estado !== "Cancelado" ? (
                  <button type="button" className="btn-text" onClick={() => void cancelar(p.id_proyecto)}>
                    Cancelar
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {proyectos.length === 0 ? <p>No hay proyectos registrados.</p> : null}
    </section>
  );
}
