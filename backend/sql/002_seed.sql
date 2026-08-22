-- Datos iniciales para catálogos. Ejecutar después de 001_schema.sql
-- sobre la base ospi_sistema.

BEGIN;

INSERT INTO roles (nombre, descripcion) VALUES
  ('Administrador', 'Control total del sistema'),
  ('Gerente', 'Seguimiento de proyectos y clientes'),
  ('Desarrollador', 'Avance y tareas asignadas'),
  ('Comercial', 'Alta de clientes y proyectos')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO departamentos (nombre, descripcion) VALUES
  ('Ventas', 'Atención comercial y clientes'),
  ('Desarrollo', 'Implementación de software'),
  ('Soporte', 'Soporte post-venta')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO estados_proyecto (nombre, orden) VALUES
  ('Cotización', 1),
  ('Activo', 2),
  ('Pausado', 3),
  ('Entregado', 4),
  ('Cancelado', 5)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO categorias_producto (nombre, descripcion) VALUES
  ('Software a la medida', 'Desarrollo según requerimiento del cliente'),
  ('Licenciamiento', 'Venta o renovación de licencias'),
  ('Soporte y mantenimiento', 'Contratos de soporte')
ON CONFLICT (nombre) DO NOTHING;

COMMIT;
