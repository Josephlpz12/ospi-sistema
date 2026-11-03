import { type FormEvent, useEffect, useState } from "react";
import { eliminarDireccion, guardarDireccion, listarDirecciones } from "../servicios/clientes.servicio";
import type { Direccion, TipoDireccion } from "../tipos";

type Props = {
  idCliente: number;
  puedeEditar: boolean;
};

const TIPOS: Record<TipoDireccion, string> = {
  FISCAL: "Fiscal",
  ENTREGA: "Entrega",
  OTRA: "Otra",
};

const DEPARTAMENTOS = [
  "Alta Verapaz",
  "Baja Verapaz",
  "Chimaltenango",
  "Chiquimula",
  "El Progreso",
  "Escuintla",
  "Guatemala",
  "Huehuetenango",
  "Izabal",
  "Jalapa",
  "Jutiapa",
  "Petén",
  "Quetzaltenango",
  "Quiché",
  "Retalhuleu",
  "Sacatepéquez",
  "San Marcos",
  "Santa Rosa",
  "Sololá",
  "Suchitepéquez",
  "Totonicapán",
  "Zacapa",
];

const FORMULARIO_VACIO = { tipo: "FISCAL" as TipoDireccion, departamento_gt: "", municipio: "", detalle: "" };

export function SeccionDirecciones({ idCliente, puedeEditar }: Props) {
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [error, setError] = useState("");
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [idEditando, setIdEditando] = useState<number | null>(null);

  async function cargar() {
    setDirecciones(await listarDirecciones(idCliente));
  }

  useEffect(() => {
    setIdEditando(null);
    setFormulario(FORMULARIO_VACIO);
    cargar().catch((err: Error) => setError(err.message));
  }, [idCliente]);

  function cambiar(campo: keyof typeof FORMULARIO_VACIO, valor: string) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }));
  }

  function editar(d: Direccion) {
    setError("");
    setIdEditando(d.id_direccion);
    setFormulario({
      tipo: d.tipo,
      departamento_gt: d.departamento_gt ?? "",
      municipio: d.municipio ?? "",
      detalle: d.detalle,
    });
  }

  function cancelar() {
    setIdEditando(null);
    setFormulario(FORMULARIO_VACIO);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await guardarDireccion(idCliente, formulario, idEditando ?? undefined);
      cancelar();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la dirección");
    }
  }

  async function eliminar(d: Direccion) {
    if (!confirm(`¿Eliminar la dirección ${TIPOS[d.tipo].toLowerCase()} «${d.detalle}»?`)) return;
    setError("");
    try {
      await eliminarDireccion(idCliente, d.id_direccion);
      if (idEditando === d.id_direccion) cancelar();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la dirección");
    }
  }

  const departamentoFuera = formulario.departamento_gt !== "" && !DEPARTAMENTOS.includes(formulario.departamento_gt);

  return (
    <details className="card seccion-plegable">
      <summary>Direcciones ({direcciones.length})</summary>
      {error ? <p className="alerta">{error}</p> : null}
      {puedeEditar ? (
        <form className="form-inline" onSubmit={(e) => void guardar(e)}>
          <select
            aria-label="Tipo de dirección"
            value={formulario.tipo}
            onChange={(ev) => cambiar("tipo", ev.target.value)}
            required
          >
            {Object.entries(TIPOS).map(([valor, nombre]) => (
              <option key={valor} value={valor}>
                {nombre}
              </option>
            ))}
          </select>
          <select
            aria-label="Departamento"
            value={formulario.departamento_gt}
            onChange={(ev) => cambiar("departamento_gt", ev.target.value)}
          >
            <option value="">Departamento (opcional)…</option>
            {departamentoFuera ? <option value={formulario.departamento_gt}>{formulario.departamento_gt}</option> : null}
            {DEPARTAMENTOS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            placeholder="Municipio (opcional)"
            aria-label="Municipio"
            value={formulario.municipio}
            maxLength={80}
            onChange={(ev) => cambiar("municipio", ev.target.value)}
          />
          <input
            placeholder="Detalle de la dirección"
            aria-label="Detalle de la dirección"
            value={formulario.detalle}
            maxLength={500}
            onChange={(ev) => cambiar("detalle", ev.target.value)}
            required
          />
          <button className="btn" type="submit">
            {idEditando ? "Guardar cambios" : "Agregar dirección"}
          </button>
          {idEditando ? (
            <button className="btn-text" type="button" onClick={cancelar}>
              Cancelar
            </button>
          ) : null}
        </form>
      ) : null}
      {direcciones.length === 0 ? (
        <p>Este cliente no tiene direcciones.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Departamento</th>
              <th>Municipio</th>
              <th>Detalle</th>
              {puedeEditar ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {direcciones.map((d) => (
              <tr key={d.id_direccion}>
                <td>{TIPOS[d.tipo] ?? d.tipo}</td>
                <td>{d.departamento_gt ?? "—"}</td>
                <td>{d.municipio ?? "—"}</td>
                <td>{d.detalle}</td>
                {puedeEditar ? (
                  <td className="acciones">
                    <button type="button" className="btn-text" onClick={() => editar(d)}>
                      Editar
                    </button>
                    <button type="button" className="btn-text" onClick={() => void eliminar(d)}>
                      Eliminar
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}
