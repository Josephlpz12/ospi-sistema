import type { PoolClient } from "pg";
import { pool } from "../db.js";

export const TABLAS_BITACORA = [
  "clientes",
  "proyectos",
  "fases_proyecto",
  "tareas",
  "contratos",
  "facturas",
  "pagos",
  "usuarios",
  "multas",
  "suscripciones",
] as const;

export type TablaBitacora = (typeof TABLAS_BITACORA)[number];

export type AccionBitacora =
  | "CREAR"
  | "EDITAR"
  | "CAMBIAR_ESTADO"
  | "INACTIVAR"
  | "ACTIVAR"
  | "ELIMINAR"
  | "RESTABLECER_CLAVE";

type Fila = Record<string, unknown>;
type Valor = string | number | boolean | null;
type FilaLimpia = Record<string, Valor>;
type Ejecutor = Pick<PoolClient, "query">;

export type DatosCambio = {
  idUsuario: number | null | undefined;
  tabla: TablaBitacora;
  idRegistro: number;
  accion: AccionBitacora;
  antes?: Fila | null;
  despues?: Fila | null;
  nota?: string;
};

const CAMPOS_PROHIBIDOS = /pass|hash|clave/i;

const CAMPOS_POR_TABLA: Record<TablaBitacora, string[]> = {
  clientes: [
    "tipo_cliente",
    "estado",
    "origen",
    "observaciones",
    "nombres",
    "apellidos",
    "dpi",
    "nit_individual",
    "telefono_individual",
    "correo_individual",
    "razon_social",
    "nombre_comercial",
    "nit_empresa",
    "representante_legal",
    "telefono_empresa",
    "correo_empresa",
  ],
  proyectos: [
    "codigo",
    "nombre",
    "descripcion",
    "nombre_cliente",
    "estado",
    "id_responsable",
    "fecha_inicio",
    "fecha_fin_plan",
    "fecha_fin_real",
    "porcentaje_avance",
  ],
  fases_proyecto: ["id_proyecto", "nombre", "orden", "fecha_inicio", "fecha_fin", "estado"],
  tareas: [
    "id_proyecto",
    "titulo",
    "descripcion",
    "nombre_fase",
    "nombre_asignado",
    "estado",
    "fecha_limite",
    "porcentaje",
  ],
  contratos: [
    "numero",
    "nombre_cliente",
    "nombre_proyecto",
    "fecha_inicio",
    "fecha_fin",
    "monto_total",
    "moneda",
    "clausula_mora",
    "estado",
  ],
  facturas: ["id_contrato", "numero", "fecha_emision", "fecha_vencimiento", "monto", "estado"],
  pagos: ["id_factura", "fecha_pago", "monto", "metodo", "referencia"],
  multas: ["id_contrato", "id_factura", "motivo", "monto", "fecha", "estado"],
  suscripciones: ["id_cliente", "id_producto", "estado", "fecha_inicio", "fecha_fin"],
  usuarios: ["nombre_usuario", "correo", "nombre_rol", "activo"],
};

const ETIQUETAS: Record<string, string> = {
  tipo_cliente: "Tipo de cliente",
  estado: "Estado",
  origen: "Origen",
  observaciones: "Observaciones",
  nombres: "Nombres",
  apellidos: "Apellidos",
  dpi: "DPI",
  nit_individual: "NIT",
  telefono_individual: "Teléfono",
  correo_individual: "Correo",
  razon_social: "Razón social",
  nombre_comercial: "Nombre comercial",
  nit_empresa: "NIT",
  representante_legal: "Representante legal",
  telefono_empresa: "Teléfono",
  correo_empresa: "Correo",
  codigo: "Código",
  nombre: "Nombre",
  descripcion: "Descripción",
  nombre_cliente: "Cliente",
  id_responsable: "Responsable (id)",
  fecha_inicio: "Fecha de inicio",
  fecha_fin_plan: "Fecha de fin planificada",
  fecha_fin_real: "Fecha de fin real",
  porcentaje_avance: "Avance (%)",
  id_proyecto: "Proyecto (id)",
  orden: "Orden",
  fecha_fin: "Fecha de fin",
  titulo: "Título",
  nombre_fase: "Fase",
  nombre_asignado: "Asignado a",
  fecha_limite: "Fecha límite",
  porcentaje: "Avance (%)",
  numero: "Número",
  nombre_proyecto: "Proyecto",
  monto_total: "Monto total",
  moneda: "Moneda",
  clausula_mora: "Cláusula de mora",
  id_contrato: "Contrato (id)",
  fecha_emision: "Fecha de emisión",
  fecha_vencimiento: "Fecha de vencimiento",
  monto: "Monto",
  id_factura: "Factura (id)",
  fecha_pago: "Fecha de pago",
  metodo: "Método de pago",
  referencia: "Referencia",
  motivo: "Motivo",
  fecha: "Fecha",
  id_cliente: "Cliente (id)",
  id_producto: "Producto (id)",
  nombre_usuario: "Usuario",
  correo: "Correo",
  nombre_rol: "Rol",
  activo: "Estado",
};

const CAMPOS_CODIGO = new Set(["estado", "tipo_cliente"]);

const COLUMNAS_ID = {
  clientes: "id_cliente",
  contratos: "id_contrato",
  facturas: "id_factura",
  suscripciones: "id_suscripcion",
} as const;

function dosDigitos(numero: number) {
  return String(numero).padStart(2, "0");
}

