import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexto/AuthContexto";

export function RutaPrivada() {
  const { autenticado } = useAuth();
  if (!autenticado) return <Navigate to="/login" replace />;
  return <Outlet />;
}
