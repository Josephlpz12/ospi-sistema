import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InsigniaEstado } from "../componentes/InsigniaEstado";
import { useConfirmar } from "../contexto/ConfirmacionContexto";
import { useAuth } from "../contexto/AuthContexto";
import { useToast } from "../contexto/ToastContexto";
import { cambiarEstadoUsuario, listarUsuarios } from "../servicios/usuarios.servicio";
import type { Usuario } from "../tipos";

export function UsuariosLista() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const toast = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  async function cargar() {
    try {
      setUsuarios(await listarUsuarios());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar");
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function cambiarEstado(u: Usuario) {
    const inactivar = u.activo;
    const aceptado = await confirmar({
      titulo: inactivar ? "Inactivar usuario" : "Activar usuario",
      mensaje: `¿Desea ${inactivar ? "inactivar" : "activar"} al usuario ${u.nombre_usuario}?`,
      peligro: inactivar,
    });
    if (!aceptado) return;
    try {
      await cambiarEstadoUsuario(u.id_usuario, !u.activo);
      toast.exito(inactivar ? "Usuario inactivado" : "Usuario activado");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el estado");
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
                <InsigniaEstado estado={u.activo ? "Activo" : "Inactivo"} />
              </td>
              <td className="acciones">
                <Link className="btn btn-editar btn-compacto" to={`/usuarios/${u.id_usuario}/editar`}>
                  Editar
                </Link>
                {u.id_usuario !== usuario?.id_usuario ? (
                  <button
                    type="button"
                    className={u.activo ? "btn btn-peligro btn-compacto" : "btn btn-positivo btn-compacto"}
                    onClick={() => void cambiarEstado(u)}
                  >
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
