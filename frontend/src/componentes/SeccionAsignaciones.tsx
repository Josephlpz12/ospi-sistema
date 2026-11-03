import { type FormEvent, useEffect, useState } from "react";
import { useConfirmar } from "../contexto/ConfirmacionContexto";
import { useToast } from "../contexto/ToastContexto";
import { asignarEmpleado, listarAsignaciones, quitarAsignacion } from "../servicios/seguimiento.servicio";
import type { Asignacion, Empleado, Tarea } from "../tipos";

type Props = {
  idProyecto: number;
  tareas: Tarea[];
  empleados: Empleado[];
  puedeAsignar: boolean;
};

export function SeccionAsignaciones({ idProyecto, tareas, empleados, puedeAsignar }: Props) {
  const confirmar = useConfirmar();
  const toast = useToast();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [idEmpleado, setIdEmpleado] = useState("");
  const [idTarea, setIdTarea] = useState("");
  const [rol, setRol] = useState("Miembro del equipo");

  async function cargar() {
    setAsignaciones(await listarAsignaciones(idProyecto));
  }

  useEffect(() => {
    cargar().catch((err: Error) => toast.error(err.message));
  }, [idProyecto, tareas.length]);

  async function asignar(e: FormEvent) {
    e.preventDefault();
    try {
      await asignarEmpleado(idProyecto, {
        id_empleado: Number(idEmpleado),
        id_tarea: idTarea ? Number(idTarea) : null,
        rol_en_proyecto: rol,
      });
      toast.exito("Empleado asignado");
      setIdEmpleado("");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo asignar");
    }
  }

  async function quitar(a: Asignacion) {
    const destino = a.titulo_tarea ? `la tarea «${a.titulo_tarea}»` : "el proyecto";
    const aceptado = await confirmar({
      titulo: "Quitar asignación",
      mensaje: `¿Quitar a ${a.nombre_empleado} de ${destino}?`,
      peligro: true,
    });
    if (!aceptado) return;
    try {
      await quitarAsignacion(idProyecto, a.id_asignacion);
      toast.exito("Asignación eliminada");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo quitar la asignación");
    }
  }

  return (
    <details className="card seccion-plegable">
      <summary>Asignaciones ({asignaciones.length})</summary>
      {puedeAsignar ? (
        <form className="form-inline" onSubmit={(e) => void asignar(e)}>
          <select value={idEmpleado} onChange={(ev) => setIdEmpleado(ev.target.value)} required>
            <option value="">Seleccione un empleado…</option>
            {empleados.map((em) => (
              <option key={em.id_empleado} value={em.id_empleado}>
                {em.nombres} {em.apellidos}
              </option>
            ))}
          </select>
          <select value={idTarea} onChange={(ev) => setIdTarea(ev.target.value)}>
            <option value="">Todo el proyecto</option>
            {tareas.map((t) => (
              <option key={t.id_tarea} value={t.id_tarea}>
                Tarea: {t.titulo}
              </option>
            ))}
          </select>
          <select value={rol} onChange={(ev) => setRol(ev.target.value)}>
            <option value="Miembro del equipo">Miembro del equipo</option>
            <option value="Responsable">Responsable</option>
          </select>
          <button className="btn" type="submit">
            Asignar
          </button>
        </form>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Rol</th>
            <th>Asignado a</th>
            <th>Desde</th>
            {puedeAsignar ? <th></th> : null}
          </tr>
        </thead>
        <tbody>
          {asignaciones.map((a) => (
            <tr key={a.id_asignacion}>
              <td>
                {a.nombre_empleado}
                {a.cargo ? (
                  <>
                    <br />
                    <small>{a.cargo}</small>
                  </>
                ) : null}
              </td>
              <td>{a.rol_en_proyecto ?? "—"}</td>
              <td>{a.titulo_tarea ? `Tarea: ${a.titulo_tarea}` : "Todo el proyecto"}</td>
              <td>{String(a.fecha_asignacion).slice(0, 10)}</td>
              {puedeAsignar ? (
                <td>
                  <button type="button" className="btn-text" onClick={() => void quitar(a)}>
                    Quitar
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {asignaciones.length === 0 ? <p>No hay personas asignadas.</p> : null}
    </details>
  );
}
