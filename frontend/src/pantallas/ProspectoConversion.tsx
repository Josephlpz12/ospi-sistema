import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useConfirmar } from "../contexto/ConfirmacionContexto";
import { useToast } from "../contexto/ToastContexto";
import { listarClientes, listarContactos } from "../servicios/clientes.servicio";
import { convertirProspecto, obtenerProspecto, puedeConvertirProspecto } from "../servicios/prospectos.servicio";
import type { Cliente, Prospecto } from "../tipos";

function nombreCliente(c: Cliente) {
  if (c.tipo_cliente === "EMPRESA") return c.razon_social ?? `Empresa #${c.id_cliente}`;
  return `${c.nombres ?? ""} ${c.apellidos ?? ""}`.trim() || `Cliente #${c.id_cliente}`;
}

function mismaRazon(razon: string | null, empresa: string) {
  return (razon ?? "").trim().toLocaleLowerCase("es") === empresa.trim().toLocaleLowerCase("es");
}

export function ProspectoConversion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirmar = useConfirmar();
  const toast = useToast();
  const [prospecto, setProspecto] = useState<Prospecto | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modo, setModo] = useState<"nuevo" | "existente">("nuevo");
  const [idCliente, setIdCliente] = useState("");
  const [tienePrincipal, setTienePrincipal] = useState<boolean | null>(null);
  const [crearProyecto, setCrearProyecto] = useState(false);
  const [nombreProyecto, setNombreProyecto] = useState("");
  const [descripcionProyecto, setDescripcionProyecto] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!id) return;
    obtenerProspecto(Number(id))
      .then((datos) => {
        setProspecto(datos);
        const sugerido = datos.empresa?.trim() || `${datos.nombres} ${datos.apellidos}`.trim();
        setNombreProyecto(sugerido);
        if (!datos.empresa?.trim()) setModo("existente");
      })
      .catch((err: Error) => setError(err.message));
    listarClientes()
      .then(setClientes)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (modo !== "existente" || !idCliente) {
      setTienePrincipal(null);
      return;
    }
    let vigente = true;
    listarContactos(Number(idCliente))
      .then((contactos) => {
        if (vigente) setTienePrincipal(contactos.some((contacto) => contacto.es_principal));
      })
      .catch((err: Error) => {
        if (vigente) setError(err.message);
      });
    return () => {
      vigente = false;
    };
  }, [modo, idCliente]);

  const empresa = prospecto?.empresa?.trim() ?? "";
  const duplicados = empresa ? clientes.filter((c) => c.tipo_cliente === "EMPRESA" && mismaRazon(c.razon_social, empresa)) : [];
  const puedeNuevo = empresa !== "";

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!prospecto || !id) return;
    setError("");
    let confirmarDuplicado = false;
    if (modo === "nuevo" && duplicados.length > 0) {
      const nombres = duplicados.map(nombreCliente).join(", ");
      const extra = crearProyecto ? ` También se creará el proyecto «${nombreProyecto}» en cotización.` : "";
      const aceptado = await confirmar({
        titulo: "Razón social repetida",
        mensaje: `Ya existe un cliente con la razón social «${empresa}»: ${nombres}. ¿Crear otro cliente de todas formas y convertir el prospecto?${extra}`,
        textoConfirmar: "Crear otro",
      });
      if (!aceptado) return;
      confirmarDuplicado = true;
    } else {
      const mensaje = crearProyecto
        ? `¿Convertir este prospecto en cliente y crear el proyecto «${nombreProyecto}» en cotización?`
        : "¿Convertir este prospecto en cliente?";
      const aceptado = await confirmar({ titulo: "Convertir prospecto", mensaje });
      if (!aceptado) return;
    }

    setCargando(true);
    try {
      await ejecutar(confirmarDuplicado);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo convertir";
      if (!confirmarDuplicado && mensaje.includes("Confirme si desea crear otro")) {
        const aceptado = await confirmar({
          titulo: "Razón social repetida",
          mensaje,
          textoConfirmar: "Crear otro",
        });
        if (!aceptado) {
          setCargando(false);
          return;
        }
        try {
          await ejecutar(true);
        } catch (reintento) {
          setError(reintento instanceof Error ? reintento.message : "No se pudo convertir");
        }
      } else {
        setError(mensaje);
      }
    } finally {
      setCargando(false);
    }
  }

  async function ejecutar(confirmarDuplicado: boolean) {
    if (!id) return;
    await convertirProspecto(Number(id), {
      modo,
      id_cliente: modo === "existente" ? Number(idCliente) : undefined,
      confirmar_duplicado: confirmarDuplicado,
      crear_proyecto: crearProyecto,
      nombre_proyecto: crearProyecto ? nombreProyecto : undefined,
      descripcion_proyecto: crearProyecto ? descripcionProyecto || null : undefined,
    });
    toast.exito("Prospecto convertido");
    navigate(`/prospectos/${id}`);
  }

  if (!prospecto) {
    return (
      <section>
        {error ? <p className="alerta">{error}</p> : <p>Cargando prospecto…</p>}
      </section>
    );
  }

  if (!puedeConvertirProspecto(prospecto.estado)) {
    return (
      <section>
        <p>
          <Link to={`/prospectos/${prospecto.id_prospecto}`}>← Prospecto</Link>
        </p>
        <p className="alerta">Solo se puede convertir un prospecto contactado o calificado.</p>
      </section>
    );
  }

  return (
    <section>
      <p>
        <Link to={`/prospectos/${prospecto.id_prospecto}`}>← Prospecto</Link>
      </p>
      <h1>Convertir prospecto</h1>
      <p className="dato-secundario">
        {prospecto.nombres} {prospecto.apellidos}
        {empresa ? ` · ${empresa}` : ""}
      </p>
      {error ? <p className="alerta">{error}</p> : null}
      <form className="card form" onSubmit={enviar}>
        <label className="opcion-casilla">
          <input
            type="radio"
            name="modo"
            checked={modo === "nuevo"}
            disabled={!puedeNuevo}
            onChange={() => setModo("nuevo")}
          />
          Crear un cliente nuevo con la empresa del prospecto
        </label>
        {!puedeNuevo ? <p className="alerta">Indique la empresa del prospecto para crear un cliente nuevo.</p> : null}
        {modo === "nuevo" && puedeNuevo ? (
          <>
            <p>
              Se creará la empresa «{empresa}» en estado activo, con {prospecto.nombres} {prospecto.apellidos} como
              contacto principal.
            </p>
            {duplicados.length > 0 ? (
              <p className="alerta">
                Ya existe un cliente con esta razón social: {duplicados.map(nombreCliente).join(", ")}. Puede vincularlo
                o confirmar la creación de otro.
              </p>
            ) : null}
          </>
        ) : null}
        <label className="opcion-casilla">
          <input type="radio" name="modo" checked={modo === "existente"} onChange={() => setModo("existente")} />
          Vincular a un cliente existente
        </label>
        {modo === "existente" ? (
          <>
            <label>
              Cliente
              <select value={idCliente} onChange={(e) => setIdCliente(e.target.value)} required>
                <option value="">Seleccione…</option>
                {clientes
                  .filter((c) => c.estado === "ACTIVO")
                  .map((c) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {nombreCliente(c)}
                    </option>
                  ))}
              </select>
            </label>
            {idCliente && tienePrincipal !== null ? (
              <p>
                {tienePrincipal
                  ? "Se creará el contacto de esta persona. No será el principal, porque el cliente ya tiene uno."
                  : "Se creará el contacto de esta persona como contacto principal, porque el cliente aún no tiene uno."}
              </p>
            ) : null}
          </>
        ) : null}
        <label className="opcion-casilla">
          <input type="checkbox" checked={crearProyecto} onChange={(e) => setCrearProyecto(e.target.checked)} />
          Crear un proyecto en cotización
        </label>
        {crearProyecto ? (
          <>
            <label>
              Nombre del proyecto
              <input value={nombreProyecto} onChange={(e) => setNombreProyecto(e.target.value)} required />
            </label>
            <label>
              Descripción
              <textarea value={descripcionProyecto} onChange={(e) => setDescripcionProyecto(e.target.value)} rows={3} />
            </label>
          </>
        ) : null}
        <div className="form-actions">
          <button
            className="btn btn-positivo"
            type="submit"
            disabled={cargando || (modo === "nuevo" && !puedeNuevo) || (modo === "existente" && !idCliente)}
          >
            Convertir
          </button>
          <Link className="btn btn-secundario" to={`/prospectos/${prospecto.id_prospecto}`}>
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
