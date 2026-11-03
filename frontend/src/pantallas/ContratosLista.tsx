import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "../contexto/ToastContexto";
import { listarContratos, revisarFacturasVencidas } from "../servicios/finanzas.servicio";
import type { Contrato } from "../tipos";

function dinero(valor: string | number) {
  return `Q${Number(valor).toFixed(2)}`;
}

export function ContratosLista() {
  const [params] = useSearchParams();
  const idCliente = params.get("id_cliente") ? Number(params.get("id_cliente")) : undefined;
  const toast = useToast();
  const [contratos, setContratos] = useState<Contrato[]>([]);

  async function cargar() {
    setContratos(await listarContratos(idCliente));
  }

  useEffect(() => {
    cargar().catch((err: Error) => toast.error(err.message));
  }, [idCliente]);

  async function revisar() {
    try {
      const r = await revisarFacturasVencidas();
      toast.info(`${r.actualizadas} factura(s) pasaron a VENCIDA.`);
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron revisar");
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Contratos</h1>
        <div className="acciones">
          <button type="button" className="btn-text" onClick={() => void revisar()}>
            Revisar vencidas
          </button>
          <Link className="btn" to="/contratos/nuevo">
            Nuevo contrato
          </Link>
        </div>
      </div>
      {idCliente ? (
        <p className="muted-line">
          Filtrado por cliente #{idCliente}. <Link to="/contratos">Ver todos</Link>
        </p>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Cliente</th>
            <th>Proyecto</th>
            <th>Monto</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {contratos.map((c) => (
            <tr key={c.id_contrato}>
              <td>{c.numero}</td>
              <td>
                <Link to={`/clientes/${c.id_cliente}`}>{c.nombre_cliente}</Link>
              </td>
              <td>{c.nombre_proyecto ?? "—"}</td>
              <td>{dinero(c.monto_total)}</td>
              <td>{c.estado}</td>
              <td className="acciones">
                <Link to={`/contratos/${c.id_contrato}`}>Ver</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {contratos.length === 0 ? <p>No hay contratos.</p> : null}
    </section>
  );
}
