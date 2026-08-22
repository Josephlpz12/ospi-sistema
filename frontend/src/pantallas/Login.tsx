import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexto/AuthContexto";

export function Login() {
  const { autenticado, login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

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
      <form className="card login-card" onSubmit={enviar}>
        <h1>OSPI</h1>
        <p>Sistema de gestión de proyectos y clientes</p>
        {error ? <p className="alerta">{error}</p> : null}
        <label>
          Usuario o correo
          <input value={usuario} onChange={(ev) => setUsuario(ev.target.value)} autoComplete="username" required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="btn" disabled={cargando}>
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
