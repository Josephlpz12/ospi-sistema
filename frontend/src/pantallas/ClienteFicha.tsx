import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ListaDocumentos } from "../componentes/ListaDocumentos";
import { obtenerFichaCliente } from "../servicios/clientes.servicio";
import type { Cliente, Proyecto } from "../tipos";

function nombreVisible(c: Cliente) {
  if (c.tipo_cliente === "EMPRESA") return c.razon_social ?? "Empresa";
  return `${c.nombres ?? ""} ${c.apellidos ?? ""}`.trim();
}

export function ClienteFicha() {
  const { id } = useParams();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    obtenerFichaCliente(Number(id))
      .then((datos) => {
        setCliente(datos.cliente);
        setProyectos(datos.proyectos);
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (!cliente) {
    return (
      <section>
        {error ? <p className="alerta">{error}</p> : <p>Cargando cliente…</p>}
      </section>
    );
  }

  return (
    <section>
      <p>
        <Link to="/clientes">← Clientes</Link>
      </p>
      <div className="page-head">
        <h1>{nombreVisible(cliente)}</h1>
        <Link className="btn" to={`/clientes/${cliente.id_cliente}/editar`}>
          Editar
        </Link>
      </div>
      {error ? <p className="alerta">{error}</p> : null}
      <p className="muted-line">
        {cliente.tipo_cliente === "EMPRESA" ? "Empresa" : "Individual"} · {cliente.estado}
      </p>

      <h2>Proyectos</h2>
      {proyectos.length === 0 ? (
        <p>Este cliente no tiene proyectos.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
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
                <td>{p.estado}</td>
                <td>{Number(p.porcentaje_avance)}%</td>
                <td className="acciones">
                  <Link to={`/proyectos/${p.id_proyecto}/seguimiento`}>Seguimiento</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 20 }}>
        <ListaDocumentos id_cliente={cliente.id_cliente} />
      </div>
    </section>
  );
}
