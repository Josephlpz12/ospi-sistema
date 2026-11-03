const EXITO = new Set(["ACTIVO", "Activo", "VIGENTE", "PAGADA", "PAGADO", "COMPLETADA", "Entregado"]);
const PELIGRO = new Set(["VENCIDA", "VENCIDO", "Cancelado", "INCUMPLIDO", "SUSPENDIDO"]);
const PENDIENTE = new Set(["PENDIENTE", "Pausado", "BLOQUEADA", "Cotización", "Nueva"]);
const INACTIVO = new Set(["INACTIVO", "Inactivo", "Leída", "CONDONADA"]);

const TEXTO: Record<string, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  SUSPENDIDO: "Suspendido",
  VIGENTE: "Vigente",
  PAGADA: "Pagada",
  PAGADO: "Pagado",
  PENDIENTE: "Pendiente",
  VENCIDA: "Vencida",
  VENCIDO: "Vencido",
  COMPLETADA: "Completada",
  EN_CURSO: "En curso",
  BLOQUEADA: "Bloqueada",
  INCUMPLIDO: "Incumplido",
  CONDONADA: "Condonada",
};

function clase(estado: string) {
  if (EXITO.has(estado)) return "insignia insignia-exito";
  if (PELIGRO.has(estado)) return "insignia insignia-peligro";
  if (PENDIENTE.has(estado)) return "insignia insignia-pendiente";
  if (INACTIVO.has(estado)) return "insignia insignia-inactivo";
  if (estado === "EN_CURSO") return "insignia insignia-info";
  return "insignia";
}

export function InsigniaEstado({ estado }: { estado: string | null | undefined }) {
  const valor = estado ?? "";
  return <span className={clase(valor)}>{TEXTO[valor] ?? (valor || "—")}</span>;
}
