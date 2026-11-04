import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  User,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { esAdministrador, puedeOperarFinanzas } from "../autorizacion";
import { BotonTema } from "./BotonTema";
import { useAuth } from "../contexto/AuthContexto";

const CLAVE_MENU = "ospi-menu-colapsado";

function leerMenuColapsado() {
  try {
    const guardado = localStorage.getItem(CLAVE_MENU);
    if (guardado === "1") return true;
    if (guardado === "0") return false;
  } catch {
    return window.matchMedia("(max-width: 767px)").matches;
  }
  return window.matchMedia("(max-width: 767px)").matches;
}

function guardarMenuColapsado(colapsado: boolean) {
  try {
    localStorage.setItem(CLAVE_MENU, colapsado ? "1" : "0");
  } catch {
    return;
  }
}

export function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [menuColapsado, setMenuColapsado] = useState(leerMenuColapsado);
  const identidad = `${usuario?.nombre_usuario ?? ""} · ${usuario?.nombre_rol ?? ""}`;

  function cerrarSesion() {
    logout();
    navigate("/login");
  }

  function alternarMenu() {
    setMenuColapsado((actual) => {
      const siguiente = !actual;
      guardarMenuColapsado(siguiente);
      return siguiente;
    });
  }

  return (
    <div className={menuColapsado ? "app-shell menu-colapsado" : "app-shell"}>
      <aside className="sidebar">
        <div className="sidebar-tope">
          <div className="marca-menu">
            <p className="brand">OSPI</p>
            <p className="brand-sub">Gestión de proyectos</p>
          </div>
          <button
            type="button"
            className="btn-menu"
            onClick={alternarMenu}
            aria-expanded={!menuColapsado}
            aria-label={menuColapsado ? "Expandir menú" : "Contraer menú"}
          >
            <Menu size={18} aria-hidden />
          </button>
        </div>
        <nav>
          <NavLink to="/" end title="Dashboard">
            <LayoutDashboard size={18} aria-hidden />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/monitoreo" title="Monitoreo">
            <Activity size={18} aria-hidden />
            <span>Monitoreo</span>
          </NavLink>
          {esAdministrador(usuario?.nombre_rol) ? (
            <NavLink to="/prospectos" title="Prospectos">
              <UserPlus size={18} aria-hidden />
              <span>Prospectos</span>
            </NavLink>
          ) : null}
          <NavLink to="/clientes" title="Clientes">
            <Users size={18} aria-hidden />
            <span>Clientes</span>
          </NavLink>
          <NavLink to="/proyectos" title="Proyectos">
            <FolderKanban size={18} aria-hidden />
            <span>Proyectos</span>
          </NavLink>
          {puedeOperarFinanzas(usuario?.nombre_rol) ? (
            <NavLink to="/contratos" title="Contratos">
              <FileText size={18} aria-hidden />
              <span>Contratos</span>
            </NavLink>
          ) : null}
          {puedeOperarFinanzas(usuario?.nombre_rol) ? (
            <NavLink to="/resumen-general" title="Resumen general">
              <Wallet size={18} aria-hidden />
              <span>Resumen general</span>
            </NavLink>
          ) : null}
          <NavLink to="/alertas" title="Alertas">
            <Bell size={18} aria-hidden />
            <span>Alertas</span>
          </NavLink>
          {esAdministrador(usuario?.nombre_rol) ? (
            <NavLink to="/usuarios" title="Usuarios">
              <UserCog size={18} aria-hidden />
              <span>Usuarios</span>
            </NavLink>
          ) : null}
          {esAdministrador(usuario?.nombre_rol) ? (
            <NavLink to="/bitacora" title="Bitácora">
              <ScrollText size={18} aria-hidden />
              <span>Bitácora</span>
            </NavLink>
          ) : null}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <BotonTema />
          <span className="topbar-usuario" title={identidad}>
            <User size={16} aria-hidden />
            <span>{identidad}</span>
          </span>
          <button type="button" className="btn-text btn-salir" onClick={cerrarSesion} title="Cerrar sesión">
            <LogOut size={16} aria-hidden />
            <span>Cerrar sesión</span>
          </button>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
