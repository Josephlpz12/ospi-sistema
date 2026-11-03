import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InsigniaEstado } from "../componentes/InsigniaEstado";
import { useToast } from "../contexto/ToastContexto";
import {
  ESTADOS_PROSPECTO,
  FUENTES_PROSPECTO,
  listarProspectos,
  puedeConvertirProspecto,
} from "../servicios/prospectos.servicio";
import type { Prospecto } from "../tipos";

function nombrePersona(p: Pick<Prospecto, "nombres" | "apellidos">) {
  return `${p.nombres} ${p.apellidos}`.trim();
}

export function ProspectosLista() {
  const toast = useToast();
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [listo, setListo] = useState(false);
  const [estado, setEstado] = useState("");
  const [fuente, setFuente] = useState("");
  const [verCerrados, setVerCerrados] = useState(false);

  useEffect(() => {
    let vigente = true;
    setListo(false);
    listarProspectos({ estado, fuente, incluirCerrados: verCerrados })
      .then((lista) => {
        if (!vigente) return;
        setProspectos(lista);
        setListo(true);
      })
      .catch((err) => {
        if (vigente) toast.error(err instanceof Error ? err.message : "Error al cargar los prospectos");
      });
    return () => {
      vigente = false;
    };
  }, [estado, fuente, verCerrados, toast]);

  return (
    <section>
      <div className="page-head">
        <h1>Prospectos</h1>
        <Link className="btn" to="/prospectos/nuevo">
          Nuevo prospecto
        </Link>
      </div>
      <form className="card form-inline filtros-bitacora" onSubmit={(e) => e.preventDefault()}>
        <label>
          Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS_PROSPECTO.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fuente
          <select value={fuente} onChange={(e) => setFuente(e.target.value)}>
            <option value="">Todas</option>
            {FUENTES_PROSPECTO.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="opcion-casilla">
          <input type="checkbox" checked={verCerrados} onChange={(e) => setVerCerrados(e.target.checked)} />
          Ver descartados y convertidos
        </label>
      </form>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Empresa</th>
            <th>Fuente</th>
            <th>Estado</th>
            <th>Responsable</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {prospectos.map((p) => (
            <tr key={p.id_prospecto}>
              <td>{nombrePersona(p)}</td>
              <td>{p.empresa ?? "—"}</td>
              <td>{p.fuente}</td>
              <td>
                <InsigniaEstado estado={p.estado} />
              </td>
              <td>{p.nombre_responsable ?? "—"}</td>
              <td className="acciones">
                <Link className="btn btn-secundario btn-compacto" to={`/prospectos/${p.id_prospecto}`}>
                  Ver
                </Link>
                {p.estado !== "Convertido" ? (
                  <Link className="btn btn-editar btn-compacto" to={`/prospectos/${p.id_prospecto}/editar`}>
                    Editar
                  </Link>
                ) : null}
                {puedeConvertirProspecto(p.estado) ? (
                  <Link className="btn btn-positivo btn-compacto" to={`/prospectos/${p.id_prospecto}/convertir`}>
                    Convertir
                  </Link>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {listo && prospectos.length === 0 ? <p>No hay prospectos.</p> : null}
    </section>
  );
}
