-- Datos iniciales para catálogos. Ejecutar después de 001_schema.sql
-- sobre la base ospi_sistema.

BEGIN;

UPDATE roles
SET nombre = 'Gerente financiero',
    descripcion = 'Contratos, facturas, pagos y suscripciones'
WHERE nombre = 'Gerente'
  AND NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'Gerente financiero');

INSERT INTO roles (nombre, descripcion) VALUES
  ('Administrador', 'Control total del sistema'),
  ('Gerente financiero', 'Contratos, facturas, pagos y suscripciones'),
  ('Desarrollador', 'Avance y tareas asignadas')
ON CONFLICT (nombre) DO NOTHING;

DELETE FROM roles r
WHERE r.nombre = 'Comercial'
  AND NOT EXISTS (
    SELECT 1 FROM usuarios u WHERE u.id_rol = r.id_rol
  );

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
