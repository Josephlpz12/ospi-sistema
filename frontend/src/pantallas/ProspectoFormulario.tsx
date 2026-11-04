import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EnlaceVolver } from "../componentes/EnlaceVolver";
import { useToast } from "../contexto/ToastContexto";
import { FUENTES_PROSPECTO, guardarProspecto, obtenerProspecto } from "../servicios/prospectos.servicio";
import { listarEmpleados } from "../servicios/seguimiento.servicio";
import type { Empleado } from "../tipos";

export function ProspectoFormulario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const editando = Boolean(id);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [nombreResponsable, setNombreResponsable] = useState("");
  const [convertido, setConvertido] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    empresa: "",
    cargo: "",
    correo: "",
    telefono: "",
    fuente: "",
    id_responsable: "",
    notas: "",
  });

  useEffect(() => {
    listarEmpleados()
      .then(setEmpleados)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!id) return;
    obtenerProspecto(Number(id))
      .then((p) => {
        setConvertido(p.estado === "Convertido");
        setNombreResponsable(p.nombre_responsable ?? "");
        setForm({
          nombres: p.nombres,
          apellidos: p.apellidos,
          empresa: p.empresa ?? "",
          cargo: p.cargo ?? "",
          correo: p.correo ?? "",
          telefono: p.telefono ?? "",
          fuente: p.fuente,
          id_responsable: p.id_responsable ? String(p.id_responsable) : "",
          notas: p.notas ?? "",
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
    try {
      const prospecto = await guardarProspecto(
        {
          nombres: form.nombres,
          apellidos: form.apellidos,
          empresa: form.empresa || null,
          cargo: form.cargo || null,
          correo: form.correo || null,
          telefono: form.telefono || null,
          fuente: form.fuente,
          id_responsable: form.id_responsable ? Number(form.id_responsable) : null,
          notas: form.notas || null,
        },
        id ? Number(id) : undefined,
      );
      toast.exito(editando ? "Prospecto actualizado" : "Prospecto creado");
      navigate(`/prospectos/${prospecto.id_prospecto}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setCargando(false);
    }
  }

  const responsableFuera =
    form.id_responsable !== "" && !empleados.some((em) => em.id_empleado === Number(form.id_responsable));

  if (convertido) {
    return (
      <section>
        <EnlaceVolver to={`/prospectos/${id}`}>Prospecto</EnlaceVolver>
        <p className="alerta">Un prospecto convertido no se puede editar.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>{editando ? "Editar prospecto" : "Nuevo prospecto"}</h1>
      {error ? <p className="alerta">{error}</p> : null}
      <form className="card form" onSubmit={enviar}>
        <label>
          Nombres
          <input value={form.nombres} onChange={(e) => setCampo("nombres", e.target.value)} required />
        </label>
        <label>
          Apellidos
          <input value={form.apellidos} onChange={(e) => setCampo("apellidos", e.target.value)} required />
        </label>
        <label>
          Empresa
          <input value={form.empresa} onChange={(e) => setCampo("empresa", e.target.value)} />
        </label>
        <label>
          Cargo
          <input value={form.cargo} onChange={(e) => setCampo("cargo", e.target.value)} />
        </label>
        <label>
          Correo
          <input type="email" value={form.correo} onChange={(e) => setCampo("correo", e.target.value)} />
        </label>
        <label>
          Teléfono
          <input value={form.telefono} onChange={(e) => setCampo("telefono", e.target.value)} />
        </label>
        <label>
          Fuente
          <select value={form.fuente} onChange={(e) => setCampo("fuente", e.target.value)} required>
            <option value="">Seleccione…</option>
            {FUENTES_PROSPECTO.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Responsable
          <select value={form.id_responsable} onChange={(e) => setCampo("id_responsable", e.target.value)}>
            <option value="">Sin responsable</option>
            {responsableFuera ? (
              <option value={form.id_responsable}>{nombreResponsable || "Responsable actual"}</option>
            ) : null}
            {empleados.map((em) => (
              <option key={em.id_empleado} value={em.id_empleado}>
                {em.nombres} {em.apellidos}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notas
          <textarea value={form.notas} onChange={(e) => setCampo("notas", e.target.value)} rows={3} />
        </label>
        <div className="form-actions">
          <button className="btn" type="submit" disabled={cargando}>
            Guardar
          </button>
          <Link className="btn btn-secundario" to={id ? `/prospectos/${id}` : "/prospectos"}>
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
