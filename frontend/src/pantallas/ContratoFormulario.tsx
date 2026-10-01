import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listarClientes } from "../servicios/clientes.servicio";
import { crearContrato, listarSuscripciones } from "../servicios/finanzas.servicio";
import { listarProyectos } from "../servicios/proyectos.servicio";
import type { Cliente, Proyecto, Suscripcion } from "../tipos";

function nombreCliente(c: Cliente) {
  if (c.tipo_cliente === "EMPRESA") return c.razon_social ?? `Empresa #${c.id_cliente}`;
  return `${c.nombres ?? ""} ${c.apellidos ?? ""}`.trim();
}

export function ContratoFormulario() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    id_cliente: "",
    id_suscripcion: "",
    id_proyecto: "",
    monto_total: "",
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: "",
    clausula_mora: "El impago genera multa y suspensión del servicio.",
  });

  useEffect(() => {
    Promise.all([listarClientes(), listarProyectos()])
      .then(([c, p]) => {
        setClientes(c);
        setProyectos(p);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!form.id_cliente) {
      setSuscripciones([]);
      return;
    }
    listarSuscripciones(Number(form.id_cliente))
      .then(setSuscripciones)
      .catch((err: Error) => setError(err.message));
  }, [form.id_cliente]);

  function setCampo(campo: string, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const creado = await crearContrato({
        id_cliente: Number(form.id_cliente),
        id_suscripcion: form.id_suscripcion ? Number(form.id_suscripcion) : null,
        id_proyecto: form.id_proyecto ? Number(form.id_proyecto) : null,
        monto_total: Number(form.monto_total),
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        clausula_mora: form.clausula_mora,
      });
      navigate(`/contratos/${creado.id_contrato}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setCargando(false);
    }
  }

  const proyectosCliente = proyectos.filter(
    (p) => !form.id_cliente || p.id_cliente === Number(form.id_cliente),
  );

  return (
    <section>
      <h1>Nuevo contrato</h1>
      {error ? <p className="alerta">{error}</p> : null}
      <form className="card form" onSubmit={enviar}>
        <label>
          Cliente
          <select
            value={form.id_cliente}
            onChange={(e) => {
              setCampo("id_cliente", e.target.value);
              setCampo("id_suscripcion", "");
              setCampo("id_proyecto", "");
            }}
            required
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
          Suscripción (servicio)
          <select
            value={form.id_suscripcion}
            onChange={(e) => setCampo("id_suscripcion", e.target.value)}
            disabled={!form.id_cliente}
          >
            <option value="">Ninguna</option>
            {suscripciones.map((s) => (
              <option key={s.id_suscripcion} value={s.id_suscripcion}>
                {s.nombre_producto} · {s.estado}
              </option>
            ))}
          </select>
          <small>
            Si no aparece ninguna, cree primero una suscripción en la ficha del cliente.
          </small>
        </label>
        <label>
          Proyecto (opcional)
          <select value={form.id_proyecto} onChange={(e) => setCampo("id_proyecto", e.target.value)}>
            <option value="">Ninguno</option>
            {proyectosCliente.map((p) => (
              <option key={p.id_proyecto} value={p.id_proyecto}>
                {p.codigo} {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Monto total (GTQ)
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.monto_total}
            onChange={(e) => setCampo("monto_total", e.target.value)}
            required
          />
        </label>
        <label>
          Fecha inicio
          <input type="date" value={form.fecha_inicio} onChange={(e) => setCampo("fecha_inicio", e.target.value)} />
        </label>
        <label>
          Fecha fin
          <input type="date" value={form.fecha_fin} onChange={(e) => setCampo("fecha_fin", e.target.value)} />
        </label>
        <label>
          Cláusula de mora
          <textarea
            rows={3}
            value={form.clausula_mora}
            onChange={(e) => setCampo("clausula_mora", e.target.value)}
          />
        </label>
        <div className="form-actions">
          <button className="btn" type="submit" disabled={cargando}>
            Guardar
          </button>
          <Link to="/contratos">Cancelar</Link>
        </div>
      </form>
    </section>
  );
}
