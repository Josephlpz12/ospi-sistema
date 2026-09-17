import { type FormEvent, useEffect, useState } from "react";
import { eliminarDocumento, listarDocumentos, subirDocumento, urlDocumento } from "../servicios/documentos.servicio";
import type { Documento } from "../tipos";

type Props = {
  id_cliente?: number;
  id_proyecto?: number;
};

export function ListaDocumentos({ id_cliente, id_proyecto }: Props) {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [error, setError] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);

  async function cargar() {
    setDocs(await listarDocumentos({ id_cliente, id_proyecto }));
  }

  useEffect(() => {
    cargar().catch((err: Error) => setError(err.message));
  }, [id_cliente, id_proyecto]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    setError("");
    try {
      await subirDocumento(archivo, { id_cliente, id_proyecto });
      setArchivo(null);
      (e.target as HTMLFormElement).reset();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir");
    }
  }

  return (
    <article className="card">
      <h2>Documentos</h2>
      {error ? <p className="alerta">{error}</p> : null}
      <form className="form-inline" onSubmit={(ev) => void enviar(ev)}>
        <input type="file" onChange={(ev) => setArchivo(ev.target.files?.[0] ?? null)} required />
        <button className="btn" type="submit">
          Subir
        </button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Fecha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id_documento}>
              <td>
                <a href={urlDocumento(d.ruta_archivo)} target="_blank" rel="noreferrer">
                  {d.nombre}
                </a>
              </td>
              <td>{new Date(d.subido_en).toLocaleString("es-GT")}</td>
              <td>
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => {
                    if (confirm("¿Eliminar este documento?")) {
                      void eliminarDocumento(d.id_documento).then(cargar).catch((err: Error) => setError(err.message));
                    }
                  }}
                >
                  Quitar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {docs.length === 0 ? <p>No hay documentos.</p> : null}
    </article>
  );
}
