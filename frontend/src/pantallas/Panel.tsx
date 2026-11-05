import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, Bell, CalendarClock, CircleDollarSign, FileText, FolderKanban, Receipt, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { puedeOperarFinanzas } from "../autorizacion";
import { BarraAvance } from "../componentes/BarraAvance";
import { useAuth } from "../contexto/AuthContexto";
import { useToast } from "../contexto/ToastContexto";
import { dinero } from "../formatoFinanciero";
import { generarAlertas, listarAlertas } from "../servicios/alertas.servicio";
import { obtenerDashboard } from "../servicios/dashboard.servicio";
import { listarProyectos } from "../servicios/proyectos.servicio";
import type { Alerta, Dashboard, MontoMoneda, Proyecto } from "../tipos";

const iconosAlerta = {
  TAREA_VENCIDA: CalendarClock,
  AVANCE_BAJO: TrendingDown,
  FACTURA_VENCIDA: Receipt,
  SERVICIO_SUSPENDIDO: Ban,
} as const;

function textoAvance(valor: number) {
  const redondeado = Math.round(valor * 10) / 10;
  return Number.isInteger(redondeado) ? `${redondeado}%` : `${redondeado.toFixed(1)}%`;
}

function textoMontos(filas: MontoMoneda[] | undefined) {
  if (!filas || filas.length === 0) return dinero(0);
  return filas.map((fila) => (fila.moneda === "GTQ" ? dinero(fila.monto) : `${dinero(fila.monto)} ${fila.moneda}`));
}

function claseValor(valor: string | string[]) {
  const largo = (Array.isArray(valor) ? valor.join("") : valor).length;
  if (largo > 12) return "stat-monto stat-monto-largo";
  if (largo > 8) return "stat-monto";
  return undefined;
}

function Tarjeta({ to, icono: Icono, etiqueta, valor }: { to: string; icono: LucideIcon; etiqueta: string; valor: string | string[] }) {
  return (
    <Link className="card stat" to={to}>
      <span className="stat-icono">
        <Icono size={18} aria-hidden />
      </span>
      <span>{etiqueta}</span>
      <strong className={claseValor(valor)}>
        {Array.isArray(valor)
          ? valor.flatMap((linea, indice) => (indice === 0 ? [linea] : [<br key={indice} />, linea]))
          : valor}
      </strong>
    </Link>
  );
}

export function Panel() {
  const { usuario } = useAuth();
  const toast = useToast();
  const [tablero, setTablero] = useState<Dashboard | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const finanzas = puedeOperarFinanzas(usuario?.nombre_rol);

  useEffect(() => {
    let vigente = true;
    generarAlertas()
      .catch(() => listarAlertas(true))
      .then(async (lista) => {
        const [datos, listaProyectos] = await Promise.all([obtenerDashboard(), listarProyectos()]);
        if (!vigente) return;
        setTablero(datos);
        setProyectos(listaProyectos);
        setAlertas(lista.filter((a) => !a.leida).slice(0, 5));
      })
      .catch((err: Error) => {
        if (vigente) toast.error(err.message);
      });
    return () => {
      vigente = false;
    };
  }, [toast]);

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
        <h1>Dashboard</h1>
        <Link className="btn" to="/monitoreo">
          Tablero de monitoreo
        </Link>
      </div>
      <div className="stats">
        <Tarjeta to="/clientes" icono={Users} etiqueta="Clientes activos" valor={String(tablero?.clientes_activos ?? 0)} />
        <Tarjeta to="/proyectos" icono={FolderKanban} etiqueta="Proyectos activos" valor={String(tablero?.proyectos_activos ?? 0)} />
        <Tarjeta to="/monitoreo" icono={TrendingUp} etiqueta="Avance promedio" valor={textoAvance(tablero?.avance_promedio ?? 0)} />
        {finanzas ? (
          <Tarjeta to="/contratos" icono={FileText} etiqueta="Contratos vigentes" valor={String(tablero?.contratos_vigentes ?? 0)} />
        ) : null}
        <Tarjeta to="/alertas" icono={Bell} etiqueta="Alertas pendientes" valor={String(tablero?.alertas_pendientes ?? 0)} />
        {finanzas ? (
          <>
            <Tarjeta to="/resumen-general" icono={Receipt} etiqueta="Facturas en mora" valor={String(tablero?.facturas_mora ?? 0)} />
            <Tarjeta to="/resumen-general" icono={Wallet} etiqueta="Saldo pendiente" valor={textoMontos(tablero?.saldos)} />
            <Tarjeta to="/resumen-general" icono={CircleDollarSign} etiqueta="Monto contratado" valor={textoMontos(tablero?.contratados)} />
          </>
        ) : null}
      </div>
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
                  <td className="dato-fuerte">
                    <BarraAvance valor={p.porcentaje_avance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
