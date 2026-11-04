const montos = new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function dinero(valor: string | number) {
  return `Q${montos.format(Number(valor))}`;
}

export function fecha(valor: string | null) {
  if (!valor) return "—";
  const [anio, mes, dia] = valor.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return "—";
  return new Date(Number(anio), Number(mes) - 1, Number(dia)).toLocaleDateString("es-GT");
}

export function momentoActual() {
  return new Date().toLocaleString("es-GT", { timeZone: "America/Guatemala" });
}

export function fechaHoyArchivo() {
  const partes = new Intl.DateTimeFormat("es-GT", {
    timeZone: "America/Guatemala",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(new Date());
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("day")}-${valor("month")}-${valor("year")}`;
}

export function imprimirConTitulo(titulo: string) {
  const anterior = document.title;
  document.title = titulo;
  window.addEventListener(
    "afterprint",
    () => {
      document.title = anterior;
    },
    { once: true },
  );
  window.print();
}

export function nombreCliente(cliente: {
  tipo_cliente: string;
  nombres: string | null;
  apellidos: string | null;
  razon_social: string | null;
}) {
  if (cliente.tipo_cliente === "EMPRESA") return cliente.razon_social ?? "Empresa";
  return `${cliente.nombres ?? ""} ${cliente.apellidos ?? ""}`.trim() || "Cliente";
}
