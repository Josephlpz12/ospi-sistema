-- OSPI: gestión de proyectos, clientes y ciclo comercial (pagos / multas).
-- Ejecutar conectado a la base: ospi_sistema
-- El bloque financiero se crea ahora; las pantallas de cobro pueden ir después del sábado.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Seguridad (un rol por usuario; sin matriz de permisos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id_rol         SERIAL PRIMARY KEY,
  nombre         VARCHAR(50) NOT NULL UNIQUE,
  descripcion    TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario     SERIAL PRIMARY KEY,
  id_rol         INTEGER NOT NULL REFERENCES roles (id_rol),
  nombre_usuario VARCHAR(80) NOT NULL UNIQUE,
  correo         VARCHAR(150) NOT NULL UNIQUE,
  hash_password  VARCHAR(255) NOT NULL,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. Organización interna OSPI
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departamentos (
  id_departamento SERIAL PRIMARY KEY,
  nombre          VARCHAR(80) NOT NULL UNIQUE,
  descripcion     TEXT
);

CREATE TABLE IF NOT EXISTS empleados (
  id_empleado     SERIAL PRIMARY KEY,
  id_departamento INTEGER REFERENCES departamentos (id_departamento),
  id_usuario      INTEGER UNIQUE REFERENCES usuarios (id_usuario),
  nombres         VARCHAR(100) NOT NULL,
  apellidos       VARCHAR(100) NOT NULL,
  dpi             VARCHAR(20) UNIQUE,
  cargo           VARCHAR(80),
  telefono        VARCHAR(30),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. Clientes: persona individual o empresa (supertipo / subtipo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente     SERIAL PRIMARY KEY,
  tipo_cliente   VARCHAR(20) NOT NULL,
  estado         VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  origen         VARCHAR(80),
  observaciones  TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tipo_cliente CHECK (tipo_cliente IN ('INDIVIDUAL', 'EMPRESA')),
  CONSTRAINT chk_estado_cliente CHECK (estado IN ('ACTIVO', 'INACTIVO', 'SUSPENDIDO'))
);

CREATE TABLE IF NOT EXISTS clientes_individuales (
  id_cliente     INTEGER PRIMARY KEY REFERENCES clientes (id_cliente) ON DELETE CASCADE,
  nombres        VARCHAR(100) NOT NULL,
  apellidos      VARCHAR(100) NOT NULL,
  dpi            VARCHAR(20) UNIQUE,
  nit            VARCHAR(20),
  telefono       VARCHAR(30),
  correo         VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS clientes_empresas (
  id_cliente            INTEGER PRIMARY KEY REFERENCES clientes (id_cliente) ON DELETE CASCADE,
  razon_social          VARCHAR(180) NOT NULL,
  nombre_comercial      VARCHAR(180),
  nit                   VARCHAR(20) UNIQUE,
  representante_legal   VARCHAR(150),
  telefono              VARCHAR(30),
  correo                VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS contactos_cliente (
  id_contacto    SERIAL PRIMARY KEY,
  id_cliente     INTEGER NOT NULL REFERENCES clientes (id_cliente) ON DELETE CASCADE,
  nombres        VARCHAR(100) NOT NULL,
  apellidos      VARCHAR(100) NOT NULL,
  cargo          VARCHAR(80),
  telefono       VARCHAR(30),
  correo         VARCHAR(150),
  es_principal   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS direcciones (
  id_direccion     SERIAL PRIMARY KEY,
  id_cliente       INTEGER NOT NULL REFERENCES clientes (id_cliente) ON DELETE CASCADE,
  tipo             VARCHAR(20) NOT NULL DEFAULT 'FISCAL',
  departamento_gt  VARCHAR(80),
  municipio        VARCHAR(80),
  detalle          TEXT NOT NULL,
  CONSTRAINT chk_tipo_direccion CHECK (tipo IN ('FISCAL', 'ENTREGA', 'OTRA'))
);

-- ---------------------------------------------------------------------------
-- 4. Catálogo de software que vende / implementa OSPI
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias_producto (
  id_categoria SERIAL PRIMARY KEY,
  nombre       VARCHAR(80) NOT NULL UNIQUE,
  descripcion  TEXT
);

CREATE TABLE IF NOT EXISTS productos_software (
  id_producto  SERIAL PRIMARY KEY,
  id_categoria INTEGER REFERENCES categorias_producto (id_categoria),
  nombre       VARCHAR(120) NOT NULL,
  descripcion  TEXT,
  activo       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------------
-- 5. Proyectos y seguimiento
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estados_proyecto (
  id_estado SERIAL PRIMARY KEY,
  nombre    VARCHAR(50) NOT NULL UNIQUE,
  orden     SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS proyectos (
  id_proyecto        SERIAL PRIMARY KEY,
  id_cliente         INTEGER NOT NULL REFERENCES clientes (id_cliente),
  id_estado          INTEGER NOT NULL REFERENCES estados_proyecto (id_estado),
  id_responsable     INTEGER REFERENCES empleados (id_empleado),
  codigo             VARCHAR(30) UNIQUE,
  nombre             VARCHAR(180) NOT NULL,
  descripcion        TEXT,
  fecha_inicio       DATE,
  fecha_fin_plan     DATE,
  fecha_fin_real     DATE,
  porcentaje_avance  NUMERIC(5, 2) NOT NULL DEFAULT 0,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_avance CHECK (porcentaje_avance >= 0 AND porcentaje_avance <= 100)
);

CREATE TABLE IF NOT EXISTS proyecto_productos (
  id_proyecto INTEGER NOT NULL REFERENCES proyectos (id_proyecto) ON DELETE CASCADE,
  id_producto INTEGER NOT NULL REFERENCES productos_software (id_producto),
  PRIMARY KEY (id_proyecto, id_producto)
);

CREATE TABLE IF NOT EXISTS fases_proyecto (
  id_fase       SERIAL PRIMARY KEY,
  id_proyecto   INTEGER NOT NULL REFERENCES proyectos (id_proyecto) ON DELETE CASCADE,
  nombre        VARCHAR(80) NOT NULL,
  orden         SMALLINT NOT NULL DEFAULT 1,
  fecha_inicio  DATE,
  fecha_fin     DATE,
  estado        VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  CONSTRAINT chk_estado_fase CHECK (estado IN ('PENDIENTE', 'EN_CURSO', 'COMPLETADA'))
);

CREATE TABLE IF NOT EXISTS tareas (
  id_tarea         SERIAL PRIMARY KEY,
  id_proyecto      INTEGER NOT NULL REFERENCES proyectos (id_proyecto) ON DELETE CASCADE,
  id_fase          INTEGER REFERENCES fases_proyecto (id_fase),
  id_asignado      INTEGER REFERENCES empleados (id_empleado),
  titulo           VARCHAR(180) NOT NULL,
  descripcion      TEXT,
  estado           VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_limite     DATE,
  porcentaje       NUMERIC(5, 2) NOT NULL DEFAULT 0,
  CONSTRAINT chk_estado_tarea CHECK (estado IN ('PENDIENTE', 'EN_CURSO', 'COMPLETADA', 'BLOQUEADA'))
);

CREATE TABLE IF NOT EXISTS asignaciones (
  id_asignacion     SERIAL PRIMARY KEY,
  id_proyecto       INTEGER NOT NULL REFERENCES proyectos (id_proyecto) ON DELETE CASCADE,
  id_empleado       INTEGER NOT NULL REFERENCES empleados (id_empleado),
  id_tarea          INTEGER REFERENCES tareas (id_tarea),
  rol_en_proyecto   VARCHAR(80),
  fecha_asignacion  DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (id_proyecto, id_empleado, id_tarea)
);

CREATE TABLE IF NOT EXISTS avances (
  id_avance     SERIAL PRIMARY KEY,
  id_proyecto   INTEGER NOT NULL REFERENCES proyectos (id_proyecto) ON DELETE CASCADE,
  id_usuario    INTEGER REFERENCES usuarios (id_usuario),
  porcentaje    NUMERIC(5, 2) NOT NULL,
  comentario    TEXT,
  registrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentos (
  id_documento SERIAL PRIMARY KEY,
  id_cliente   INTEGER REFERENCES clientes (id_cliente),
  id_proyecto  INTEGER REFERENCES proyectos (id_proyecto),
  nombre       VARCHAR(180) NOT NULL,
  tipo         VARCHAR(80),
  ruta_archivo VARCHAR(255),
  subido_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comentarios (
  id_comentario SERIAL PRIMARY KEY,
  id_proyecto   INTEGER NOT NULL REFERENCES proyectos (id_proyecto) ON DELETE CASCADE,
  id_tarea      INTEGER REFERENCES tareas (id_tarea),
  id_usuario    INTEGER REFERENCES usuarios (id_usuario),
  texto         TEXT NOT NULL,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alertas (
  id_alerta     SERIAL PRIMARY KEY,
  id_proyecto   INTEGER REFERENCES proyectos (id_proyecto),
  tipo          VARCHAR(40) NOT NULL,
  mensaje       TEXT NOT NULL,
  leida         BOOLEAN NOT NULL DEFAULT FALSE,
  programada_en TIMESTAMPTZ,
  creada_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historial_cambios (
  id_historial SERIAL PRIMARY KEY,
  tabla        VARCHAR(80) NOT NULL,
  id_registro  INTEGER NOT NULL,
  accion       VARCHAR(20) NOT NULL,
  id_usuario   INTEGER REFERENCES usuarios (id_usuario),
  detalle      TEXT,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. Bloque financiero (requisito OSPI: impago → multa o baja de servicio)
--    Tablas listas; el módulo de cobro no es el 20-30% del sábado.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suscripciones (
  id_suscripcion SERIAL PRIMARY KEY,
  id_cliente     INTEGER NOT NULL REFERENCES clientes (id_cliente),
  id_producto    INTEGER NOT NULL REFERENCES productos_software (id_producto),
  estado         VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
  fecha_inicio   DATE NOT NULL,
  fecha_fin      DATE,
  CONSTRAINT chk_estado_suscripcion CHECK (
    estado IN ('ACTIVA', 'SUSPENDIDA', 'CANCELADA')
  )
);

CREATE TABLE IF NOT EXISTS contratos (
  id_contrato     SERIAL PRIMARY KEY,
  id_cliente      INTEGER NOT NULL REFERENCES clientes (id_cliente),
  id_proyecto     INTEGER REFERENCES proyectos (id_proyecto),
  id_suscripcion  INTEGER REFERENCES suscripciones (id_suscripcion),
  numero          VARCHAR(40) NOT NULL UNIQUE,
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE,
  monto_total     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  moneda          VARCHAR(10) NOT NULL DEFAULT 'GTQ',
  clausula_mora   TEXT,
  estado          VARCHAR(20) NOT NULL DEFAULT 'VIGENTE',
  CONSTRAINT chk_estado_contrato CHECK (
    estado IN ('BORRADOR', 'VIGENTE', 'SUSPENDIDO', 'CERRADO', 'INCUMPLIDO')
  )
);

CREATE TABLE IF NOT EXISTS facturas (
  id_factura   SERIAL PRIMARY KEY,
  id_contrato  INTEGER NOT NULL REFERENCES contratos (id_contrato),
  numero       VARCHAR(40) NOT NULL UNIQUE,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  monto        NUMERIC(12, 2) NOT NULL,
  estado       VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  CONSTRAINT chk_estado_factura CHECK (
    estado IN ('PENDIENTE', 'PAGADA', 'VENCIDA', 'ANULADA')
  )
);

CREATE TABLE IF NOT EXISTS pagos (
  id_pago      SERIAL PRIMARY KEY,
  id_factura   INTEGER NOT NULL REFERENCES facturas (id_factura),
  fecha_pago   DATE NOT NULL DEFAULT CURRENT_DATE,
  monto        NUMERIC(12, 2) NOT NULL,
  metodo       VARCHAR(40),
  referencia   VARCHAR(80)
);

CREATE TABLE IF NOT EXISTS multas (
  id_multa     SERIAL PRIMARY KEY,
  id_contrato  INTEGER NOT NULL REFERENCES contratos (id_contrato),
  id_factura   INTEGER REFERENCES facturas (id_factura),
  motivo       TEXT NOT NULL,
  monto        NUMERIC(12, 2) NOT NULL,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  estado       VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  CONSTRAINT chk_estado_multa CHECK (
    estado IN ('PENDIENTE', 'PAGADA', 'CONDONADA')
  )
);

ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS id_contrato INTEGER REFERENCES contratos (id_contrato);

ALTER TABLE alertas
  ADD COLUMN IF NOT EXISTS id_factura INTEGER REFERENCES facturas (id_factura);

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (id_rol);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON clientes (tipo_cliente);
CREATE INDEX IF NOT EXISTS idx_proyectos_cliente ON proyectos (id_cliente);
CREATE INDEX IF NOT EXISTS idx_tareas_proyecto ON tareas (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_facturas_contrato ON facturas (id_contrato);
CREATE INDEX IF NOT EXISTS idx_suscripciones_cliente ON suscripciones (id_cliente);

COMMIT;
