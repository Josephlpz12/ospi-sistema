import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProveedor } from "./contexto/AuthContexto";
import { Layout } from "./componentes/Layout";
import { RutaPrivada } from "./componentes/RutaPrivada";
import { Login } from "./pantallas/Login";
import { Panel } from "./pantallas/Panel";
import { ClientesLista } from "./pantallas/ClientesLista";
import { ClienteFormulario } from "./pantallas/ClienteFormulario";
import { ProyectosLista } from "./pantallas/ProyectosLista";
import { ProyectoFormulario } from "./pantallas/ProyectoFormulario";

export default function App() {
  return (
    <AuthProveedor>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RutaPrivada />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Panel />} />
              <Route path="/clientes" element={<ClientesLista />} />
              <Route path="/clientes/nuevo" element={<ClienteFormulario />} />
              <Route path="/clientes/:id/editar" element={<ClienteFormulario />} />
              <Route path="/proyectos" element={<ProyectosLista />} />
              <Route path="/proyectos/nuevo" element={<ProyectoFormulario />} />
              <Route path="/proyectos/:id/editar" element={<ProyectoFormulario />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProveedor>
  );
}
