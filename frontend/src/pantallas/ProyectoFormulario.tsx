import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { listarClientes } from "../servicios/clientes.servicio";
import { guardarProyecto, obtenerProyecto } from "../servicios/proyectos.servicio";
import type { Cliente } from "../tipos";

function nombreCliente(c: Cliente) {
  if (c.tipo_cliente === "EMPRESA") return c.razon_social ?? `Empresa #${c.id_cliente}`;
  return `${c.nombres ?? ""} ${c.apellidos ?? ""}`.trim();
}

function fechaInput(valor: string | null) {
  if (!valor) return "";
  return valor.slice(0, 10);
}

export function ProyectoFormulario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(id);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    id_cliente: "",
    nombre: "",
    descripcion: "",
    codigo: "",
    fecha_inicio: "",
    fecha_fin_plan: "",
    porcentaje_avance: "0",
    id_estado: "",
  });

  useEffect(() => {
    listarClientes()
      .then(setClientes)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!id) return;
    obtenerProyecto(Number(id))
      .then((p) => {
        setForm({
          id_cliente: String(p.id_cliente),
          nombre: p.nombre,
          descripcion: p.descripcion ?? "",
          codigo: p.codigo ?? "",
          fecha_inicio: fechaInput(p.fecha_inicio),
          fecha_fin_plan: fechaInput(p.fecha_fin_plan),
          porcentaje_avance: String(p.porcentaje_avance ?? 0),
          id_estado: String(p.id_estado),
        });
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  function setCampo(campo: string, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const cuerpo: Record<string, unknown> = {
      id_cliente: Number(form.id_cliente),
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      codigo: form.codigo || undefined,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin_plan: form.fecha_fin_plan || null,
      porcentaje_avance: Number(form.porcentaje_avance),
    };
    if (editando && form.id_estado) cuerpo.id_estado = Number(form.id_estado);
    try {
      await guardarProyecto(cuerpo, id ? Number(id) : undefined);
      navigate("/proyectos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section>
      <h1>{editando ? "Editar proyecto" : "Nuevo proyecto"}</h1>
      {error ? <p className="alerta">{error}</p> : null}
      <form className="card form" onSubmit={enviar}>
        <label>
          Cliente
          <select
            value={form.id_cliente}
            onChange={(e) => setCampo("id_cliente", e.target.value)}
            required
            disabled={editando}
          >
            <option value="">Seleccione…</option>
            {clientes.map((c) => (
              <option key={c.id_cliente} value={c.id_cliente}>
                {nombreCliente(c)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nombre
          <input value={form.nombre} onChange={(e) => setCampo("nombre", e.target.value)} required />
        </label>
        <label>
          Código
          <input value={form.codigo} onChange={(e) => setCampo("codigo", e.target.value)} placeholder="Se genera si lo deja vacío" />
        </label>
        <label>
          Descripción
          <textarea value={form.descripcion} onChange={(e) => setCampo("descripcion", e.target.value)} rows={3} />
        </label>
        <label>
          Fecha inicio
          <input type="date" value={form.fecha_inicio} onChange={(e) => setCampo("fecha_inicio", e.target.value)} />
        </label>
        <label>
          Fecha fin planificada
          <input type="date" value={form.fecha_fin_plan} onChange={(e) => setCampo("fecha_fin_plan", e.target.value)} />
        </label>
        <label>
          Avance (%)
          <input
            type="number"
            min={0}
            max={100}
            value={form.porcentaje_avance}
            onChange={(e) => setCampo("porcentaje_avance", e.target.value)}
          />
        </label>
        {editando ? (
          <label>
            Estado (id)
            <input value={form.id_estado} onChange={(e) => setCampo("id_estado", e.target.value)} />
            <small>1 Cotización, 2 Activo, 3 Pausado, 4 Entregado, 5 Cancelado</small>
          </label>
        ) : null}
        <div className="form-actions">
          <button className="btn" type="submit" disabled={cargando}>
            Guardar
          </button>
          <Link to="/proyectos">Cancelar</Link>
        </div>
      </form>
    </section>
  );
}
