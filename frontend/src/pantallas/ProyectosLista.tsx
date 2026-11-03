import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { esAdministrador } from "../autorizacion";
import { useConfirmar } from "../contexto/ConfirmacionContexto";
import { useAuth } from "../contexto/AuthContexto";
import { useToast } from "../contexto/ToastContexto";
import { cancelarProyecto, listarProyectos } from "../servicios/proyectos.servicio";
import type { Proyecto } from "../tipos";

export function ProyectosLista() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const toast = useToast();
  const admin = esAdministrador(usuario?.nombre_rol);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);

  async function cargar() {
    try {
      setProyectos(await listarProyectos());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar");
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function cancelar(id: number) {
    const aceptado = await confirmar({
      titulo: "Cancelar proyecto",
      mensaje: "¿Cancelar este proyecto?",
      peligro: true,
      textoCancelar: "Volver",
      textoConfirmar: "Cancelar proyecto",
    });
    if (!aceptado) return;
    try {
      await cancelarProyecto(id);
      toast.exito("Proyecto cancelado");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar");
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Proyectos</h1>
        {admin ? (
          <Link className="btn" to="/proyectos/nuevo">
            Nuevo proyecto
          </Link>
        ) : null}
      </div>
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
                <Link to={`/proyectos/${p.id_proyecto}/seguimiento`}>Seguimiento</Link>
                {admin ? <Link to={`/proyectos/${p.id_proyecto}/editar`}>Editar</Link> : null}
                {admin && p.estado !== "Cancelado" ? (
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
