import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  ScrollText,
  UserCog,
  Users,
} from "lucide-react";
import { esAdministrador, puedeOperarFinanzas } from "../autorizacion";
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
            <LayoutDashboard size={18} aria-hidden />
            Panel
          </NavLink>
          <NavLink to="/monitoreo">
            <Activity size={18} aria-hidden />
            Monitoreo
          </NavLink>
          <NavLink to="/clientes">
            <Users size={18} aria-hidden />
            Clientes
          </NavLink>
          <NavLink to="/proyectos">
            <FolderKanban size={18} aria-hidden />
            Proyectos
          </NavLink>
          {puedeOperarFinanzas(usuario?.nombre_rol) ? (
            <NavLink to="/contratos">
              <FileText size={18} aria-hidden />
              Contratos
            </NavLink>
          ) : null}
          <NavLink to="/alertas">
            <Bell size={18} aria-hidden />
            Alertas
          </NavLink>
          {esAdministrador(usuario?.nombre_rol) ? (
            <NavLink to="/usuarios">
              <UserCog size={18} aria-hidden />
              Usuarios
            </NavLink>
          ) : null}
          {esAdministrador(usuario?.nombre_rol) ? (
            <NavLink to="/bitacora">
              <ScrollText size={18} aria-hidden />
              Bitácora
            </NavLink>
          ) : null}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>
            {usuario?.nombre_usuario} · {usuario?.nombre_rol}
          </span>
          <button type="button" className="btn-text btn-salir" onClick={cerrarSesion}>
            <LogOut size={16} aria-hidden />
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
