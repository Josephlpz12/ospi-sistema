import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexto/AuthContexto";

export function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function cerrarSesion() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <p className="brand">OSPI</p>
        <p className="brand-sub">Gestión de proyectos</p>
        <nav>
          <NavLink to="/" end>
            Panel
          </NavLink>
          <NavLink to="/clientes">Clientes</NavLink>
          <NavLink to="/proyectos">Proyectos</NavLink>
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>
            {usuario?.nombre_usuario} · {usuario?.nombre_rol}
          </span>
          <button type="button" className="btn-text" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
