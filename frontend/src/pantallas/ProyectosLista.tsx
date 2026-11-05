import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { esAdministrador } from "../autorizacion";
import { BarraAvance } from "../componentes/BarraAvance";
import { InsigniaEstado } from "../componentes/InsigniaEstado";
import { useConfirmar } from "../contexto/ConfirmacionContexto";
import { useAuth } from "../contexto/AuthContexto";
import { useToast } from "../contexto/ToastContexto";
import { activarProyecto, cancelarProyecto, listarProyectos } from "../servicios/proyectos.servicio";
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

  async function activar(id: number) {
    const aceptado = await confirmar({
      titulo: "Activar proyecto",
      mensaje: "¿Activar este proyecto? Volverá al estado Activo.",
    });
    if (!aceptado) return;
    try {
      await activarProyecto(id);
      toast.exito("Proyecto activado");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo activar");
    }
  }

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
      <table className="tabla-proyectos">
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
              <td className="codigo">{p.codigo}</td>
              <td>{p.nombre}</td>
              <td>{p.nombre_cliente}</td>
              <td>
                <InsigniaEstado estado={p.estado} />
              </td>
              <td className="dato-fuerte">
                <BarraAvance valor={p.porcentaje_avance} />
              </td>
              <td className="acciones">
                <Link className="btn btn-secundario btn-compacto" to={`/proyectos/${p.id_proyecto}/seguimiento`}>
                  Seguimiento
                </Link>
                {admin ? (
                  <Link className="btn btn-editar btn-compacto" to={`/proyectos/${p.id_proyecto}/editar`}>
                    Editar
                  </Link>
                ) : null}
                {admin && p.estado === "Cancelado" ? (
                  <button type="button" className="btn btn-positivo btn-compacto" onClick={() => void activar(p.id_proyecto)}>
                    Activar
                  </button>
                ) : null}
                {admin && p.estado !== "Cancelado" ? (
                  <button type="button" className="btn btn-peligro btn-compacto" onClick={() => void cancelar(p.id_proyecto)}>
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
