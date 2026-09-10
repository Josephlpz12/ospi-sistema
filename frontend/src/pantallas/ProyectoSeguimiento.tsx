import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { obtenerProyecto } from "../servicios/proyectos.servicio";
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
import type { Avance, Empleado, Fase, Proyecto, Tarea } from "../tipos";

export function ProyectoSeguimiento() {
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
    setError("");
    try {
      await crearFase(idProyecto, { nombre: nombreFase });
      setNombreFase("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la fase");
    }
  }

  async function altaTarea(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await crearTarea(idProyecto, {
        titulo: tituloTarea,
        id_fase: idFaseTarea ? Number(idFaseTarea) : null,
        id_asignado: idAsignado ? Number(idAsignado) : null,
        fecha_limite: fechaLimite || null,
      });
      setTituloTarea("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la tarea");
    }
  }

  async function altaAvance(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await registrarAvance(idProyecto, { porcentaje: Number(pctAvance), comentario });
      setComentario("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el avance");
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
      <p>
        <Link to="/proyectos">← Proyectos</Link>
      </p>
      <h1>Seguimiento</h1>
      <p className="muted-line">
        {proyecto.codigo} · {proyecto.nombre} · {proyecto.nombre_cliente} · {Number(proyecto.porcentaje_avance)}%
      </p>
      {error ? <p className="alerta">{error}</p> : null}

      <div className="seguimiento-grid">
        <article className="card">
          <h2>Fases</h2>
          <form className="form-inline" onSubmit={(e) => void altaFase(e)}>
            <input value={nombreFase} onChange={(ev) => setNombreFase(ev.target.value)} placeholder="Nueva fase" required />
            <button className="btn" type="submit">
              Agregar
            </button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Fase</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fases.map((f) => (
                <tr key={f.id_fase}>
                  <td>{f.nombre}</td>
                  <td>
                    <select
                      value={f.estado}
                      onChange={(ev) => {
                        void actualizarFase(idProyecto, f.id_fase, { estado: ev.target.value }).then(cargar).catch((err: Error) => setError(err.message));
                      }}
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="EN_CURSO">En curso</option>
                      <option value="COMPLETADA">Completada</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-text"
                      onClick={() => {
                        if (confirm("¿Eliminar esta fase?")) {
                          void eliminarFase(idProyecto, f.id_fase).then(cargar).catch((err: Error) => setError(err.message));
                        }
                      }}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h2>Tareas</h2>
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
            <button className="btn" type="submit">
              Agregar tarea
            </button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Fase</th>
                <th>Estado</th>
                <th></th>
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
                    <select
                      value={t.estado}
                      onChange={(ev) => {
                        void actualizarTarea(idProyecto, t.id_tarea, { estado: ev.target.value }).then(cargar).catch((err: Error) => setError(err.message));
                      }}
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="EN_CURSO">En curso</option>
                      <option value="COMPLETADA">Completada</option>
                      <option value="BLOQUEADA">Bloqueada</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-text"
                      onClick={() => {
                        if (confirm("¿Eliminar esta tarea?")) {
                          void eliminarTarea(idProyecto, t.id_tarea).then(cargar).catch((err: Error) => setError(err.message));
                        }
                      }}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>

      <article className="card" style={{ marginTop: 20 }}>
        <h2>Bitácora de avance</h2>
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
            Registrar %
          </button>
        </form>
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
    </section>
  );
}
