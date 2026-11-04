import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EnlaceVolver } from "../componentes/EnlaceVolver";
import { esAdministrador, puedeActualizarSeguimiento } from "../autorizacion";
import { useConfirmar } from "../contexto/ConfirmacionContexto";
import { useAuth } from "../contexto/AuthContexto";
import { useToast } from "../contexto/ToastContexto";
import { activarProyecto, obtenerProyecto } from "../servicios/proyectos.servicio";
import {
  actualizarFase,
  actualizarTarea,
  crearFase,
  crearTarea,
  eliminarFase,
  eliminarTarea,
  listarAvances,
  listarEmpleados,
  listarFases,
  listarTareas,
  registrarAvance,
} from "../servicios/seguimiento.servicio";
import { InsigniaEstado } from "../componentes/InsigniaEstado";
import { ListaDocumentos } from "../componentes/ListaDocumentos";
import { SeccionAsignaciones } from "../componentes/SeccionAsignaciones";
import { SeccionComentarios } from "../componentes/SeccionComentarios";
import type { Avance, Empleado, Fase, Proyecto, Tarea } from "../tipos";

export function ProyectoSeguimiento() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const toast = useToast();
  const admin = esAdministrador(usuario?.nombre_rol);
  const puedeEstado = puedeActualizarSeguimiento(usuario?.nombre_rol);
  const { id } = useParams();
  const idProyecto = Number(id);
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [fases, setFases] = useState<Fase[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [avances, setAvances] = useState<Avance[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [error, setError] = useState("");
  const [nombreFase, setNombreFase] = useState("");
  const [tituloTarea, setTituloTarea] = useState("");
  const [idFaseTarea, setIdFaseTarea] = useState("");
  const [idAsignado, setIdAsignado] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [pctAvance, setPctAvance] = useState("0");
  const [comentario, setComentario] = useState("");

  async function cargar() {
    const [p, f, t, a, e] = await Promise.all([
      obtenerProyecto(idProyecto),
      listarFases(idProyecto),
      listarTareas(idProyecto),
      listarAvances(idProyecto),
      listarEmpleados().catch(() => [] as Empleado[]),
    ]);
    setProyecto(p);
    setFases(f);
    setTareas(t);
    setAvances(a);
    setEmpleados(e);
    setPctAvance(String(Number(p.porcentaje_avance)));
  }

  useEffect(() => {
    if (!idProyecto) return;
    cargar().catch((err: Error) => setError(err.message));
  }, [idProyecto]);

  async function altaFase(e: FormEvent) {
    e.preventDefault();
    try {
      await crearFase(idProyecto, { nombre: nombreFase });
      toast.exito("Fase agregada");
      setNombreFase("");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la fase");
    }
  }

  async function altaTarea(e: FormEvent) {
    e.preventDefault();
    try {
      await crearTarea(idProyecto, {
        titulo: tituloTarea,
        id_fase: idFaseTarea ? Number(idFaseTarea) : null,
        id_asignado: idAsignado ? Number(idAsignado) : null,
        fecha_limite: fechaLimite || null,
      });
      toast.exito("Tarea agregada");
      setTituloTarea("");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la tarea");
    }
  }

  async function altaAvance(e: FormEvent) {
    e.preventDefault();
    try {
      await registrarAvance(idProyecto, { porcentaje: Number(pctAvance), comentario });
      toast.exito("Avance registrado");
      setComentario("");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar el avance");
    }
  }

  async function quitarFase(idFase: number) {
    const aceptado = await confirmar({
      titulo: "Eliminar fase",
      mensaje: "¿Eliminar esta fase?",
      peligro: true,
    });
    if (!aceptado) return;
    try {
      await eliminarFase(idProyecto, idFase);
      toast.exito("Fase eliminada");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar la fase");
    }
  }

  async function quitarTarea(idTarea: number) {
    const aceptado = await confirmar({
      titulo: "Eliminar tarea",
      mensaje: "¿Eliminar esta tarea?",
      peligro: true,
    });
    if (!aceptado) return;
    try {
      await eliminarTarea(idProyecto, idTarea);
      toast.exito("Tarea eliminada");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar la tarea");
    }
  }

  async function activar() {
    if (!proyecto) return;
    const aceptado = await confirmar({
      titulo: "Activar proyecto",
      mensaje: "¿Activar este proyecto? Volverá al estado Activo.",
    });
    if (!aceptado) return;
    try {
      await activarProyecto(proyecto.id_proyecto);
      toast.exito("Proyecto activado");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo activar");
    }
  }

  if (!proyecto) {
    return (
      <section>
        {error ? <p className="alerta">{error}</p> : <p>Cargando seguimiento…</p>}
      </section>
    );
  }

  return (
    <section>
      <EnlaceVolver to="/proyectos">Proyectos</EnlaceVolver>
      <div className="page-head">
        <h1>{proyecto.nombre}</h1>
        {admin && proyecto.estado === "Cancelado" ? (
          <button type="button" className="btn btn-positivo" onClick={() => void activar()}>
            Activar
          </button>
        ) : null}
      </div>
      <div className="resumen-ficha">
        <div>
          <span className="dato-etiqueta">Estado</span>
          <InsigniaEstado estado={proyecto.estado} />
        </div>
        <div>
          <span className="dato-etiqueta">Avance</span>
          <span className="dato-clave">{Number(proyecto.porcentaje_avance)}%</span>
        </div>
        <div>
          <span className="dato-etiqueta">Cliente</span>
          <Link to={`/clientes/${proyecto.id_cliente}`}>{proyecto.nombre_cliente}</Link>
        </div>
        <div>
          <span className="dato-etiqueta">Código</span>
          <span>{proyecto.codigo}</span>
        </div>
      </div>
      {proyecto.resumen ? (
        <p className="dato-secundario">
          {proyecto.resumen.fases} fases · {proyecto.resumen.tareas_abiertas} tareas abiertas
        </p>
      ) : null}
      <div className="seguimiento-grid">
        <article className="card">
          <h2>Fases</h2>
          {admin ? (
            <form className="form-inline" onSubmit={(e) => void altaFase(e)}>
              <input value={nombreFase} onChange={(ev) => setNombreFase(ev.target.value)} placeholder="Nueva fase" required />
              <button className="btn btn-secundario" type="submit">
                Agregar fase
              </button>
            </form>
          ) : null}
          <table>
            <thead>
              <tr>
                <th>Fase</th>
                <th>Estado</th>
                {admin ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {fases.map((f) => (
                <tr key={f.id_fase}>
                  <td>{f.nombre}</td>
                  <td>
                    <div className="acciones">
                      <InsigniaEstado estado={f.estado} />
                      {puedeEstado ? (
                        <select
                          value={f.estado}
                          onChange={(ev) => {
                            void actualizarFase(idProyecto, f.id_fase, { estado: ev.target.value })
                              .then(() => {
                                toast.exito("Estado de la fase actualizado");
                                return cargar();
                              })
                              .catch((err: Error) => toast.error(err.message));
                          }}
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="EN_CURSO">En curso</option>
                          <option value="COMPLETADA">Completada</option>
                        </select>
                      ) : null}
                    </div>
                  </td>
                  {admin ? (
                    <td>
                      <button
                        type="button"
                        className="btn btn-peligro btn-compacto"
                        onClick={() => void quitarFase(f.id_fase)}
                      >
                        Quitar
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h2>Tareas</h2>
          {admin ? (
          <form className="form" onSubmit={(e) => void altaTarea(e)}>
            <input value={tituloTarea} onChange={(ev) => setTituloTarea(ev.target.value)} placeholder="Título" required />
            <select value={idFaseTarea} onChange={(ev) => setIdFaseTarea(ev.target.value)}>
              <option value="">Sin fase</option>
              {fases.map((f) => (
                <option key={f.id_fase} value={f.id_fase}>
                  {f.nombre}
                </option>
              ))}
            </select>
            <select value={idAsignado} onChange={(ev) => setIdAsignado(ev.target.value)}>
              <option value="">Sin responsable</option>
              {empleados.map((em) => (
                <option key={em.id_empleado} value={em.id_empleado}>
                  {em.nombres} {em.apellidos}
                </option>
              ))}
            </select>
            <input type="date" value={fechaLimite} onChange={(ev) => setFechaLimite(ev.target.value)} />
            <button className="btn btn-secundario" type="submit">
              Agregar tarea
            </button>
          </form>
          ) : null}
          <table>
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Fase</th>
                <th>Estado</th>
                {admin ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {tareas.map((t) => (
                <tr key={t.id_tarea}>
                  <td>
                    {t.titulo}
                    <br />
                    <small>
                      {t.nombre_asignado || "Sin asignar"}
                      {t.fecha_limite ? ` · ${String(t.fecha_limite).slice(0, 10)}` : ""}
                    </small>
                  </td>
                  <td>{t.nombre_fase ?? "—"}</td>
                  <td>
                    <div className="acciones">
                      <InsigniaEstado estado={t.estado} />
                      {puedeEstado ? (
                        <select
                          value={t.estado}
                          onChange={(ev) => {
                            void actualizarTarea(idProyecto, t.id_tarea, { estado: ev.target.value })
                              .then(() => {
                                toast.exito("Estado de la tarea actualizado");
                                return cargar();
                              })
                              .catch((err: Error) => toast.error(err.message));
                          }}
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="EN_CURSO">En curso</option>
                          <option value="COMPLETADA">Completada</option>
                          <option value="BLOQUEADA">Bloqueada</option>
                        </select>
                      ) : null}
                    </div>
                  </td>
                  {admin ? (
                    <td>
                      <button
                        type="button"
                        className="btn btn-peligro btn-compacto"
                        onClick={() => void quitarTarea(t.id_tarea)}
                      >
                        Quitar
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>

      <article className="card" style={{ marginTop: 20 }}>
        <h2>Bitácora de avance</h2>
        {puedeEstado ? (
        <form className="form-inline" onSubmit={(e) => void altaAvance(e)}>
          <input
            type="number"
            min={0}
            max={100}
            value={pctAvance}
            onChange={(ev) => setPctAvance(ev.target.value)}
            required
          />
          <input value={comentario} onChange={(ev) => setComentario(ev.target.value)} placeholder="Comentario" />
          <button className="btn" type="submit">
            Registrar avance
          </button>
        </form>
        ) : null}
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>%</th>
              <th>Comentario</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {avances.map((a) => (
              <tr key={a.id_avance}>
                <td>{new Date(a.registrado_en).toLocaleString("es-GT")}</td>
                <td>{Number(a.porcentaje)}%</td>
                <td>{a.comentario}</td>
                <td>{a.nombre_usuario}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <SeccionAsignaciones idProyecto={idProyecto} tareas={tareas} empleados={empleados} puedeAsignar={admin} />
      <SeccionComentarios idProyecto={idProyecto} tareas={tareas} puedeComentar={puedeEstado} />

      <div style={{ marginTop: 20 }}>
        <ListaDocumentos id_proyecto={idProyecto} />
      </div>
    </section>
  );
}
