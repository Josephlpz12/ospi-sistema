# OSPI — Gestión de proyectos

Sistema web para la empresa OSPI (venta de software, departamento de Guatemala). Cubre clientes, prospectos, proyectos y su seguimiento, contratos, facturas, pagos, suscripciones, alertas, documentos y la bitácora de cambios.

La interfaz está en `frontend` (React, TypeScript y Vite). La API está en `backend` (Node, Express y PostgreSQL). El acceso usa JWT y tres roles: Administrador, Desarrollador y Gerente financiero.

## Requisitos

- Node.js 20
- npm
- PostgreSQL 14 o superior

## Instalación

1. Clona el repositorio y entra en la carpeta.
2. Crea la base vacía con codificación UTF-8, por ejemplo `CREATE DATABASE ospi_sistema ENCODING 'UTF8' TEMPLATE template0`.
3. En Windows, antes de ejecutar los scripts con psql, define la codificación del cliente en UTF-8. En PowerShell: `$env:PGCLIENTENCODING = 'UTF8'`. Si no, las tildes de los scripts pueden guardarse dañadas. Ejecuta los scripts obligatorios, en este orden, conectado a esa base:

```text
backend/sql/001_schema.sql
backend/sql/002_seed.sql
backend/sql/004_seed_finanzas.sql
```

4. En `backend`, copia `.env.example` a `.env` y completa los valores reales. No subas `.env` al repositorio.
5. En `frontend`, copia `.env.example` a `.env` y ajusta `VITE_API_URL` a la dirección de la API. Vite incorpora esa variable al compilar.
6. Instala las dependencias:

```bash
cd backend
npm install
cd ../frontend
npm install
```

## Scripts de la base

Obligatorios, en este orden:

| Script | Contenido |
| --- | --- |
| `001_schema.sql` | Las 28 tablas, incluida la de prospectos, sus restricciones e índices. |
| `002_seed.sql` | Catálogos: roles, departamentos, estados de proyecto y categorías de producto. |
| `004_seed_finanzas.sql` | Tres productos de software, uno por cada categoría. |

`002_seed.sql` deja tres roles (Administrador, Gerente financiero y Desarrollador), renombra un rol antiguo llamado Gerente si todavía existe, y borra el rol Comercial solo si no está en uso. También inserta los departamentos Ventas, Desarrollo y Soporte; los estados Cotización, Activo, Pausado, Entregado y Cancelado; y las categorías Software a la medida, Licenciamiento, y Soporte y mantenimiento.

`004_seed_finanzas.sql` inserta Licencia OSPI anual, Soporte y mantenimiento, e Implementación a la medida. No inserta contratos, facturas ni pagos.

Opcional, y solo para pruebas:

| Script | Contenido |
| --- | --- |
| `003_seed_seguimiento.sql` | Un empleado de ejemplo y, si ya hay un proyecto, fases y tareas de ejemplo. En una base vacía no crea proyectos. |

## Variables de entorno

Backend (`backend/.env`):

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto de la API. Si falta, 4000. |
| `DB_HOST` | Servidor de PostgreSQL. |
| `DB_PORT` | Puerto de PostgreSQL. Si falta, 5432. |
| `DB_NAME` | Nombre de la base. |
| `DB_USER` | Usuario de la base. |
| `DB_PASSWORD` | Contraseña de la base. |
| `JWT_SECRET` | Secreto para firmar los tokens. Debe ser propio de cada servidor. |
| `CORS_ORIGIN` | Origen permitido del navegador, por ejemplo `http://localhost:5173`. |

Frontend (`frontend/.env`):

| Variable | Uso |
| --- | --- |
| `VITE_API_URL` | Dirección de la API, sin `/api` al final. Ejemplo: `http://localhost:4000`. |

Si `VITE_API_URL` no está definida, el frontend usa `http://localhost:4000`. Si `CORS_ORIGIN` no está definida, la API acepta `http://localhost:5173`.

## Desarrollo

En una terminal:

```bash
cd backend
npm run dev
```

En otra:

```bash
cd frontend
npm run dev
```

La interfaz de desarrollo queda en `http://localhost:5173`.

## Producción

Compila y arranca la API:

```bash
cd backend
npm run build
npm start
```

Compila la interfaz y sírvela:

```bash
cd frontend
npm run build
npm run preview
```

`npm run build` deja los archivos estáticos en `frontend/dist`. En un servidor pueden publicarse con cualquier servidor de archivos estáticos. `npm run preview` solo sirve esa carpeta para comprobarla. La API escucha el puerto de `PORT`.

Define `VITE_API_URL` y `CORS_ORIGIN` con las direcciones públicas antes de compilar el frontend y de arrancar la API.
