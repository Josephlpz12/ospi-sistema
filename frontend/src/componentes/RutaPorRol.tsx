import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexto/AuthContexto";

type Props = {
  permitido: (rol: string | undefined) => boolean;
};

export function RutaPorRol({ permitido }: Props) {
  const { usuario } = useAuth();
  if (!permitido(usuario?.nombre_rol)) return <Navigate to="/" replace />;
  return <Outlet />;
}
