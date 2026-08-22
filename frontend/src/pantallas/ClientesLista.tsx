import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { inactivarCliente, listarClientes } from "../servicios/clientes.servicio";
import type { Cliente } from "../tipos";

function nombreVisible(c: Cliente) {
  if (c.tipo_cliente === "EMPRESA") return c.razon_social ?? "Empresa";
  return `${c.nombres ?? ""} ${c.apellidos ?? ""}`.trim();
}

export function ClientesLista() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [error, setError] = useState("");

  async function cargar() {
    try {
      setClientes(await listarClientes());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function inactivar(id: number) {
    if (!confirm("¿Inactivar este cliente?")) return;
    try {
      await inactivarCliente(id);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo inactivar");
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Clientes</h1>
        <Link className="btn" to="/clientes/nuevo">
          Nuevo cliente
        </Link>
      </div>
      {error ? <p className="alerta">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id_cliente}>
              <td>{nombreVisible(c)}</td>
              <td>{c.tipo_cliente === "EMPRESA" ? "Empresa" : "Individual"}</td>
              <td>{c.estado}</td>
              <td className="acciones">
                <Link to={`/clientes/${c.id_cliente}/editar`}>Editar</Link>
                {c.estado !== "INACTIVO" ? (
                  <button type="button" className="btn-text" onClick={() => void inactivar(c.id_cliente)}>
                    Inactivar
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {clientes.length === 0 ? <p>No hay clientes registrados.</p> : null}
    </section>
  );
}
