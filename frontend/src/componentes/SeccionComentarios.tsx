import { type FormEvent, useEffect, useState } from "react";
import { crearComentario, listarComentarios } from "../servicios/seguimiento.servicio";
import type { Comentario, Tarea } from "../tipos";

type Props = {
  idProyecto: number;
  tareas: Tarea[];
  puedeComentar: boolean;
};

export function SeccionComentarios({ idProyecto, tareas, puedeComentar }: Props) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [error, setError] = useState("");
  const [texto, setTexto] = useState("");
  const [idTarea, setIdTarea] = useState("");

  async function cargar() {
    setComentarios(await listarComentarios(idProyecto));
  }

  useEffect(() => {
    cargar().catch((err: Error) => setError(err.message));
  }, [idProyecto, tareas.length]);

  async function comentar(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await crearComentario(idProyecto, { texto, id_tarea: idTarea ? Number(idTarea) : null });
      setTexto("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el comentario");
    }
  }

  return (
    <details className="card seccion-plegable">
      <summary>Comentarios ({comentarios.length})</summary>
      {error ? <p className="alerta">{error}</p> : null}
      <ul className="lista-comentarios">
        {comentarios.map((c) => (
          <li key={c.id_comentario}>
            <p className="comentario-cabecera">
              <strong>{c.nombre_usuario ?? "Usuario eliminado"}</strong> ·{" "}
              {new Date(c.creado_en).toLocaleString("es-GT", { timeZone: "America/Guatemala" })}
              {c.titulo_tarea ? ` · Tarea: ${c.titulo_tarea}` : " · Proyecto"}
            </p>
            <p className="comentario-texto">{c.texto}</p>
          </li>
        ))}
      </ul>
      {comentarios.length === 0 ? <p>Aún no hay comentarios.</p> : null}
      {puedeComentar ? (
        <form className="form" onSubmit={(e) => void comentar(e)}>
          <select value={idTarea} onChange={(ev) => setIdTarea(ev.target.value)}>
            <option value="">Comentar en todo el proyecto</option>
            {tareas.map((t) => (
              <option key={t.id_tarea} value={t.id_tarea}>
                Tarea: {t.titulo}
              </option>
            ))}
          </select>
          <textarea
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
            placeholder="Escriba un comentario"
            maxLength={2000}
            rows={3}
            required
          />
          <div className="form-actions">
            <button className="btn" type="submit">
              Comentar
            </button>
          </div>
        </form>
      ) : null}
    </details>
  );
}
