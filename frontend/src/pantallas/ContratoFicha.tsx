import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  actualizarMulta,
  aplicarMora,
  crearFactura,
  obtenerContrato,
  reactivarContrato,
  registrarPago,
  revisarFacturasVencidas,
} from "../servicios/finanzas.servicio";
import type { Contrato, Factura, Multa } from "../tipos";

function dinero(valor: string | number) {
  return `Q${Number(valor).toFixed(2)}`;
}

function fecha(valor: string | null) {
  return valor ? valor.slice(0, 10) : "—";
}

export function ContratoFicha() {
  const { id } = useParams();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [multas, setMultas] = useState<Multa[]>([]);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [facturaForm, setFacturaForm] = useState({ monto: "", fecha_vencimiento: "" });
  const [pago, setPago] = useState({ id_factura: "", monto: "", metodo: "Transferencia" });
  const [mora, setMora] = useState({ id_factura: "", porcentaje: "10", motivo: "Impago de factura" });

  async function cargar() {
    if (!id) return;
    const datos = await obtenerContrato(Number(id));
    setContrato(datos.contrato);
    setFacturas(datos.facturas);
    setMultas(datos.multas);
  }

  useEffect(() => {
    cargar().catch((err: Error) => setError(err.message));
  }, [id]);

  async function emitir(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError("");
    try {
      await crearFactura(Number(id), {
        monto: Number(facturaForm.monto),
        fecha_vencimiento: facturaForm.fecha_vencimiento || null,
      });
      setFacturaForm({ monto: "", fecha_vencimiento: "" });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo emitir");
    }
  }

  async function pagar(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await registrarPago(Number(pago.id_factura), {
        monto: Number(pago.monto),
        metodo: pago.metodo,
      });
      setPago({ id_factura: "", monto: "", metodo: "Transferencia" });
      setAviso("Pago registrado.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pago");
    }
  }

  async function moraFactura(e: FormEvent) {
    e.preventDefault();
    if (!confirm("¿Aplicar mora? Se generará multa y se suspenderá el servicio.")) return;
    setError("");
    try {
      await aplicarMora(Number(mora.id_factura), {
        porcentaje: Number(mora.porcentaje),
        motivo: mora.motivo,
      });
      setAviso("Mora aplicada: multa y servicio suspendido.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aplicar mora");
    }
  }

  async function reactivar() {
    if (!id) return;
    setError("");
    try {
      const r = await reactivarContrato(Number(id));
      setAviso(r.mensaje ?? "Servicio reactivado");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reactivar");
    }
  }

  async function revisar() {
    setError("");
    try {
      const r = await revisarFacturasVencidas();
      setAviso(`${r.actualizadas} factura(s) pasaron a VENCIDA.`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron revisar");
    }
  }

  if (!contrato) {
    return (
      <section>
        {error ? <p className="alerta">{error}</p> : <p>Cargando contrato…</p>}
      </section>
    );
  }

  const abiertas = facturas.filter((f) => f.estado === "PENDIENTE" || f.estado === "VENCIDA");

  return (
    <section>
      <p>
        <Link to="/contratos">← Contratos</Link>
      </p>
      <div className="page-head">
        <h1>{contrato.numero}</h1>
        <div className="acciones">
          <button type="button" className="btn-text" onClick={() => void revisar()}>
            Revisar vencidas
          </button>
          {contrato.estado === "INCUMPLIDO" ? (
            <button type="button" className="btn" onClick={() => void reactivar()}>
              Reactivar servicio
            </button>
          ) : null}
        </div>
      </div>
      {contrato.estado === "INCUMPLIDO" ? (
        <p className="aviso-suspendido">Contrato incumplido. El servicio queda suspendido hasta pagar y reactivar.</p>
      ) : null}
      {error ? <p className="alerta">{error}</p> : null}
      {aviso ? <p>{aviso}</p> : null}
      <p className="muted-line">
        <Link to={`/clientes/${contrato.id_cliente}`}>{contrato.nombre_cliente}</Link> · {contrato.estado} ·{" "}
        {dinero(contrato.monto_total)} {contrato.moneda}
        {contrato.nombre_proyecto ? ` · ${contrato.nombre_proyecto}` : ""}
      </p>
      {contrato.clausula_mora ? <p>{contrato.clausula_mora}</p> : null}

      <h2>Facturas</h2>
      {facturas.length === 0 ? (
        <p>Aún no hay facturas.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Monto</th>
              <th>Pagado</th>
              <th>Vence</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => (
              <tr key={f.id_factura}>
                <td>{f.numero}</td>
                <td>{dinero(f.monto)}</td>
                <td>{dinero(f.pagado ?? 0)}</td>
                <td>{fecha(f.fecha_vencimiento)}</td>
                <td>{f.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="seguimiento-grid" style={{ marginTop: 20 }}>
        <form className="card form" onSubmit={emitir}>
          <h2>Emitir factura</h2>
          <label>
            Monto
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={facturaForm.monto}
              onChange={(e) => setFacturaForm((p) => ({ ...p, monto: e.target.value }))}
              required
            />
          </label>
          <label>
            Fecha de vencimiento
            <input
              type="date"
              value={facturaForm.fecha_vencimiento}
              onChange={(e) => setFacturaForm((p) => ({ ...p, fecha_vencimiento: e.target.value }))}
            />
          </label>
          <button className="btn" type="submit">
            Emitir
          </button>
        </form>

        <form className="card form" onSubmit={pagar}>
          <h2>Registrar pago</h2>
          <label>
            Factura
            <select
              value={pago.id_factura}
              onChange={(e) => setPago((p) => ({ ...p, id_factura: e.target.value }))}
              required
            >
              <option value="">Seleccione…</option>
              {abiertas.map((f) => (
                <option key={f.id_factura} value={f.id_factura}>
                  {f.numero} · {f.estado} · {dinero(f.monto)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Monto
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={pago.monto}
              onChange={(e) => setPago((p) => ({ ...p, monto: e.target.value }))}
              required
            />
          </label>
          <label>
            Método
            <input value={pago.metodo} onChange={(e) => setPago((p) => ({ ...p, metodo: e.target.value }))} />
          </label>
          <button className="btn" type="submit">
            Registrar pago
          </button>
        </form>

        <form className="card form" onSubmit={moraFactura}>
          <h2>Aplicar mora</h2>
          <p className="muted-line">Multa (por defecto 10%) y suspensión del servicio.</p>
          <label>
            Factura
            <select
              value={mora.id_factura}
              onChange={(e) => setMora((p) => ({ ...p, id_factura: e.target.value }))}
              required
            >
              <option value="">Seleccione…</option>
              {abiertas.map((f) => (
                <option key={f.id_factura} value={f.id_factura}>
                  {f.numero} · {f.estado}
                </option>
              ))}
            </select>
          </label>
          <label>
            Porcentaje multa
            <input
              type="number"
              min={1}
              value={mora.porcentaje}
              onChange={(e) => setMora((p) => ({ ...p, porcentaje: e.target.value }))}
            />
          </label>
          <label>
            Motivo
            <input value={mora.motivo} onChange={(e) => setMora((p) => ({ ...p, motivo: e.target.value }))} />
          </label>
          <button className="btn" type="submit">
            Aplicar mora
          </button>
        </form>
      </div>

      <h2>Multas</h2>
      {multas.length === 0 ? (
        <p>No hay multas.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Motivo</th>
              <th>Monto</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {multas.map((m) => (
              <tr key={m.id_multa}>
                <td>{m.motivo}</td>
                <td>{dinero(m.monto)}</td>
                <td>{fecha(m.fecha)}</td>
                <td>{m.estado}</td>
                <td className="acciones">
                  {m.estado === "PENDIENTE" ? (
                    <>
                      <button
                        type="button"
                        className="btn-text"
                        onClick={() =>
                          void actualizarMulta(m.id_multa, "PAGADA")
                            .then(cargar)
                            .catch((err: Error) => setError(err.message))
                        }
                      >
                        Marcar pagada
                      </button>
                      <button
                        type="button"
                        className="btn-text"
                        onClick={() =>
                          void actualizarMulta(m.id_multa, "CONDONADA")
                            .then(cargar)
                            .catch((err: Error) => setError(err.message))
                        }
                      >
                        Condonar
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
