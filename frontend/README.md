# Frontend — OSPI

Interfaz web del **Sistema de gestión de proyectos y clientes asociados** para la empresa OSPI (venta de software, departamento de Guatemala).

Este directorio es la aplicación en **React + TypeScript + Vite**. La guía del sistema completo, la base de datos y las variables de entorno están en el [README de la raíz](../README.md).

La dirección de la API sale de `VITE_API_URL` en `.env`. Copia `.env.example` a `.env`. Si la variable no está definida, la aplicación usa `http://localhost:4000`.

## Qué incluye

- Inicio de sesión (JWT; el token se guarda en `localStorage`)
- Dashboard, clientes individuales y empresas, prospectos y proyectos
- Seguimiento, monitoreo, contratos, facturas y resúmenes financieros, según el rol

## Requisitos

- Node.js 20
- El backend en ejecución (`backend` → `npm run dev`)
- PostgreSQL con la base `ospi_sistema`

## Cómo ejecutar

```bash
cd frontend
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). El usuario administrador se crea con `npm run crear-admin` en la carpeta `backend`. El comando muestra la contraseña en la consola; cámbiala antes de usar el sistema con datos reales.

## Estructura

```
src/
  pantallas/     Pantallas de la aplicación
  componentes/   Menú, rutas y piezas compartidas
  contexto/      Sesión del usuario
  servicios/     Llamadas a la API
```

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Entorno de desarrollo |
| `npm run build` | Compilación para producción |
| `npm run preview` | Sirve la carpeta `dist` para comprobar la compilación |
