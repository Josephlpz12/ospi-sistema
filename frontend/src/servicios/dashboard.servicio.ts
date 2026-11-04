import type { Dashboard } from "../tipos";
import { api } from "./api";

export async function obtenerDashboard() {
  return api<Dashboard>("/dashboard");
}
