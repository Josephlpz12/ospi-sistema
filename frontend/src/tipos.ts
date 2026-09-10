export type UsuarioSesion = {
  id_usuario: number;
  id_rol: number;
  nombre_usuario: string;
  correo: string;
  nombre_rol: string;
};

export type Cliente = {
  id_cliente: number;
  tipo_cliente: "INDIVIDUAL" | "EMPRESA";
  estado: string;
  origen: string | null;
  observaciones: string | null;
  creado_en: string;
  nombres: string | null;
  apellidos: string | null;
  dpi: string | null;
  nit_individual: string | null;
  telefono_individual: string | null;
  correo_individual: string | null;
  razon_social: string | null;
  nombre_comercial: string | null;
  nit_empresa: string | null;
  representante_legal: string | null;
  telefono_empresa: string | null;
  correo_empresa: string | null;
};

export type Proyecto = {
  id_proyecto: number;
  id_cliente: number;
  id_estado: number;
  id_responsable: number | null;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin_plan: string | null;
  fecha_fin_real: string | null;
  porcentaje_avance: string | number;
  creado_en: string;
  estado: string;
  nombre_cliente: string | null;
  tipo_cliente: string;
};

export type Fase = {
  id_fase: number;
  id_proyecto: number;
  nombre: string;
  orden: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
};

export type Tarea = {
  id_tarea: number;
  id_proyecto: number;
  id_fase: number | null;
  id_asignado: number | null;
  titulo: string;
  descripcion: string | null;
  estado: string;
  fecha_limite: string | null;
  porcentaje: string | number;
  nombre_fase: string | null;
  nombre_asignado: string | null;
};

export type Avance = {
  id_avance: number;
  id_proyecto: number;
  id_usuario: number | null;
  porcentaje: string | number;
  comentario: string | null;
  registrado_en: string;
  nombre_usuario: string | null;
};

export type Empleado = {
  id_empleado: number;
  nombres: string;
  apellidos: string;
  cargo: string | null;
  activo: boolean;
};
