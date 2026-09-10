-- Datos de demo para seguimiento. Seguro de re-ejecutar.
-- Requiere al menos un usuario admin y, si existe, el primer proyecto.

BEGIN;

INSERT INTO empleados (id_departamento, id_usuario, nombres, apellidos, cargo, activo)
SELECT d.id_departamento, u.id_usuario, 'Admin', 'OSPI', 'Administrador', TRUE
FROM usuarios u
CROSS JOIN departamentos d
WHERE u.nombre_usuario = 'admin'
  AND d.nombre = 'Desarrollo'
  AND NOT EXISTS (SELECT 1 FROM empleados e WHERE e.id_usuario = u.id_usuario);

INSERT INTO fases_proyecto (id_proyecto, nombre, orden, estado)
SELECT p.id_proyecto, v.nombre, v.orden, v.estado
FROM (SELECT id_proyecto FROM proyectos ORDER BY id_proyecto LIMIT 1) p
CROSS JOIN (
  VALUES
    ('Análisis', 1, 'COMPLETADA'),
    ('Desarrollo', 2, 'EN_CURSO'),
    ('Entrega', 3, 'PENDIENTE')
) AS v(nombre, orden, estado)
WHERE NOT EXISTS (
  SELECT 1 FROM fases_proyecto f WHERE f.id_proyecto = p.id_proyecto
);

INSERT INTO tareas (id_proyecto, id_fase, id_asignado, titulo, estado, fecha_limite, porcentaje)
SELECT p.id_proyecto, f.id_fase, e.id_empleado, 'Levantar requerimientos con el cliente', 'COMPLETADA', CURRENT_DATE - 5, 100
FROM (SELECT id_proyecto FROM proyectos ORDER BY id_proyecto LIMIT 1) p
JOIN fases_proyecto f ON f.id_proyecto = p.id_proyecto AND f.nombre = 'Análisis'
LEFT JOIN empleados e ON e.activo = TRUE
WHERE NOT EXISTS (SELECT 1 FROM tareas t WHERE t.id_proyecto = p.id_proyecto)
LIMIT 1;

INSERT INTO tareas (id_proyecto, id_fase, id_asignado, titulo, estado, fecha_limite, porcentaje)
SELECT p.id_proyecto, f.id_fase, e.id_empleado, 'Implementar módulo de seguimiento', 'EN_CURSO', CURRENT_DATE + 7, 40
FROM (SELECT id_proyecto FROM proyectos ORDER BY id_proyecto LIMIT 1) p
JOIN fases_proyecto f ON f.id_proyecto = p.id_proyecto AND f.nombre = 'Desarrollo'
LEFT JOIN empleados e ON e.activo = TRUE
WHERE (SELECT COUNT(*) FROM tareas t WHERE t.id_proyecto = p.id_proyecto) = 1
LIMIT 1;

INSERT INTO avances (id_proyecto, id_usuario, porcentaje, comentario)
SELECT p.id_proyecto, u.id_usuario, 35, 'Primera bitácora de seguimiento para prueba con OSPI'
FROM (SELECT id_proyecto FROM proyectos ORDER BY id_proyecto LIMIT 1) p
JOIN usuarios u ON u.nombre_usuario = 'admin'
WHERE NOT EXISTS (SELECT 1 FROM avances a WHERE a.id_proyecto = p.id_proyecto);

UPDATE proyectos SET porcentaje_avance = 35
WHERE id_proyecto = (SELECT id_proyecto FROM proyectos ORDER BY id_proyecto LIMIT 1)
  AND porcentaje_avance = 0;

COMMIT;
