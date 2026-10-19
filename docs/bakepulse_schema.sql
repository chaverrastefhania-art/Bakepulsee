-- =====================================================================
-- Bakepulse · Esquema de base de datos (MySQL 8.0+ · InnoDB · utf8mb4)
-- Ejecutar en el add-on MySQL de Clever Cloud (la base ya existe: no uses CREATE DATABASE).
-- =====================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS password_resets, contact_messages, reviews, stock_movements, order_status_history,
                     order_items, orders, products, categories, addresses, users, roles;
DROP VIEW  IF EXISTS v_ventas_diarias, v_productos_mas_vendidos, v_stock_bajo;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. Roles y usuarios
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id          TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(30)  NOT NULL UNIQUE,          -- administrador | panadero | repartidor | cliente
  description VARCHAR(150) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id       TINYINT UNSIGNED NOT NULL DEFAULT 4,  -- 4 = cliente (ver INSERT de roles)
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,                -- bcrypt, nunca texto plano
  phone         VARCHAR(20),
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  accepted_terms_at DATETIME NULL,                    -- consentimiento de datos (Ley 1581 de 2012)
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_users_role (role_id)
) ENGINE=InnoDB;

CREATE TABLE addresses (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  label        VARCHAR(40)  NOT NULL DEFAULT 'Casa',
  address_line VARCHAR(200) NOT NULL,
  neighborhood VARCHAR(100),
  city         VARCHAR(80)  NOT NULL DEFAULT 'Rionegro',
  reference    VARCHAR(200),
  is_default   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addr_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. Catálogo e inventario
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(60)  NOT NULL UNIQUE,
  description VARCHAR(200),
  is_active TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE products (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id  INT UNSIGNED  NOT NULL,
  name         VARCHAR(120)  NOT NULL,
  description  TEXT,
  price        DECIMAL(10,2) NOT NULL,
  stock        INT           NOT NULL DEFAULT 0,
  min_stock    INT           NOT NULL DEFAULT 5,      -- umbral de alerta de stock bajo
  image_url    VARCHAR(500),
  is_active    TINYINT(1)    NOT NULL DEFAULT 1,      -- baja lógica: no se borra el histórico
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_cat   FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT ck_prod_price CHECK (price >= 0),
  CONSTRAINT ck_prod_stock CHECK (stock >= 0),
  INDEX idx_prod_cat_active (category_id, is_active),
  INDEX idx_prod_name (name)
) ENGINE=InnoDB;

CREATE TABLE stock_movements (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,                  -- quién hizo el movimiento
  order_id    INT UNSIGNED NULL,                      -- solo si viene de una venta o cancelación
  type        ENUM('entrada','venta','ajuste','merma','devolucion') NOT NULL,
  quantity    INT          NOT NULL,                  -- positivo suma, negativo resta
  reason      VARCHAR(200),
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_prod FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_mov_user FOREIGN KEY (user_id)    REFERENCES users(id),
  INDEX idx_mov_prod_date (product_id, created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. Pedidos
-- ---------------------------------------------------------------------
CREATE TABLE orders (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id      INT UNSIGNED NOT NULL,
  delivery_user_id INT UNSIGNED NULL,                 -- repartidor asignado
  delivery_type    ENUM('domicilio','recoger') NOT NULL DEFAULT 'domicilio',
  delivery_address VARCHAR(255) NULL,                 -- copia de la dirección al momento del pedido
  contact_phone    VARCHAR(20)  NOT NULL,
  payment_method   ENUM('efectivo','transferencia') NOT NULL DEFAULT 'efectivo',
  payment_status   ENUM('pendiente','pagado')       NOT NULL DEFAULT 'pendiente',
  status           ENUM('pendiente','confirmado','preparando','listo','en_camino','entregado','cancelado')
                   NOT NULL DEFAULT 'pendiente',
  subtotal         DECIMAL(12,2) NOT NULL,
  delivery_fee     DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(12,2) NOT NULL,
  notes            VARCHAR(255),
  scheduled_for    DATETIME NULL,                     -- pedido programado (opcional)
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ord_customer FOREIGN KEY (customer_id)      REFERENCES users(id),
  CONSTRAINT fk_ord_delivery FOREIGN KEY (delivery_user_id) REFERENCES users(id),
  CONSTRAINT ck_ord_total    CHECK (total >= 0 AND subtotal >= 0 AND delivery_fee >= 0),
  CONSTRAINT ck_ord_address  CHECK (delivery_type = 'recoger' OR delivery_address IS NOT NULL),
  INDEX idx_ord_customer (customer_id, created_at),
  INDEX idx_ord_status   (status, created_at),
  INDEX idx_ord_delivery (delivery_user_id, status)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     INT UNSIGNED  NOT NULL,
  product_id   INT UNSIGNED  NOT NULL,
  product_name VARCHAR(120)  NOT NULL,                -- copia del nombre al comprar
  unit_price   DECIMAL(10,2) NOT NULL,                -- copia del precio al comprar
  quantity     INT UNSIGNED  NOT NULL,
  line_total   DECIMAL(12,2) AS (unit_price * quantity) STORED,
  CONSTRAINT fk_item_order FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_prod  FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT ck_item_qty   CHECK (quantity > 0),
  UNIQUE KEY uq_item_order_prod (order_id, product_id)
) ENGINE=InnoDB;

CREATE TABLE order_status_history (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL,
  status     ENUM('pendiente','confirmado','preparando','listo','en_camino','entregado','cancelado') NOT NULL,
  changed_by INT UNSIGNED NOT NULL,
  comment    VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hist_order FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_hist_user  FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_hist_order (order_id, created_at)
) ENGINE=InnoDB;

-- stock_movements se creó antes que orders, por eso su FK se agrega aquí
ALTER TABLE stock_movements
  ADD CONSTRAINT fk_mov_order FOREIGN KEY (order_id) REFERENCES orders(id);

-- ---------------------------------------------------------------------
-- 4. Opiniones y contacto
-- ---------------------------------------------------------------------
CREATE TABLE reviews (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  order_id   INT UNSIGNED NOT NULL,                   -- garantiza que compró y recibió el producto
  rating     TINYINT UNSIGNED NOT NULL,
  comment    VARCHAR(500),
  is_visible TINYINT(1) NOT NULL DEFAULT 1,           -- moderación
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rev_user  FOREIGN KEY (user_id)    REFERENCES users(id),
  CONSTRAINT fk_rev_prod  FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_rev_order FOREIGN KEY (order_id)   REFERENCES orders(id),
  CONSTRAINT ck_rev_rating CHECK (rating BETWEEN 1 AND 5),
  UNIQUE KEY uq_review (user_id, product_id, order_id)
) ENGINE=InnoDB;

CREATE TABLE contact_messages (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NULL,                       -- NULL si lo envía un visitante
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  phone      VARCHAR(20),
  message    TEXT NOT NULL,
  status     ENUM('nuevo','leido','respondido') NOT NULL DEFAULT 'nuevo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_msg_status (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE password_resets (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  token_hash CHAR(64)     NOT NULL,                   -- SHA-256 del token enviado por correo
  expires_at DATETIME     NOT NULL,
  used_at    DATETIME     NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reset_token (token_hash)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. Vistas para reportes
-- ---------------------------------------------------------------------
CREATE VIEW v_ventas_diarias AS
  SELECT DATE(created_at) AS dia, COUNT(*) AS pedidos, SUM(total) AS ventas
  FROM orders WHERE status = 'entregado'
  GROUP BY DATE(created_at);

CREATE VIEW v_productos_mas_vendidos AS
  SELECT p.id, p.name, SUM(oi.quantity) AS unidades, SUM(oi.line_total) AS ingresos
  FROM order_items oi
  JOIN orders   o ON o.id = oi.order_id AND o.status = 'entregado'
  JOIN products p ON p.id = oi.product_id
  GROUP BY p.id, p.name;

CREATE VIEW v_stock_bajo AS
  SELECT id, name, stock, min_stock FROM products
  WHERE is_active = 1 AND stock <= min_stock;

-- ---------------------------------------------------------------------
-- 6. Datos iniciales (los usuarios se crean con el script de seed para guardar hashes bcrypt reales)
-- ---------------------------------------------------------------------
INSERT INTO roles (id, name, description) VALUES
  (1, 'administrador', 'Dueño: gestiona usuarios, catálogo, pedidos y reportes'),
  (2, 'panadero',      'Personal de cocina y mostrador: catálogo, inventario y preparación de pedidos'),
  (3, 'repartidor',    'Entrega los pedidos a domicilio asignados'),
  (4, 'cliente',       'Compra productos, hace seguimiento de pedidos y deja opiniones');

INSERT INTO categories (name, description) VALUES
  ('Pan',               'Pan artesanal y de masa madre'),
  ('Pasteles y tortas', 'Porciones y tortas completas'),
  ('Parva dulce',       'Roscones, galletas y dulces de la casa'),
  ('Buñuelos y fritos', 'Fritos al momento'),
  ('Bebidas',           'Café, chocolate y jugos');

INSERT INTO products (category_id, name, description, price, stock, min_stock) VALUES
  (1, 'Pan artesanal de masa madre', 'Corteza crujiente y miga suave, horneado cada mañana.', 6500, 20, 5),
  (1, 'Croissant de mantequilla',    'Hojaldrado, con mantequilla de verdad.',                 4500, 30, 8),
  (2, 'Torta de chocolate (porción)','Bizcocho húmedo con ganache de chocolate.',              9000, 15, 4),
  (2, 'Cheesecake de mora',          'Base de galleta y salsa de mora casera.',               10500, 12, 4),
  (3, 'Roscón de arequipe',          'Clásico de la casa, relleno de arequipe.',               3500, 40, 10),
  (4, 'Buñuelos (x4)',               'Fritos al momento, masa suave y queso.',                 5000, 25, 6);
