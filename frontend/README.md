# Frontend — OSPI

Interfaz web del **Sistema de gestión de proyectos y clientes asociados** para la empresa OSPI (venta de software, departamento de Guatemala).

Este directorio es la aplicación en **React + TypeScript + Vite**. Se comunica con la API en `http://localhost:4000`.

## Qué incluye (avance del núcleo)

- Inicio de sesión (JWT; el token se guarda en `localStorage`)
- Panel con totales de clientes y proyectos
- CRUD de clientes **individuales** y **empresas**
- CRUD de proyectos ligados a un cliente

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

Abre [http://localhost:5173](http://localhost:5173). El usuario administrador se crea con el script del backend (`npm run crear-admin` en la carpeta `backend`).

## Estructura

```
src/
  pantallas/     Login, panel, clientes y proyectos
  componentes/   Menú y rutas privadas
  contexto/      Sesión del usuario
  servicios/     Llamadas a la API
```

## Scripts

| Comando        | Descripción              |
|----------------|--------------------------|
| `npm run dev`  | Entorno de desarrollo    |
| `npm run build`| Compilación para producción |
