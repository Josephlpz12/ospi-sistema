import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { guardarCliente, obtenerCliente } from "../servicios/clientes.servicio";

type Tipo = "INDIVIDUAL" | "EMPRESA";

export function ClienteFormulario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(id);
  const [tipo, setTipo] = useState<Tipo>("INDIVIDUAL");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    dpi: "",
    nit: "",
    telefono: "",
    correo: "",
    razon_social: "",
    nombre_comercial: "",
    representante_legal: "",
    origen: "",
    observaciones: "",
    estado: "ACTIVO",
  });

  useEffect(() => {
    if (!id) return;
    obtenerCliente(Number(id))
      .then((c) => {
        setTipo(c.tipo_cliente);
        setForm({
          nombres: c.nombres ?? "",
          apellidos: c.apellidos ?? "",
          dpi: c.dpi ?? "",
          nit: (c.tipo_cliente === "EMPRESA" ? c.nit_empresa : c.nit_individual) ?? "",
          telefono: (c.tipo_cliente === "EMPRESA" ? c.telefono_empresa : c.telefono_individual) ?? "",
          correo: (c.tipo_cliente === "EMPRESA" ? c.correo_empresa : c.correo_individual) ?? "",
          razon_social: c.razon_social ?? "",
          nombre_comercial: c.nombre_comercial ?? "",
          representante_legal: c.representante_legal ?? "",
          origen: c.origen ?? "",
          observaciones: c.observaciones ?? "",
          estado: c.estado,
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
      tipo_cliente: tipo,
      origen: form.origen || null,
      observaciones: form.observaciones || null,
      estado: form.estado,
      telefono: form.telefono || null,
      correo: form.correo || null,
      nit: form.nit || null,
    };
    if (tipo === "INDIVIDUAL") {
      cuerpo.nombres = form.nombres;
      cuerpo.apellidos = form.apellidos;
      cuerpo.dpi = form.dpi || null;
    } else {
      cuerpo.razon_social = form.razon_social;
      cuerpo.nombre_comercial = form.nombre_comercial || null;
      cuerpo.representante_legal = form.representante_legal || null;
    }
    try {
      await guardarCliente(cuerpo, id ? Number(id) : undefined);
      navigate("/clientes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section>
      <h1>{editando ? "Editar cliente" : "Nuevo cliente"}</h1>
      {error ? <p className="alerta">{error}</p> : null}
      <form className="card form" onSubmit={enviar}>
        <label>
          Tipo
          <select
            value={tipo}
            disabled={editando}
            onChange={(ev) => setTipo(ev.target.value as Tipo)}
          >
            <option value="INDIVIDUAL">Individual</option>
            <option value="EMPRESA">Empresa</option>
          </select>
        </label>
        {tipo === "INDIVIDUAL" ? (
          <>
            <label>
              Nombres
              <input value={form.nombres} onChange={(e) => setCampo("nombres", e.target.value)} required />
            </label>
            <label>
              Apellidos
              <input value={form.apellidos} onChange={(e) => setCampo("apellidos", e.target.value)} required />
            </label>
            <label>
              DPI
              <input value={form.dpi} onChange={(e) => setCampo("dpi", e.target.value)} />
            </label>
          </>
        ) : (
          <>
            <label>
              Razón social
              <input value={form.razon_social} onChange={(e) => setCampo("razon_social", e.target.value)} required />
            </label>
            <label>
              Nombre comercial
              <input value={form.nombre_comercial} onChange={(e) => setCampo("nombre_comercial", e.target.value)} />
            </label>
            <label>
              Representante legal
              <input value={form.representante_legal} onChange={(e) => setCampo("representante_legal", e.target.value)} />
            </label>
          </>
        )}
        <label>
          NIT
          <input value={form.nit} onChange={(e) => setCampo("nit", e.target.value)} />
        </label>
        <label>
          Teléfono
          <input value={form.telefono} onChange={(e) => setCampo("telefono", e.target.value)} />
        </label>
        <label>
          Correo
          <input type="email" value={form.correo} onChange={(e) => setCampo("correo", e.target.value)} />
        </label>
        {editando ? (
          <label>
            Estado
            <select value={form.estado} onChange={(e) => setCampo("estado", e.target.value)}>
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
              <option value="SUSPENDIDO">SUSPENDIDO</option>
            </select>
          </label>
        ) : null}
        <div className="form-actions">
          <button className="btn" type="submit" disabled={cargando}>
            Guardar
          </button>
          <Link to="/clientes">Cancelar</Link>
        </div>
      </form>
    </section>
  );
}
