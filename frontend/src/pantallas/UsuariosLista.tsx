import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexto/AuthContexto";
import { cambiarEstadoUsuario, listarUsuarios } from "../servicios/usuarios.servicio";
import type { Usuario } from "../tipos";

export function UsuariosLista() {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState("");

  async function cargar() {
    try {
      setUsuarios(await listarUsuarios());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function cambiarEstado(u: Usuario) {
    const accion = u.activo ? "inactivar" : "activar";
    if (!confirm(`¿Desea ${accion} al usuario ${u.nombre_usuario}?`)) return;
    setError("");
    try {
      await cambiarEstadoUsuario(u.id_usuario, !u.activo);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Usuarios</h1>
        <Link className="btn" to="/usuarios/nuevo">
          Nuevo usuario
        </Link>
      </div>
      {error ? <p className="alerta">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id_usuario}>
              <td>{u.nombre_usuario}</td>
              <td>{u.correo}</td>
              <td>{u.nombre_rol}</td>
              <td>
                <span className={u.activo ? "insignia insignia-activo" : "insignia insignia-cancelado"}>
                  {u.activo ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="acciones">
                <Link to={`/usuarios/${u.id_usuario}/editar`}>Editar</Link>
                {u.id_usuario !== usuario?.id_usuario ? (
                  <button type="button" className="btn-text" onClick={() => void cambiarEstado(u)}>
                    {u.activo ? "Inactivar" : "Activar"}
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {usuarios.length === 0 ? <p>No hay usuarios registrados.</p> : null}
    </section>
  );
}
