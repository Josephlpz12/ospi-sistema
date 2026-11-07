import { type FormEvent, useEffect, useState } from "react";
import { esAdministrador } from "../autorizacion";
import { useConfirmar } from "../contexto/ConfirmacionContexto";
import { useAuth } from "../contexto/AuthContexto";
import { useToast } from "../contexto/ToastContexto";
import { abrirDocumento, eliminarDocumento, listarDocumentos, subirDocumento } from "../servicios/documentos.servicio";
import type { Documento } from "../tipos";

type Props = {
  id_cliente?: number;
  id_proyecto?: number;
};

export function ListaDocumentos({ id_cliente, id_proyecto }: Props) {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const toast = useToast();
  const admin = esAdministrador(usuario?.nombre_rol);
  const [docs, setDocs] = useState<Documento[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);

  async function cargar() {
    setDocs(await listarDocumentos({ id_cliente, id_proyecto }));
  }

  useEffect(() => {
    cargar().catch((err: Error) => toast.error(err.message));
  }, [id_cliente, id_proyecto]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    try {
      await subirDocumento(archivo, { id_cliente, id_proyecto });
      toast.exito("Documento subido");
      setArchivo(null);
      (e.target as HTMLFormElement).reset();
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir");
    }
  }

  async function abrir(documento: Documento) {
    try {
      await abrirDocumento(documento.id_documento, documento.nombre);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo abrir el documento");
    }
  }

  async function quitar(idDocumento: number) {
    const aceptado = await confirmar({
      titulo: "Eliminar documento",
      mensaje: "¿Eliminar este documento?",
      peligro: true,
    });
    if (!aceptado) return;
    try {
      await eliminarDocumento(idDocumento);
      toast.exito("Documento eliminado");
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el documento");
    }
  }

  return (
    <article className="card">
      <h2>Documentos</h2>
      {admin ? (
        <form className="form-inline" onSubmit={(ev) => void enviar(ev)}>
          <input type="file" onChange={(ev) => setArchivo(ev.target.files?.[0] ?? null)} required />
          <button className="btn btn-secundario" type="submit">
            Subir
          </button>
        </form>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Fecha</th>
            {admin ? <th></th> : null}
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id_documento}>
              <td>
                <button type="button" className="btn-text" onClick={() => void abrir(d)}>
                  {d.nombre}
                </button>
              </td>
              <td>{new Date(d.subido_en).toLocaleString("es-GT")}</td>
              {admin ? (
                <td>
                  <button
                    type="button"
                    className="btn btn-peligro btn-compacto"
                    onClick={() => void quitar(d.id_documento)}
                  >
                    Quitar
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {docs.length === 0 ? <p>No hay documentos.</p> : null}
    </article>
  );
}
