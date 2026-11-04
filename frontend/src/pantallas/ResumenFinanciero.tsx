import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { InsigniaEstado } from "../componentes/InsigniaEstado";
import { obtenerResumenFinanciero } from "../servicios/finanzas.servicio";
import type { ResumenCliente, ResumenFactura, ResumenFinancieroDatos } from "../tipos";

const montos = new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function dinero(valor: string | number) {
  return `Q${montos.format(Number(valor))}`;
}

function fecha(valor: string | null) {
  if (!valor) return "—";
  const [anio, mes, dia] = valor.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return "—";
  return new Date(Number(anio), Number(mes) - 1, Number(dia)).toLocaleDateString("es-GT");
}

function momentoActual() {
  return new Date().toLocaleString("es-GT", { timeZone: "America/Guatemala" });
}

function nombreVisible(cliente: ResumenCliente) {
  if (cliente.tipo_cliente === "EMPRESA") return cliente.razon_social ?? "Empresa";
  return `${cliente.nombres ?? ""} ${cliente.apellidos ?? ""}`.trim() || "Cliente";
}

function MarcaMora({ factura }: { factura: ResumenFactura }) {
  if (!factura.en_mora) return null;
  return <span className="insignia insignia-peligro">En mora</span>;
}

export function ResumenFinanciero() {
  const { id } = useParams();
  const [datos, setDatos] = useState<ResumenFinancieroDatos | null>(null);
  const [generadoEn, setGeneradoEn] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    obtenerResumenFinanciero(Number(id))
      .then((respuesta) => {
        if (!vigente) return;
        setDatos(respuesta);
        setGeneradoEn(momentoActual());
      })
      .catch((err: Error) => {
        if (vigente) setError(err.message);
      });
    return () => {
      vigente = false;
    };
  }, [id]);

  if (!datos) {
    return (
      <section>
        {error ? <p className="alerta">{error}</p> : <p>Cargando resumen…</p>}
      </section>
    );
  }

  const { cliente, contratos, facturas, pagos, totales } = datos;
  const enMora = facturas.filter((factura) => factura.dias_vencido !== null);

  return (
    <section className="resumen-financiero">
      <p className="solo-imprimir resumen-impresion">
        <span className="dato-fuerte">OSPI</span>
        <span>Generado: {generadoEn}</span>
      </p>
      <p className="no-imprimir">
        <Link to={`/clientes/${cliente.id_cliente}`}>← Cliente</Link>
      </p>
      <div className="page-head">
        <h1>Resumen financiero</h1>
        <button type="button" className="btn no-imprimir" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>
      <div className="resumen-ficha">
        <div>
          <span className="dato-etiqueta">Cliente</span>
          <span className="dato-fuerte">{nombreVisible(cliente)}</span>
        </div>
        <div>
          <span className="dato-etiqueta">Tipo</span>
          <span>{cliente.tipo_cliente === "EMPRESA" ? "Empresa" : "Individual"}</span>
        </div>
        <div>
          <span className="dato-etiqueta">Estado</span>
          <InsigniaEstado estado={cliente.estado} />
        </div>
      </div>

      <h2>Contratos</h2>
      {contratos.length === 0 ? (
        <p>No hay contratos.</p>
      ) : (
        <table className="tabla-contratos">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((contrato) => (
              <tr key={contrato.id_contrato}>
                <td>{contrato.numero}</td>
                <td>{fecha(contrato.fecha_inicio)}</td>
                <td className="dato-fuerte">{dinero(contrato.monto_total)}</td>
                <td>
                  <InsigniaEstado estado={contrato.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Facturas</h2>
      {facturas.length === 0 ? (
        <p>No hay facturas.</p>
      ) : (
        <table className="tabla-facturas">
          <thead>
            <tr>
              <th>Número</th>
              <th>Facturada</th>
              <th>Vencimiento</th>
              <th>Monto</th>
              <th>Pagado</th>
              <th>Saldo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((factura) => (
              <tr key={factura.id_factura}>
                <td>{factura.numero}</td>
                <td>{fecha(factura.fecha_emision)}</td>
                <td>{fecha(factura.fecha_vencimiento)}</td>
                <td className="dato-fuerte">{dinero(factura.monto)}</td>
                <td>{dinero(factura.pagado)}</td>
                <td>{dinero(factura.saldo)}</td>
                <td>
                  <span className="resumen-estado">
                    <InsigniaEstado estado={factura.estado} />
                    <MarcaMora factura={factura} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Pagos</h2>
      {pagos.length === 0 ? (
        <p>No hay pagos.</p>
      ) : (
        <table className="tabla-pagos">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Factura</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((pago) => (
              <tr key={pago.id_pago}>
                <td>{fecha(pago.fecha_pago)}</td>
                <td className="dato-fuerte">{dinero(pago.monto)}</td>
                <td>{pago.numero_factura}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Totales</h2>
      {totales.length === 0 ? (
        <p>No hay montos para totalizar.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Moneda</th>
              <th>Contratado</th>
              <th>Facturado</th>
              <th>Pagado</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {totales.map((total) => (
              <tr key={total.moneda}>
                <td>{total.moneda}</td>
                <td>{dinero(total.contratado)}</td>
                <td>{dinero(total.facturado)}</td>
                <td>{dinero(total.pagado)}</td>
                <td className="dato-fuerte">{dinero(total.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Mora</h2>
      {enMora.length === 0 ? (
        <p>No hay facturas vencidas con saldo pendiente.</p>
      ) : (
        enMora.map((factura) => (
          <div key={factura.id_factura} className="card" style={{ marginTop: 12 }}>
            <p>
              <span className="dato-fuerte">{factura.numero}</span>
              {" · "}
              {factura.dias_vencido} {factura.dias_vencido === 1 ? "día" : "días"} desde el vencimiento
              {" "}
              <MarcaMora factura={factura} />
            </p>
            {factura.multas.length === 0 ? (
              <p className="dato-secundario">Sin multas ligadas a esta factura.</p>
            ) : (
              <table className="tabla-multas">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Motivo</th>
                    <th>Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {factura.multas.map((multa) => (
                    <tr key={multa.id_multa}>
                      <td>{fecha(multa.fecha)}</td>
                      <td>{multa.motivo ?? "—"}</td>
                      <td>{dinero(multa.monto)}</td>
                      <td>
                        <InsigniaEstado estado={multa.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </section>
  );
}
