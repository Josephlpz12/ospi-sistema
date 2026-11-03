BEGIN;

CREATE TABLE IF NOT EXISTS prospectos (
  id_prospecto   SERIAL PRIMARY KEY,
  nombres        VARCHAR(100) NOT NULL,
  apellidos      VARCHAR(100) NOT NULL,
  empresa        VARCHAR(180),
  cargo          VARCHAR(80),
  correo         VARCHAR(150),
  telefono       VARCHAR(30),
  fuente         VARCHAR(20) NOT NULL,
  estado         VARCHAR(20) NOT NULL DEFAULT 'Nuevo',
  id_responsable INTEGER REFERENCES empleados (id_empleado),
  notas          TEXT,
  id_cliente     INTEGER REFERENCES clientes (id_cliente),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  convertido_en  TIMESTAMPTZ,
  CONSTRAINT chk_fuente_prospecto CHECK (
    fuente IN ('Referido', 'Sitio web', 'Llamada en frío', 'Evento', 'Otro')
  ),
  CONSTRAINT chk_estado_prospecto CHECK (
    estado IN ('Nuevo', 'Contactado', 'Calificado', 'Descartado', 'Convertido')
  ),
  CONSTRAINT chk_conversion_prospecto CHECK (
    (estado = 'Convertido' AND id_cliente IS NOT NULL AND convertido_en IS NOT NULL)
    OR (estado <> 'Convertido' AND id_cliente IS NULL AND convertido_en IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_prospectos_estado ON prospectos (estado);
CREATE INDEX IF NOT EXISTS idx_prospectos_cliente ON prospectos (id_cliente);

COMMIT;
