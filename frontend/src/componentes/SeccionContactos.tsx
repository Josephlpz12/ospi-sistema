import { type FormEvent, useEffect, useState } from "react";
import { useConfirmar } from "../contexto/ConfirmacionContexto";
import { useToast } from "../contexto/ToastContexto";
import { eliminarContacto, guardarContacto, listarContactos } from "../servicios/clientes.servicio";
import type { Contacto } from "../tipos";

type Props = {
  idCliente: number;
  puedeEditar: boolean;
};

const FORMULARIO_VACIO = { nombres: "", apellidos: "", cargo: "", telefono: "", correo: "", es_principal: false };

export function SeccionContactos({ idCliente, puedeEditar }: Props) {
  const confirmar = useConfirmar();
  const toast = useToast();
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [idEditando, setIdEditando] = useState<number | null>(null);

  async function cargar() {
    setContactos(await listarContactos(idCliente));
  }

  useEffect(() => {
    setIdEditando(null);
    setFormulario(FORMULARIO_VACIO);
    cargar().catch((err: Error) => toast.error(err.message));
  }, [idCliente]);

  function cambiar(campo: keyof typeof FORMULARIO_VACIO, valor: string | boolean) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }));
  }

  function editar(c: Contacto) {
    setIdEditando(c.id_contacto);
    setFormulario({
      nombres: c.nombres,
      apellidos: c.apellidos,
      cargo: c.cargo ?? "",
      telefono: c.telefono ?? "",
      correo: c.correo ?? "",
      es_principal: c.es_principal,
    });
  }

  function cancelar() {
    setIdEditando(null);
    setFormulario(FORMULARIO_VACIO);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    try {
      await guardarContacto(idCliente, formulario, idEditando ?? undefined);
      toast.exito(idEditando ? "Contacto actualizado" : "Contacto agregado");
      cancelar();
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el contacto");
    }
  }

  async function eliminar(c: Contacto) {
    const aceptado = await confirmar({
      titulo: "Eliminar contacto",
      mensaje: `¿Eliminar el contacto ${c.nombres} ${c.apellidos}?`,
      peligro: true,
    });
    if (!aceptado) return;
    try {
      await eliminarContacto(idCliente, c.id_contacto);
      toast.exito("Contacto eliminado");
      if (idEditando === c.id_contacto) cancelar();
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el contacto");
    }
  }

  return (
    <details className="card seccion-plegable">
      <summary>Contactos ({contactos.length})</summary>
      {puedeEditar ? (
        <form className="form-inline" onSubmit={(e) => void guardar(e)}>
          <input
            placeholder="Nombres"
            aria-label="Nombres"
            value={formulario.nombres}
            maxLength={100}
            onChange={(ev) => cambiar("nombres", ev.target.value)}
            required
          />
          <input
            placeholder="Apellidos"
            aria-label="Apellidos"
            value={formulario.apellidos}
            maxLength={100}
            onChange={(ev) => cambiar("apellidos", ev.target.value)}
            required
          />
          <input
            placeholder="Cargo (opcional)"
            aria-label="Cargo"
            value={formulario.cargo}
            maxLength={80}
            onChange={(ev) => cambiar("cargo", ev.target.value)}
          />
          <input
            type="tel"
            placeholder="Teléfono (opcional)"
            aria-label="Teléfono"
            value={formulario.telefono}
            maxLength={30}
            onChange={(ev) => cambiar("telefono", ev.target.value)}
          />
          <input
            type="email"
            placeholder="Correo (opcional)"
            aria-label="Correo"
            value={formulario.correo}
            maxLength={150}
            onChange={(ev) => cambiar("correo", ev.target.value)}
          />
          <label className="opcion-casilla">
            <input
              type="checkbox"
              checked={formulario.es_principal}
              onChange={(ev) => cambiar("es_principal", ev.target.checked)}
            />
            Contacto principal
          </label>
          <button className="btn btn-secundario" type="submit">
            {idEditando ? "Guardar cambios" : "Agregar contacto"}
          </button>
          {idEditando ? (
            <button className="btn btn-secundario" type="button" onClick={cancelar}>
              Cancelar
            </button>
          ) : null}
        </form>
      ) : null}
      {contactos.length === 0 ? (
        <p>Este cliente no tiene contactos.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cargo</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Principal</th>
              {puedeEditar ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {contactos.map((c) => (
              <tr key={c.id_contacto}>
                <td>
                  {c.nombres} {c.apellidos}
                </td>
                <td>{c.cargo ?? "—"}</td>
                <td>{c.telefono ?? "—"}</td>
                <td>{c.correo ?? "—"}</td>
                <td>{c.es_principal ? "Sí" : "No"}</td>
                {puedeEditar ? (
                  <td className="acciones">
                    <button type="button" className="btn btn-editar btn-compacto" onClick={() => editar(c)}>
                      Editar
                    </button>
                    <button type="button" className="btn btn-peligro btn-compacto" onClick={() => void eliminar(c)}>
                      Eliminar
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}
