import type { RegistroBitacora } from "../tipos";
import { api } from "./api";

export type FiltrosBitacora = {
  pagina: number;
  id_usuario: string;
  tabla: string;
  desde: string;
  hasta: string;
};

export type PaginaBitacora = {
  registros: RegistroBitacora[];
  total: number;
  pagina: number;
  tamano: number;
};

export async function listarBitacora(filtros: FiltrosBitacora) {
  const parametros = new URLSearchParams({ pagina: String(filtros.pagina) });
  if (filtros.id_usuario) parametros.set("id_usuario", filtros.id_usuario);
  if (filtros.tabla) parametros.set("tabla", filtros.tabla);
  if (filtros.desde) parametros.set("desde", filtros.desde);
  if (filtros.hasta) parametros.set("hasta", filtros.hasta);
  return api<PaginaBitacora>(`/bitacora?${parametros.toString()}`);
}
