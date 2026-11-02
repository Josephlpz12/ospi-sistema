import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useAuth } from "../contexto/AuthContexto";

export function Login() {
  const { autenticado, login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarClave, setMostrarClave] = useState(false);

  if (autenticado) return <Navigate to="/" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await login(usuario, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <form className="login-form" onSubmit={enviar}>
          <h1 className="login-title">Iniciar sesión</h1>
          <p className="login-subtitle">Sistema de gestión de proyectos y clientes</p>
          {error ? <p className="alerta">{error}</p> : null}
          <label className="login-label">
            Usuario o correo
            <span className="login-field">
              <User className="login-field-icon" size={18} aria-hidden />
              <input
                value={usuario}
                onChange={(ev) => setUsuario(ev.target.value)}
                placeholder="Usuario o correo"
                autoComplete="username"
                required
              />
            </span>
          </label>
          <label className="login-label">
            Contraseña
            <span className="login-field">
              <Lock className="login-field-icon" size={18} aria-hidden />
              <input
                type={mostrarClave ? "text" : "password"}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-toggle"
                onClick={() => setMostrarClave((v) => !v)}
                aria-label={mostrarClave ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarClave ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <button type="submit" className="login-submit" disabled={cargando}>
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
        <aside className="login-welcome">
          <p className="login-welcome-brand">OSPI</p>
          <h2 className="login-welcome-title">Bienvenido</h2>
          <p className="login-welcome-text">
            Gestione clientes, proyectos y el seguimiento de sus operaciones desde un solo lugar.
          </p>
        </aside>
      </div>
    </div>
  );
}
