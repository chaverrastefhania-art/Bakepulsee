-- =====================================================================
-- BAKEPULSE - Panadería artesanal, Rionegro (Antioquia)
-- Motor: MySQL 8.x (InnoDB, utf8mb4) | Hosting: Clever Cloud
-- Nota: En Clever Cloud la base de datos ya viene creada; este script
-- solo crea tablas. Ejecútalo conectándote con las credenciales del addon.
-- =====================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. SEGURIDAD Y USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(30)  NOT NULL,
  descripcion VARCHAR(150) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE usuarios (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rol_id           TINYINT UNSIGNED NOT NULL,
  nombre           VARCHAR(80)  NOT NULL,
  apellido         VARCHAR(80)  NOT NULL,
  email            VARCHAR(150) NOT NULL,
  telefono         VARCHAR(20)  NULL,
  password_hash    VARCHAR(255) NOT NULL,
  avatar_url       VARCHAR(255) NULL,
  estado           ENUM('activo','inactivo','suspendido') NOT NULL DEFAULT 'activo',
  acepta_datos     TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Consentimiento Ley 1581 de 2012',
  ultimo_acceso_at DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  KEY idx_usuarios_rol (rol_id),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE direcciones (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id   BIGINT UNSIGNED NOT NULL,
  alias        VARCHAR(40)  NOT NULL DEFAULT 'Casa',
  direccion    VARCHAR(200) NOT NULL,
  barrio       VARCHAR(100) NULL,
  municipio    VARCHAR(80)  NOT NULL DEFAULT 'Rionegro',
  referencia   VARCHAR(200) NULL,
  latitud      DECIMAL(10,7) NULL,
  longitud     DECIMAL(10,7) NULL,
  es_principal TINYINT(1) NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dir_usuario (usuario_id),
  CONSTRAINT fk_dir_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 2. CATÁLOGO E INVENTARIO DE PRODUCTOS
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(80)  NOT NULL,
  slug        VARCHAR(100) NOT NULL,
  descripcion VARCHAR(200) NULL,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_nombre (nombre),
  UNIQUE KEY uq_categorias_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE productos (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_id       INT UNSIGNED NOT NULL,
  nombre             VARCHAR(120) NOT NULL,
  slug               VARCHAR(150) NOT NULL,
  descripcion        TEXT NULL,
  precio             DECIMAL(12,2) NOT NULL,
  stock              INT NOT NULL DEFAULT 0,
  stock_minimo       INT NOT NULL DEFAULT 5,
  unidad             VARCHAR(20) NOT NULL DEFAULT 'unidad',
  sobre_pedido       TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Tortas personalizadas, etc.',
  tiempo_prep_min    INT NULL,
  destacado          TINYINT(1) NOT NULL DEFAULT 0,
  estado             ENUM('borrador','publicado','agotado','inactivo') NOT NULL DEFAULT 'borrador',
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_productos_slug (slug),
  KEY idx_prod_categoria (categoria_id),
  KEY idx_prod_estado (estado),
  FULLTEXT KEY ft_prod_busqueda (nombre, descripcion),
  CONSTRAINT fk_prod_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  CONSTRAINT ck_prod_precio CHECK (precio >= 0),
  CONSTRAINT ck_prod_stock CHECK (stock >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE producto_imagenes (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id BIGINT UNSIGNED NOT NULL,
  url         VARCHAR(255) NOT NULL,
  alt_text    VARCHAR(150) NULL,
  orden       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  es_principal TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_img_producto (producto_id),
  CONSTRAINT fk_img_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE movimientos_inventario (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id BIGINT UNSIGNED NOT NULL,
  usuario_id  BIGINT UNSIGNED NULL,
  pedido_id   BIGINT UNSIGNED NULL,
  tipo        ENUM('produccion','venta','ajuste','merma','devolucion') NOT NULL,
  cantidad    INT NOT NULL COMMENT 'Positivo suma, negativo resta',
  motivo      VARCHAR(200) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mov_producto (producto_id, created_at),
  CONSTRAINT fk_mov_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT fk_mov_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 3. INSUMOS, PROVEEDORES Y COMPRAS (harina, azúcar, huevos, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE proveedores (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(120) NOT NULL,
  nit        VARCHAR(20)  NULL,
  contacto   VARCHAR(100) NULL,
  telefono   VARCHAR(20)  NULL,
  email      VARCHAR(150) NULL,
  direccion  VARCHAR(200) NULL,
  activo     TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE insumos (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(100) NOT NULL,
  unidad       ENUM('kg','g','l','ml','unidad') NOT NULL DEFAULT 'kg',
  stock_actual DECIMAL(12,3) NOT NULL DEFAULT 0,
  stock_minimo DECIMAL(12,3) NOT NULL DEFAULT 0,
  costo_ultimo DECIMAL(12,2) NULL,
  activo       TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_insumos_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE compras (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  proveedor_id INT UNSIGNED NOT NULL,
  usuario_id   BIGINT UNSIGNED NOT NULL COMMENT 'Quien registra la compra',
  numero_factura VARCHAR(40) NULL,
  fecha        DATE NOT NULL,
  total        DECIMAL(12,2) NOT NULL DEFAULT 0,
  notas        VARCHAR(255) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_compras_prov (proveedor_id),
  KEY idx_compras_fecha (fecha),
  CONSTRAINT fk_compras_prov FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  CONSTRAINT fk_compras_user FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE compra_detalle (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  compra_id       BIGINT UNSIGNED NOT NULL,
  insumo_id       INT UNSIGNED NOT NULL,
  cantidad        DECIMAL(12,3) NOT NULL,
  costo_unitario  DECIMAL(12,2) NOT NULL,
  subtotal        DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_cd_compra (compra_id),
  KEY idx_cd_insumo (insumo_id),
  CONSTRAINT fk_cd_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  CONSTRAINT fk_cd_insumo FOREIGN KEY (insumo_id) REFERENCES insumos(id),
  CONSTRAINT ck_cd_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 4. CARRITO Y FAVORITOS
-- ---------------------------------------------------------------------
CREATE TABLE carritos (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_carrito_usuario (usuario_id),
  CONSTRAINT fk_carrito_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE carrito_items (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  carrito_id  BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  cantidad    INT UNSIGNED NOT NULL DEFAULT 1,
  nota        VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_carrito_producto (carrito_id, producto_id),
  CONSTRAINT fk_ci_carrito  FOREIGN KEY (carrito_id)  REFERENCES carritos(id)   ON DELETE CASCADE,
  CONSTRAINT fk_ci_producto FOREIGN KEY (producto_id) REFERENCES productos(id)  ON DELETE CASCADE,
  CONSTRAINT ck_ci_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE favoritos (
  usuario_id  BIGINT UNSIGNED NOT NULL,
  producto_id BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, producto_id),
  CONSTRAINT fk_fav_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
  CONSTRAINT fk_fav_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 5. VENTAS: PEDIDOS, PAGOS Y ENTREGAS
-- ---------------------------------------------------------------------
CREATE TABLE pedidos (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo             VARCHAR(20) NOT NULL COMMENT 'Ej: BP-20261015-0001',
  cliente_id         BIGINT UNSIGNED NULL COMMENT 'NULL = venta de mostrador sin cuenta',
  atendido_por       BIGINT UNSIGNED NULL COMMENT 'Empleado/administrador que gestiona',
  canal              ENUM('web','mostrador','whatsapp') NOT NULL DEFAULT 'web',
  tipo_entrega       ENUM('domicilio','recogida') NOT NULL DEFAULT 'recogida',
  direccion_id       BIGINT UNSIGNED NULL,
  direccion_entrega  VARCHAR(255) NULL COMMENT 'Copia de la dirección al momento del pedido',
  fecha_programada   DATETIME NULL,
  estado             ENUM('pendiente','confirmado','en_preparacion','listo','en_camino','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  subtotal           DECIMAL(12,2) NOT NULL DEFAULT 0,
  costo_envio        DECIMAL(12,2) NOT NULL DEFAULT 0,
  total              DECIMAL(12,2) NOT NULL DEFAULT 0,
  notas              VARCHAR(500) NULL,
  motivo_cancelacion VARCHAR(255) NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pedidos_codigo (codigo),
  KEY idx_ped_cliente (cliente_id, created_at),
  KEY idx_ped_estado (estado, created_at),
  CONSTRAINT fk_ped_cliente   FOREIGN KEY (cliente_id)   REFERENCES usuarios(id)    ON DELETE SET NULL,
  CONSTRAINT fk_ped_atendido  FOREIGN KEY (atendido_por) REFERENCES usuarios(id)    ON DELETE SET NULL,
  CONSTRAINT fk_ped_direccion FOREIGN KEY (direccion_id) REFERENCES direcciones(id) ON DELETE SET NULL,
  CONSTRAINT ck_ped_total CHECK (total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pedido_items (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id         BIGINT UNSIGNED NOT NULL,
  producto_id       BIGINT UNSIGNED NOT NULL,
  nombre_producto   VARCHAR(120) NOT NULL COMMENT 'Snapshot del nombre',
  precio_unitario   DECIMAL(12,2) NOT NULL COMMENT 'Snapshot del precio',
  cantidad          INT UNSIGNED NOT NULL,
  subtotal          DECIMAL(12,2) NOT NULL,
  personalizacion   VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_pi_pedido (pedido_id),
  KEY idx_pi_producto (producto_id),
  CONSTRAINT fk_pi_pedido   FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
  CONSTRAINT fk_pi_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT ck_pi_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pedido_historial (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id      BIGINT UNSIGNED NOT NULL,
  usuario_id     BIGINT UNSIGNED NULL,
  estado_anterior VARCHAR(20) NULL,
  estado_nuevo   VARCHAR(20) NOT NULL,
  comentario     VARCHAR(255) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ph_pedido (pedido_id, created_at),
  CONSTRAINT fk_ph_pedido  FOREIGN KEY (pedido_id)  REFERENCES pedidos(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ph_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pagos (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id   BIGINT UNSIGNED NOT NULL,
  metodo      ENUM('efectivo','transferencia','nequi','daviplata','tarjeta') NOT NULL,
  estado      ENUM('pendiente','aprobado','rechazado','reembolsado') NOT NULL DEFAULT 'pendiente',
  monto       DECIMAL(12,2) NOT NULL,
  referencia  VARCHAR(100) NULL COMMENT 'Número de transacción o comprobante',
  comprobante_url VARCHAR(255) NULL,
  pagado_at   DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pagos_pedido (pedido_id),
  CONSTRAINT fk_pagos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT ck_pagos_monto CHECK (monto >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE entregas (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id      BIGINT UNSIGNED NOT NULL,
  repartidor_id  BIGINT UNSIGNED NULL,
  estado         ENUM('asignada','recogida','en_camino','entregada','fallida') NOT NULL DEFAULT 'asignada',
  asignado_at    DATETIME NULL,
  recogido_at    DATETIME NULL,
  entregado_at   DATETIME NULL,
  observaciones  VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_entregas_pedido (pedido_id),
  KEY idx_ent_repartidor (repartidor_id, estado),
  CONSTRAINT fk_ent_pedido     FOREIGN KEY (pedido_id)     REFERENCES pedidos(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ent_repartidor FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 6. COMUNICACIÓN, OPINIONES Y PWA
-- ---------------------------------------------------------------------
CREATE TABLE resenas (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id   BIGINT UNSIGNED NOT NULL,
  producto_id  BIGINT UNSIGNED NOT NULL,
  pedido_id    BIGINT UNSIGNED NOT NULL,
  calificacion TINYINT UNSIGNED NOT NULL,
  comentario   VARCHAR(500) NULL,
  visible      TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_resena (usuario_id, producto_id, pedido_id),
  KEY idx_res_producto (producto_id),
  CONSTRAINT fk_res_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
  CONSTRAINT fk_res_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT fk_res_pedido   FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
  CONSTRAINT ck_res_calif CHECK (calificacion BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE mensajes_contacto (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  BIGINT UNSIGNED NULL,
  nombre      VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NULL,
  telefono    VARCHAR(20)  NULL,
  asunto      VARCHAR(150) NOT NULL,
  mensaje     TEXT NOT NULL,
  estado      ENUM('nuevo','leido','respondido') NOT NULL DEFAULT 'nuevo',
  respuesta   TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mc_estado (estado, created_at),
  CONSTRAINT fk_mc_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notificaciones (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  BIGINT UNSIGNED NOT NULL,
  tipo        ENUM('pedido','pago','entrega','promocion','sistema') NOT NULL DEFAULT 'sistema',
  titulo      VARCHAR(120) NOT NULL,
  mensaje     VARCHAR(300) NOT NULL,
  referencia_id BIGINT UNSIGNED NULL,
  leida       TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_usuario (usuario_id, leida, created_at),
  CONSTRAINT fk_notif_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE push_suscripciones (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  BIGINT UNSIGNED NOT NULL,
  endpoint    VARCHAR(500) NOT NULL,
  p256dh      VARCHAR(255) NOT NULL,
  auth        VARCHAR(100) NOT NULL,
  dispositivo VARCHAR(100) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_endpoint (endpoint),
  KEY idx_push_usuario (usuario_id),
  CONSTRAINT fk_push_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 7. DATOS INICIALES
-- ---------------------------------------------------------------------
INSERT INTO roles (nombre, descripcion) VALUES
 ('administrador','Dueño de la panadería: control total del sistema'),
 ('empleado','Gestiona pedidos, producción e inventario'),
 ('repartidor','Realiza las entregas a domicilio'),
 ('cliente','Compra productos desde la app');

INSERT INTO categorias (nombre, slug, descripcion) VALUES
 ('Pan','pan','Pan fresco del día'),
 ('Pasteles y tortas','pasteles-y-tortas','Pasteles, tortas y postres'),
 ('Parva dulce','parva-dulce','Galletas, roscones y dulces de paquete'),
 ('Buñuelos y fritos','bunuelos-y-fritos','Buñuelos, empanadas y fritos'),
 ('Bebidas','bebidas','Café, chocolate y jugos'),
 ('Snacks','snacks','Opciones ligeras para almuerzo o merienda');

INSERT INTO insumos (nombre, unidad, stock_minimo) VALUES
 ('Harina de trigo','kg',20),('Azúcar','kg',10),('Huevos','unidad',60),
 ('Mantequilla','kg',5),('Levadura','kg',1),('Leche','l',15),('Chocolate','kg',3);

-- El usuario administrador se crea desde el backend (Express) para guardar
-- la contraseña con bcrypt; no insertes password_hash en texto plano.

-- ---------------------------------------------------------------------
-- 8. VISTAS ÚTILES PARA REPORTES
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_ventas_diarias AS
SELECT DATE(created_at) AS fecha, COUNT(*) AS pedidos, SUM(total) AS ventas
FROM pedidos WHERE estado = 'entregado' GROUP BY DATE(created_at);

CREATE OR REPLACE VIEW v_productos_mas_vendidos AS
SELECT p.id, p.nombre, SUM(pi.cantidad) AS unidades, SUM(pi.subtotal) AS ingresos
FROM pedido_items pi
JOIN pedidos pe ON pe.id = pi.pedido_id AND pe.estado = 'entregado'
JOIN productos p ON p.id = pi.producto_id
GROUP BY p.id, p.nombre ORDER BY unidades DESC;

CREATE OR REPLACE VIEW v_alertas_stock AS
SELECT 'producto' AS tipo, id, nombre, stock AS actual, stock_minimo AS minimo FROM productos WHERE stock <= stock_minimo AND estado <> 'inactivo'
UNION ALL
SELECT 'insumo', id, nombre, stock_actual, stock_minimo FROM insumos WHERE stock_actual <= stock_minimo AND activo = 1;
