import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EnlaceVolver } from "../componentes/EnlaceVolver";
import { InsigniaEstado } from "../componentes/InsigniaEstado";
import { useConfirmar } from "../contexto/ConfirmacionContexto";
import { useToast } from "../contexto/ToastContexto";
import {
  ESTADOS_ABIERTOS_PROSPECTO,
  cambiarEstadoProspecto,
  obtenerProspecto,
  puedeConvertirProspecto,
} from "../servicios/prospectos.servicio";
import type { Prospecto } from "../tipos";

function momento(valor: string | null) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("es-GT", { timeZone: "America/Guatemala" });
}

function texto(valor: string | null) {
  return valor && valor.trim() !== "" ? valor : "—";
}

export function ProspectoFicha() {
  const { id } = useParams();
  const confirmar = useConfirmar();
  const toast = useToast();
  const [prospecto, setProspecto] = useState<Prospecto | null>(null);
  const [estadoNuevo, setEstadoNuevo] = useState("");
  const [error, setError] = useState("");

  async function cargar() {
    if (!id) return;
    const datos = await obtenerProspecto(Number(id));
    setProspecto(datos);
    setEstadoNuevo(datos.estado);
  }

  useEffect(() => {
    cargar().catch((err: Error) => setError(err.message));
  }, [id]);

  async function cambiarEstado() {
    if (!prospecto || estadoNuevo === prospecto.estado) return;
    const aceptado = await confirmar({
      titulo: "Cambiar estado",
      mensaje: `¿Cambiar el estado de ${prospecto.estado} a ${estadoNuevo}?`,
      peligro: estadoNuevo === "Descartado",
    });
    if (!aceptado) return;
    try {
      const actualizado = await cambiarEstadoProspecto(prospecto.id_prospecto, estadoNuevo);
      setProspecto(actualizado);
      setEstadoNuevo(actualizado.estado);
      toast.exito("Estado actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    }
  }

  if (!prospecto) {
    return (
      <section>
        {error ? <p className="alerta">{error}</p> : <p>Cargando prospecto…</p>}
      </section>
    );
  }

  const abierto = prospecto.estado !== "Convertido";

  return (
    <section>
      <EnlaceVolver to="/prospectos">Prospectos</EnlaceVolver>
      <div className="page-head">
        <h1>
          {prospecto.nombres} {prospecto.apellidos}
        </h1>
        <div className="acciones">
          {puedeConvertirProspecto(prospecto.estado) ? (
            <Link className="btn btn-positivo" to={`/prospectos/${prospecto.id_prospecto}/convertir`}>
              Convertir
            </Link>
          ) : null}
          {abierto ? (
            <Link className="btn btn-editar" to={`/prospectos/${prospecto.id_prospecto}/editar`}>
              Editar
            </Link>
          ) : null}
        </div>
      </div>
      <div className="resumen-ficha">
        <div>
          <span className="dato-etiqueta">Estado</span>
          <InsigniaEstado estado={prospecto.estado} />
        </div>
        <div>
          <span className="dato-etiqueta">Empresa</span>
          <span className="dato-fuerte">{texto(prospecto.empresa)}</span>
        </div>
        <div>
          <span className="dato-etiqueta">Fuente</span>
          <span>{prospecto.fuente}</span>
        </div>
      </div>
      <div className="card">
        <p>
          <span className="dato-etiqueta">Cargo</span>
          {texto(prospecto.cargo)}
        </p>
        <p>
          <span className="dato-etiqueta">Correo</span>
          {texto(prospecto.correo)}
        </p>
        <p>
          <span className="dato-etiqueta">Teléfono</span>
          {texto(prospecto.telefono)}
        </p>
        <p>
          <span className="dato-etiqueta">Responsable</span>
          {texto(prospecto.nombre_responsable)}
        </p>
        <p>
          <span className="dato-etiqueta">Notas</span>
          {texto(prospecto.notas)}
        </p>
        <p>
          <span className="dato-etiqueta">Creado</span>
          {momento(prospecto.creado_en)}
        </p>
        {prospecto.estado === "Convertido" ? (
          <p>
            <span className="dato-etiqueta">Convertido</span>
            {momento(prospecto.convertido_en)}
            {prospecto.id_cliente ? (
              <>
                {" "}
                · <Link to={`/clientes/${prospecto.id_cliente}`}>{prospecto.nombre_cliente ?? "Ver cliente"}</Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      {abierto ? (
        <form
          className="card form-inline cambiar-estado-prospecto"
          style={{ marginTop: 16 }}
          onSubmit={(e) => {
            e.preventDefault();
            void cambiarEstado();
          }}
        >
          <label>
            Cambiar estado
            <select value={estadoNuevo} onChange={(e) => setEstadoNuevo(e.target.value)}>
              {ESTADOS_ABIERTOS_PROSPECTO.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-secundario" type="submit" disabled={estadoNuevo === prospecto.estado}>
            Cambiar estado
          </button>
        </form>
      ) : null}
    </section>
  );
}
