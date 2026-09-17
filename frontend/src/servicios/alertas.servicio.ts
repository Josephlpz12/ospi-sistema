import type { Alerta } from "../tipos";
import { api } from "./api";

export async function listarAlertas(soloNoLeidas = false) {
  const q = soloNoLeidas ? "?solo_no_leidas=1" : "";
  const datos = await api<{ alertas: Alerta[] }>(`/alertas${q}`);
  return datos.alertas;
}

export async function generarAlertas() {
  const datos = await api<{ alertas: Alerta[] }>("/alertas/generar", { method: "POST" });
  return datos.alertas;
}

export async function marcarAlertaLeida(id: number) {
  await api(`/alertas/${id}/leer`, { method: "PUT" });
}
