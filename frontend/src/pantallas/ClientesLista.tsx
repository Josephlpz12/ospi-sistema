import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { esAdministrador } from "../autorizacion";
import { useConfirmar } from "../contexto/ConfirmacionContexto";
import { useAuth } from "../contexto/AuthContexto";
import { useToast } from "../contexto/ToastContexto";
import { inactivarCliente, listarClientes } from "../servicios/clientes.servicio";
import type { Cliente } from "../tipos";

function nombreVisible(c: Cliente) {
  if (c.tipo_cliente === "EMPRESA") return c.razon_social ?? "Empresa";
  return `${c.nombres ?? ""} ${c.apellidos ?? ""}`.trim();
}

export function ClientesLista() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const toast = useToast();
  const admin = esAdministrador(usuario?.nombre_rol);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  async function cargar() {
    try {
      setClientes(await listarClientes());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar");
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function inactivar(id: number) {
    const aceptado = await confirmar({
      titulo: "Inactivar cliente",
      mensaje: "¿Inactivar este cliente?",
      peligro: true,
    });
    if (!aceptado) return;
    try {
      await inactivarCliente(id);
      toast.exito("Cliente inactivado");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo inactivar");
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Clientes</h1>
        {admin ? (
          <Link className="btn" to="/clientes/nuevo">
            Nuevo cliente
          </Link>
        ) : null}
      </div>
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
                <Link to={`/clientes/${c.id_cliente}`}>Ver</Link>
                {admin ? <Link to={`/clientes/${c.id_cliente}/editar`}>Editar</Link> : null}
                {admin && c.estado !== "INACTIVO" ? (
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
