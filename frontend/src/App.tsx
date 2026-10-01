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
import { ProyectoSeguimiento } from "./pantallas/ProyectoSeguimiento";
import { ClienteFicha } from "./pantallas/ClienteFicha";
import { AlertasLista } from "./pantallas/AlertasLista";
import { Monitoreo } from "./pantallas/Monitoreo";
import { ContratosLista } from "./pantallas/ContratosLista";
import { ContratoFormulario } from "./pantallas/ContratoFormulario";
import { ContratoFicha } from "./pantallas/ContratoFicha";

export default function App() {
  return (
    <AuthProveedor>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RutaPrivada />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Panel />} />
              <Route path="/monitoreo" element={<Monitoreo />} />
              <Route path="/alertas" element={<AlertasLista />} />
              <Route path="/contratos" element={<ContratosLista />} />
              <Route path="/contratos/nuevo" element={<ContratoFormulario />} />
              <Route path="/contratos/:id" element={<ContratoFicha />} />
              <Route path="/clientes" element={<ClientesLista />} />
              <Route path="/clientes/nuevo" element={<ClienteFormulario />} />
              <Route path="/clientes/:id/editar" element={<ClienteFormulario />} />
              <Route path="/clientes/:id" element={<ClienteFicha />} />
              <Route path="/proyectos" element={<ProyectosLista />} />
              <Route path="/proyectos/nuevo" element={<ProyectoFormulario />} />
              <Route path="/proyectos/:id/editar" element={<ProyectoFormulario />} />
              <Route path="/proyectos/:id/seguimiento" element={<ProyectoSeguimiento />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProveedor>
  );
}
