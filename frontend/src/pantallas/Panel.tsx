import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, Bell, CalendarClock, CircleCheck, FolderKanban, Receipt, TrendingDown, Users } from "lucide-react";
import { esAdministrador } from "../autorizacion";
import { useAuth } from "../contexto/AuthContexto";
import { listarClientes } from "../servicios/clientes.servicio";
import { listarProyectos } from "../servicios/proyectos.servicio";
import { generarAlertas, listarAlertas } from "../servicios/alertas.servicio";
import type { Alerta, Proyecto } from "../tipos";

const insignias: Record<string, string> = {
  Activo: "insignia insignia-activo",
  Cancelado: "insignia insignia-cancelado",
  Pausado: "insignia insignia-pausado",
  Cotización: "insignia insignia-cotizacion",
  Entregado: "insignia insignia-entregado",
};

const iconosAlerta = {
  TAREA_VENCIDA: CalendarClock,
  AVANCE_BAJO: TrendingDown,
  FACTURA_VENCIDA: Receipt,
  SERVICIO_SUSPENDIDO: Ban,
} as const;

export function Panel() {
  const { usuario } = useAuth();
  const [clientes, setClientes] = useState(0);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listarClientes(), listarProyectos(), generarAlertas().catch(() => listarAlertas(true))])
      .then(([listaClientes, listaProyectos, listaAlertas]) => {
        setClientes(listaClientes.length);
        setProyectos(listaProyectos);
        setAlertas(listaAlertas.filter((a) => !a.leida).slice(0, 5));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const activos = proyectos.filter((p) => p.estado === "Activo").length;
  const hoy = new Date();
  const limite = new Date();
  limite.setDate(hoy.getDate() + 14);
  const atencion = proyectos.filter((p) => {
    if (p.estado === "Cancelado" || p.estado === "Entregado") return false;
    const bajo = Number(p.porcentaje_avance) < 40;
    if (!p.fecha_fin_plan) return bajo;
    const fin = new Date(p.fecha_fin_plan);
    return bajo || fin <= limite;
  });

  return (
    <section>
      <div className="page-head">
        <h1>Panel</h1>
        <Link className="btn" to="/monitoreo">
          Tablero de monitoreo
        </Link>
      </div>
      {error ? <p className="alerta">{error}</p> : null}
      <div className="stats">
        <article className="card stat">
          <span className="stat-icono stat-icono-clientes">
            <Users size={18} aria-hidden />
          </span>
          <span>Clientes</span>
          <strong>{clientes}</strong>
        </article>
        <article className="card stat">
          <span className="stat-icono stat-icono-proyectos">
            <FolderKanban size={18} aria-hidden />
          </span>
          <span>Proyectos</span>
          <strong>{proyectos.length}</strong>
        </article>
        <article className="card stat">
          <span className="stat-icono stat-icono-activos">
            <CircleCheck size={18} aria-hidden />
          </span>
          <span>Activos</span>
          <strong>{activos}</strong>
        </article>
      </div>
      <h2>Últimos proyectos</h2>
      {proyectos.length === 0 ? (
        <p>
          Aún no hay proyectos.
          {esAdministrador(usuario?.nombre_rol) ? (
            <>
              {" "}
              <Link to="/proyectos/nuevo">Crear uno</Link>
            </>
          ) : null}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Avance</th>
            </tr>
          </thead>
          <tbody>
            {proyectos.slice(0, 5).map((p) => (
              <tr key={p.id_proyecto}>
                <td>{p.codigo}</td>
                <td>
                  <Link to={`/proyectos/${p.id_proyecto}/seguimiento`}>{p.nombre}</Link>
                </td>
                <td>{p.nombre_cliente}</td>
                <td>
                  <span className={insignias[p.estado] ?? "insignia"}>{p.estado}</span>
                </td>
                <td>{Number(p.porcentaje_avance)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {alertas.length > 0 ? (
        <>
          <h2 className="seccion-panel">Alertas recientes</h2>
          <p>
            <Link to="/alertas">Ver todas</Link>
          </p>
          <table>
            <thead>
              <tr>
                <th>Mensaje</th>
                <th>Proyecto</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((a) => {
                const Icono = iconosAlerta[a.tipo as keyof typeof iconosAlerta] ?? Bell;
                return (
                  <tr key={a.id_alerta}>
                    <td>
                      <span className="alerta-mensaje">
                        <Icono size={16} aria-hidden />
                        {a.mensaje}
                      </span>
                    </td>
                    <td>
                      {a.id_proyecto ? (
                        <Link to={`/proyectos/${a.id_proyecto}/seguimiento`}>{a.nombre_proyecto}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : null}
      {atencion.length > 0 ? (
        <>
          <h2 className="seccion-panel">Requieren atención</h2>
          <p>Avance menor a 40% o fecha de fin en los próximos 14 días.</p>
          <table>
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Fin plan</th>
                <th>Avance</th>
              </tr>
            </thead>
            <tbody>
              {atencion.map((p) => (
                <tr key={p.id_proyecto}>
                  <td>
                    <Link to={`/proyectos/${p.id_proyecto}/seguimiento`}>{p.nombre}</Link>
                  </td>
                  <td>{p.fecha_fin_plan ? String(p.fecha_fin_plan).slice(0, 10) : "—"}</td>
                  <td>{Number(p.porcentaje_avance)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
