import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ListaDocumentos } from "../componentes/ListaDocumentos";
import { obtenerFichaCliente } from "../servicios/clientes.servicio";
import { crearSuscripcion, listarProductos } from "../servicios/finanzas.servicio";
import type { Cliente, Producto, Proyecto, Suscripcion } from "../tipos";

function nombreVisible(c: Cliente) {
  if (c.tipo_cliente === "EMPRESA") return c.razon_social ?? "Empresa";
  return `${c.nombres ?? ""} ${c.apellidos ?? ""}`.trim();
}

function fecha(valor: string | null) {
  return valor ? valor.slice(0, 10) : "—";
}

export function ClienteFicha() {
  const { id } = useParams();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState("");
  const [subForm, setSubForm] = useState({ id_producto: "", fecha_inicio: new Date().toISOString().slice(0, 10) });

  async function cargar() {
    if (!id) return;
    const datos = await obtenerFichaCliente(Number(id));
    setCliente(datos.cliente);
    setProyectos(datos.proyectos);
    setSuscripciones(datos.suscripciones ?? []);
  }

  useEffect(() => {
    cargar().catch((err: Error) => setError(err.message));
    listarProductos()
      .then(setProductos)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  async function altaSuscripcion(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError("");
    try {
      await crearSuscripcion(Number(id), {
        id_producto: Number(subForm.id_producto),
        fecha_inicio: subForm.fecha_inicio,
      });
      setSubForm((p) => ({ ...p, id_producto: "" }));
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la suscripción");
    }
  }

  if (!cliente) {
    return (
      <section>
        {error ? <p className="alerta">{error}</p> : <p>Cargando cliente…</p>}
      </section>
    );
  }

  return (
    <section>
      <p>
        <Link to="/clientes">← Clientes</Link>
      </p>
      <div className="page-head">
        <h1>{nombreVisible(cliente)}</h1>
        <Link className="btn" to={`/clientes/${cliente.id_cliente}/editar`}>
          Editar
        </Link>
      </div>
      {error ? <p className="alerta">{error}</p> : null}
      {cliente.estado === "SUSPENDIDO" ? (
        <p className="aviso-suspendido">Servicio suspendido por mora. Regularice facturas y multas, luego reactive el contrato.</p>
      ) : null}
      <p className="muted-line">
        {cliente.tipo_cliente === "EMPRESA" ? "Empresa" : "Individual"} · {cliente.estado}
      </p>
      <p>
        <Link to={`/contratos?id_cliente=${cliente.id_cliente}`}>Ver contratos de este cliente</Link>
      </p>

      <h2>Suscripciones (servicio)</h2>
      {suscripciones.length === 0 ? (
        <p>Este cliente no tiene suscripciones.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {suscripciones.map((s) => (
              <tr key={s.id_suscripcion}>
                <td>{s.nombre_producto}</td>
                <td>{fecha(s.fecha_inicio)}</td>
                <td>{fecha(s.fecha_fin)}</td>
                <td>{s.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form className="form-inline" onSubmit={altaSuscripcion}>
        <select
          value={subForm.id_producto}
          onChange={(e) => setSubForm((p) => ({ ...p, id_producto: e.target.value }))}
          required
        >
          <option value="">Producto…</option>
          {productos.map((p) => (
            <option key={p.id_producto} value={p.id_producto}>
              {p.nombre}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={subForm.fecha_inicio}
          onChange={(e) => setSubForm((p) => ({ ...p, fecha_inicio: e.target.value }))}
        />
        <button className="btn" type="submit">
          Alta suscripción
        </button>
      </form>

      <h2>Proyectos</h2>
      {proyectos.length === 0 ? (
        <p>Este cliente no tiene proyectos.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Avance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {proyectos.map((p) => (
              <tr key={p.id_proyecto}>
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>{p.estado}</td>
                <td>{Number(p.porcentaje_avance)}%</td>
                <td className="acciones">
                  <Link to={`/proyectos/${p.id_proyecto}/seguimiento`}>Seguimiento</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 20 }}>
        <ListaDocumentos id_cliente={cliente.id_cliente} />
      </div>
    </section>
  );
}
