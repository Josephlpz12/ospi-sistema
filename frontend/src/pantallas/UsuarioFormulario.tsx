import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexto/AuthContexto";
import { useToast } from "../contexto/ToastContexto";
import { guardarUsuario, listarRoles, obtenerUsuario, restablecerClave } from "../servicios/usuarios.servicio";
import type { Rol } from "../tipos";

export function UsuarioFormulario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const toast = useToast();
  const editando = Boolean(id);
  const propio = editando && Number(id) === usuario?.id_usuario;
  const [roles, setRoles] = useState<Rol[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [nuevaClave, setNuevaClave] = useState("");
  const [empleadoActual, setEmpleadoActual] = useState("");
  const [registrarEmpleado, setRegistrarEmpleado] = useState(false);
  const [empleado, setEmpleado] = useState({ nombres: "", apellidos: "", cargo: "" });
  const [form, setForm] = useState({
    nombre_usuario: "",
    correo: "",
    id_rol: "",
    password: "",
  });

  useEffect(() => {
    listarRoles()
      .then(setRoles)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!id) return;
    obtenerUsuario(Number(id))
      .then((u) => {
        setForm({
          nombre_usuario: u.nombre_usuario,
          correo: u.correo,
          id_rol: String(u.id_rol),
          password: "",
        });
        if (u.id_empleado) {
          const nombre = `${u.nombres_empleado ?? ""} ${u.apellidos_empleado ?? ""}`.trim();
          setEmpleadoActual(u.cargo_empleado ? `${nombre} · ${u.cargo_empleado}` : nombre);
        }
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  function setCampo(campo: string, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function setCampoEmpleado(campo: string, valor: string) {
    setEmpleado((prev) => ({ ...prev, [campo]: valor }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const cuerpo: Record<string, unknown> = {
      correo: form.correo,
      id_rol: Number(form.id_rol),
    };
    if (!editando) {
      cuerpo.nombre_usuario = form.nombre_usuario;
      cuerpo.password = form.password;
    }
    if (registrarEmpleado) {
      cuerpo.empleado = empleado;
    }
    try {
      await guardarUsuario(cuerpo, id ? Number(id) : undefined);
      toast.exito(editando ? "Usuario actualizado" : "Usuario creado");
      navigate("/usuarios");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setCargando(false);
    }
  }

  async function restablecer(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError("");
    try {
      await restablecerClave(Number(id), nuevaClave);
      setNuevaClave("");
      toast.exito("Contraseña restablecida");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restablecer la contraseña");
    }
  }

  return (
    <section>
      <h1>{editando ? "Editar usuario" : "Nuevo usuario"}</h1>
      {error ? <p className="alerta">{error}</p> : null}
      <form className="card form" onSubmit={enviar}>
        <label>
          Nombre de usuario
          <input
            value={form.nombre_usuario}
            onChange={(e) => setCampo("nombre_usuario", e.target.value)}
            maxLength={80}
            required
            disabled={editando}
          />
        </label>
        <label>
          Correo
          <input type="email" value={form.correo} onChange={(e) => setCampo("correo", e.target.value)} maxLength={150} required />
        </label>
        <label>
          Rol
          <select value={form.id_rol} onChange={(e) => setCampo("id_rol", e.target.value)} required disabled={propio}>
            <option value="">Seleccione…</option>
            {roles.map((r) => (
              <option key={r.id_rol} value={r.id_rol}>
                {r.nombre}
              </option>
            ))}
          </select>
          {propio ? <small>No puede cambiar su propio rol.</small> : null}
        </label>
        {!editando ? (
          <label>
            Contraseña inicial
            <input
              type="password"
              value={form.password}
              onChange={(e) => setCampo("password", e.target.value)}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              required
            />
            <small>Mínimo 8 caracteres.</small>
          </label>
        ) : null}
        {empleadoActual ? (
          <p className="muted-line">Empleado registrado: {empleadoActual}</p>
        ) : (
          <>
            <label className="opcion-casilla">
              <input
                type="checkbox"
                checked={registrarEmpleado}
                onChange={(e) => setRegistrarEmpleado(e.target.checked)}
              />
              Registrar también como empleado
            </label>
            {registrarEmpleado ? (
              <>
                <label>
                  Nombres del empleado
                  <input
                    value={empleado.nombres}
                    onChange={(e) => setCampoEmpleado("nombres", e.target.value)}
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  Apellidos del empleado
                  <input
                    value={empleado.apellidos}
                    onChange={(e) => setCampoEmpleado("apellidos", e.target.value)}
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  Cargo (opcional)
                  <input value={empleado.cargo} onChange={(e) => setCampoEmpleado("cargo", e.target.value)} maxLength={80} />
                </label>
              </>
            ) : null}
          </>
        )}
        <div className="form-actions">
          <button className="btn" type="submit" disabled={cargando}>
            Guardar
          </button>
          <Link to="/usuarios">Cancelar</Link>
        </div>
      </form>
      {editando ? (
        <form className="card form" style={{ marginTop: 20 }} onSubmit={restablecer}>
          <h2>Restablecer contraseña</h2>
          <label>
            Nueva contraseña
            <input
              type="password"
              value={nuevaClave}
              onChange={(e) => setNuevaClave(e.target.value)}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              required
            />
            <small>Mínimo 8 caracteres.</small>
          </label>
          <div className="form-actions">
            <button className="btn" type="submit">
              Restablecer contraseña
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
