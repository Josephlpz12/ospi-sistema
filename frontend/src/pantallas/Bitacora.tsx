import { useEffect, useState } from "react";
import { useToast } from "../contexto/ToastContexto";
import { listarBitacora, type FiltrosBitacora, type PaginaBitacora } from "../servicios/bitacora.servicio";
import { listarUsuarios } from "../servicios/usuarios.servicio";
import type { Usuario } from "../tipos";

const TIPOS_REGISTRO: Record<string, string> = {
  clientes: "Cliente",
  proyectos: "Proyecto",
  fases_proyecto: "Fase",
  tareas: "Tarea",
  contratos: "Contrato",
  facturas: "Factura",
  pagos: "Pago",
  multas: "Multa",
  suscripciones: "Suscripción",
  usuarios: "Usuario",
  asignaciones: "Asignación",
  comentarios: "Comentario",
  contactos_cliente: "Contacto",
  direcciones: "Dirección",
  prospectos: "Prospecto",
};

const ACCIONES: Record<string, string> = {
  CREAR: "Creación",
  EDITAR: "Edición",
  CAMBIAR_ESTADO: "Cambio de estado",
  INACTIVAR: "Inactivación",
  ACTIVAR: "Activación",
  ELIMINAR: "Eliminación",
  RESTABLECER_CLAVE: "Restablecimiento de contraseña",
  ASIGNAR: "Asignación",
  DESASIGNAR: "Desasignación",
  COMENTAR: "Comentario",
  CONVERTIR: "Conversión",
};

const FILTROS_INICIALES: FiltrosBitacora = { pagina: 1, id_usuario: "", tabla: "", desde: "", hasta: "" };

function formatearMomento(valor: string) {
  return new Date(valor).toLocaleString("es-GT", { timeZone: "America/Guatemala" });
}

export function Bitacora() {
  const [filtros, setFiltros] = useState<FiltrosBitacora>(FILTROS_INICIALES);
  const [datos, setDatos] = useState<PaginaBitacora | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const toast = useToast();

  useEffect(() => {
    listarUsuarios()
      .then(setUsuarios)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Error al cargar los usuarios"));
  }, [toast]);

  useEffect(() => {
    let vigente = true;
    listarBitacora(filtros)
      .then((pagina) => {
        if (vigente) setDatos(pagina);
      })
      .catch((err) => {
        if (vigente) toast.error(err instanceof Error ? err.message : "Error al cargar la bitácora");
      });
    return () => {
      vigente = false;
    };
  }, [filtros, toast]);

  function cambiarFiltro(campo: "id_usuario" | "tabla" | "desde" | "hasta", valor: string) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor, pagina: 1 }));
  }

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.tamano)) : 1;

  return (
    <section>
      <div className="page-head">
        <h1>Bitácora</h1>
      </div>
      <form className="card form-inline filtros-bitacora" onSubmit={(e) => e.preventDefault()}>
        <label>
          Usuario
          <select value={filtros.id_usuario} onChange={(e) => cambiarFiltro("id_usuario", e.target.value)}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id_usuario} value={u.id_usuario}>
                {u.nombre_usuario}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo de registro
          <select value={filtros.tabla} onChange={(e) => cambiarFiltro("tabla", e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(TIPOS_REGISTRO).map(([valor, nombre]) => (
              <option key={valor} value={valor}>
                {nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => cambiarFiltro("desde", e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => cambiarFiltro("hasta", e.target.value)} />
        </label>
        <button type="button" className="btn-text" onClick={() => setFiltros(FILTROS_INICIALES)}>
          Limpiar filtros
        </button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Fecha y hora</th>
            <th>Usuario</th>
            <th>Tipo de registro</th>
            <th>Acción</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {datos?.registros.map((r) => (
            <tr key={r.id_historial}>
              <td>{formatearMomento(r.creado_en)}</td>
              <td>{r.nombre_usuario ?? "Sistema"}</td>
              <td>
                {TIPOS_REGISTRO[r.tabla] ?? r.tabla} #{r.id_registro}
              </td>
              <td>{ACCIONES[r.accion] ?? r.accion}</td>
              <td>
                {r.lineas.length > 0 ? (
                  <ul className="detalle-bitacora">
                    {r.lineas.map((linea, indice) => (
                      <li key={indice}>{linea}</li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {datos && datos.registros.length === 0 ? <p>No hay registros para los filtros seleccionados.</p> : null}
      {datos && datos.total > 0 ? (
        <div className="paginacion">
          <button
            type="button"
            className="btn btn-secundario"
            disabled={filtros.pagina <= 1}
            onClick={() => setFiltros((actuales) => ({ ...actuales, pagina: actuales.pagina - 1 }))}
          >
            Anterior
          </button>
          <span>
            Página {datos.pagina} de {totalPaginas} · {datos.total} registros
          </span>
          <button
            type="button"
            className="btn btn-secundario"
            disabled={filtros.pagina >= totalPaginas}
            onClick={() => setFiltros((actuales) => ({ ...actuales, pagina: actuales.pagina + 1 }))}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </section>
  );
}
