import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function EnlaceVolver({ to, children }: { to: string; children: string }) {
  return (
    <p className="no-imprimir">
      <Link className="enlace-volver" to={to}>
        <ChevronLeft size={16} aria-hidden />
        {children}
      </Link>
    </p>
  );
}
