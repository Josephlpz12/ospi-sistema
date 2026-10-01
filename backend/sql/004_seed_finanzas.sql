-- Productos mínimos para suscripciones. Re-ejecutable.

BEGIN;

INSERT INTO productos_software (id_categoria, nombre, descripcion, activo)
SELECT c.id_categoria, 'Licencia OSPI anual', 'Licenciamiento de software OSPI', TRUE
FROM categorias_producto c
WHERE c.nombre = 'Licenciamiento'
  AND NOT EXISTS (
    SELECT 1 FROM productos_software p WHERE p.nombre = 'Licencia OSPI anual'
  );

INSERT INTO productos_software (id_categoria, nombre, descripcion, activo)
SELECT c.id_categoria, 'Soporte y mantenimiento', 'Contrato de soporte post-venta', TRUE
FROM categorias_producto c
WHERE c.nombre = 'Soporte y mantenimiento'
  AND NOT EXISTS (
    SELECT 1 FROM productos_software p WHERE p.nombre = 'Soporte y mantenimiento'
  );

INSERT INTO productos_software (id_categoria, nombre, descripcion, activo)
SELECT c.id_categoria, 'Implementación a la medida', 'Desarrollo e implantación del sistema', TRUE
FROM categorias_producto c
WHERE c.nombre = 'Software a la medida'
  AND NOT EXISTS (
    SELECT 1 FROM productos_software p WHERE p.nombre = 'Implementación a la medida'
  );

COMMIT;
