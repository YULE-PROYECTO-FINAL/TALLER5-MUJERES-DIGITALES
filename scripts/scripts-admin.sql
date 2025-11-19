-- Conectar a PostgreSQL y ejecutar:

-- 1. Insertar roles
INSERT INTO roles (id, nombre, descripcion) VALUES 
(1, 'ADMIN', 'Acceso completo al sistema'),
(2, 'CLIENT', 'Usuario cliente')
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar usuario ADMIN
INSERT INTO "user" (nombre, apellido, email, password, "roleId", "isVerified") 
VALUES (
  'Administrador', 
  'Sistema', 
  'admin@tienda.com', 
  '$argon2id$v=19$m=65536,t=3,p=4$sTkHwvz5UqK6QzG9Xh8BJA$VX3p4S8Y2qL1wR7tN0vC6M',
  1, 
  true
) ON CONFLICT (email) DO NOTHING;