function normalizar(valor: unknown): Valor {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    const medianoche =
      valor.getHours() === 0 && valor.getMinutes() === 0 && valor.getSeconds() === 0 && valor.getMilliseconds() === 0;
    if (medianoche) {
      return `${valor.getFullYear()}-${dosDigitos(valor.getMonth() + 1)}-${dosDigitos(valor.getDate())}`;
    }
    return valor.toISOString();
  }
  if (typeof valor === "string") {
    const texto = valor.trim();
    return texto === "" ? null : texto;
  }
  if (typeof valor === "number" || typeof valor === "boolean") return valor;
  return String(valor);
}

function limpiar(tabla: TablaBitacora, fila: Fila | null | undefined): FilaLimpia {
  const limpia: FilaLimpia = {};
  if (!fila) return limpia;
  for (const campo of CAMPOS_POR_TABLA[tabla]) {
    if (CAMPOS_PROHIBIDOS.test(campo) || !(campo in fila)) continue;
    limpia[campo] = normalizar(fila[campo]);
  }
  return limpia;
}

function soloCambios(antes: FilaLimpia, despues: FilaLimpia) {
  const cambiosAntes: FilaLimpia = {};
  const cambiosDespues: FilaLimpia = {};
  for (const campo of new Set([...Object.keys(antes), ...Object.keys(despues)])) {
    const previo = antes[campo] ?? null;
    const nuevo = despues[campo] ?? null;
    if (previo !== nuevo) {
      cambiosAntes[campo] = previo;
      cambiosDespues[campo] = nuevo;
    }
  }
  return { antes: cambiosAntes, despues: cambiosDespues };
}

export async function registrarCambio(ejecutor: Ejecutor, datos: DatosCambio) {
  const comparando = Boolean(datos.antes && datos.despues);
  const limpioAntes = limpiar(datos.tabla, datos.antes);
  const limpioDespues = limpiar(datos.tabla, datos.despues);
  const contenido = comparando
    ? soloCambios(limpioAntes, limpioDespues)
    : { antes: limpioAntes, despues: limpioDespues };

  const camposAntes = Object.keys(contenido.antes);
  const camposDespues = Object.keys(contenido.despues);
  if (comparando && camposDespues.length === 0 && !datos.nota) return;

  let accion = datos.accion;
  if (accion === "EDITAR" && comparando && camposDespues.length === 1 && camposDespues[0] === "estado") {
    accion = "CAMBIAR_ESTADO";
  }

  const detalle = JSON.stringify({
    antes: camposAntes.length > 0 ? contenido.antes : undefined,
    despues: camposDespues.length > 0 ? contenido.despues : undefined,
    nota: datos.nota,
  });

  await ejecutor.query(
    `INSERT INTO historial_cambios (tabla, id_registro, accion, id_usuario, detalle)
     VALUES ($1, $2, $3, $4, $5)`,
    [datos.tabla, datos.idRegistro, accion, datos.idUsuario ?? null, detalle === "{}" ? null : detalle],
  );
}

export async function registrarCambioAparte(datos: DatosCambio) {
  try {
    await registrarCambio(pool, datos);
  } catch (error) {
    console.error("No se pudo escribir en la bitácora", error);
  }
}

export async function cambiarEstadoRegistrado(
  ejecutor: Ejecutor,
  datos: {
    idUsuario: number | null | undefined;
    tabla: keyof typeof COLUMNAS_ID;
    id: number;
    estado: string;
    nota?: string;
  },
) {
  const columna = COLUMNAS_ID[datos.tabla];
  const resultado = await ejecutor.query(
    `UPDATE ${datos.tabla} t SET estado = $2
     FROM (SELECT estado FROM ${datos.tabla} WHERE ${columna} = $1) previo
     WHERE t.${columna} = $1
     RETURNING previo.estado AS estado_anterior`,
    [datos.id, datos.estado],
  );
  const fila = resultado.rows[0];
  if (!fila) return;
  await registrarCambio(ejecutor, {
    idUsuario: datos.idUsuario,
    tabla: datos.tabla,
    idRegistro: datos.id,
    accion: "CAMBIAR_ESTADO",
    antes: { estado: fila.estado_anterior },
    despues: { estado: datos.estado },
    nota: datos.nota,
  });
}

function formatear(campo: string, valor: Valor | undefined) {
  if (valor === null || valor === undefined) return "(vacío)";
  if (typeof valor === "boolean") {
    if (campo === "activo") return valor ? "Activo" : "Inactivo";
    return valor ? "Sí" : "No";
  }
  if (typeof valor === "number") return String(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${anio}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    return new Date(valor).toLocaleString("es-GT", { timeZone: "America/Guatemala" });
  }
  if (CAMPOS_CODIGO.has(campo) && /^[A-Z][A-Z_]+$/.test(valor)) {
    const texto = valor.replace(/_/g, " ").toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  return valor;
}

function etiqueta(campo: string) {
  return ETIQUETAS[campo] ?? campo;
}

export function describirDetalle(detalle: string | null) {
  if (!detalle) return [];
  let datos: { antes?: FilaLimpia; despues?: FilaLimpia; nota?: string };
  try {
    datos = JSON.parse(detalle);
  } catch {
    return [detalle];
  }

  const lineas: string[] = [];
  if (datos.antes && datos.despues) {
    for (const campo of Object.keys(datos.despues)) {
      lineas.push(
        `${etiqueta(campo)}: de ${formatear(campo, datos.antes[campo])} a ${formatear(campo, datos.despues[campo])}`,
      );
    }
  } else {
    const fila = datos.despues ?? datos.antes ?? {};
    for (const [campo, valor] of Object.entries(fila)) {
      if (valor !== null) lineas.push(`${etiqueta(campo)}: ${formatear(campo, valor)}`);
    }
  }
  if (datos.nota) lineas.push(datos.nota);
  return lineas;
}
