# Bakepulse — Requisitos e historias de usuario

**Proyecto:** Bakepulse, panadería artesanal con pedidos en línea · Rionegro, Antioquia
**Tipo de app:** PWA (React + Vite PWA + Tailwind) · API (Node.js + Express) · BD MySQL en Clever Cloud
**Slogan:** *Cada creación, un impulso de felicidad* · **Paleta:** blanco, amarillo, morado
**Objetivos del proyecto:** catálogo con imágenes, descripción, precio y disponibilidad · pedidos en línea · contacto directo con la panadería · administración de productos e inventario.

---

## 1. Roles

| Rol | Descripción |
|---|---|
| **Visitante** | Persona sin cuenta. Explora el catálogo y puede enviar un mensaje de contacto. |
| **Cliente** | Usuario registrado. Arma el carrito, hace pedidos, paga, sigue su pedido y opina. |
| **Empleado** | Atiende pedidos, actualiza producción/stock y registra ventas de mostrador. |
| **Repartidor** | Ve sus entregas asignadas y actualiza su estado. |
| **Administrador** | Dueño. Gestiona todo: catálogo, usuarios, insumos, compras, reportes. |

---

## 2. Requisitos funcionales

### Autenticación y usuarios
- **RF-01** Registro de clientes con nombre, correo, teléfono, contraseña y aceptación de tratamiento de datos.
- **RF-02** Inicio y cierre de sesión con JWT; recuperación de contraseña por correo.
- **RF-03** Control de acceso por rol (RBAC): cada ruta y endpoint valida el rol.
- **RF-04** El cliente edita su perfil y administra varias direcciones de entrega.
- **RF-05** El administrador crea, edita, activa y suspende usuarios (empleados, repartidores, clientes).

### Catálogo
- **RF-06** Mostrar catálogo con imagen, nombre, descripción, precio y disponibilidad.
- **RF-07** Filtrar por categoría, buscar por texto y ordenar por precio o destacados.
- **RF-08** Detalle de producto con galería, reseñas y calificación promedio.
- **RF-09** El administrador/empleado crea, edita, publica y oculta productos y categorías, con carga de imágenes.
- **RF-10** El cliente guarda productos en favoritos.

### Carrito y pedidos
- **RF-11** Agregar, quitar y cambiar cantidades en el carrito; el carrito persiste entre sesiones.
- **RF-12** Elegir entrega a domicilio o recogida en tienda, y programar fecha/hora.
- **RF-13** Confirmar pedido con validación de stock y cálculo de subtotal, envío y total.
- **RF-14** Generar código único de pedido (ej. BP-20261015-0001).
- **RF-15** El cliente consulta su historial y el estado de cada pedido en tiempo real.
- **RF-16** El cliente cancela su pedido mientras esté en estado *pendiente*.
- **RF-17** El empleado cambia el estado: pendiente → confirmado → en preparación → listo → en camino → entregado (o cancelado), con registro en historial.
- **RF-18** Registrar ventas de mostrador y pedidos recibidos por WhatsApp.

### Pagos
- **RF-19** Registrar pago por efectivo, transferencia, Nequi, Daviplata o tarjeta.
- **RF-20** Adjuntar comprobante de pago y permitir al empleado aprobarlo o rechazarlo.

### Entregas
- **RF-21** El empleado asigna un repartidor a pedidos a domicilio.
- **RF-22** El repartidor ve sus entregas y marca: recogida, en camino, entregada o fallida.

### Inventario, insumos y compras
- **RF-23** Controlar stock de productos; descontarlo al confirmar pedido y registrar movimientos (producción, venta, merma, ajuste).
- **RF-24** Marcar automáticamente como *agotado* un producto sin stock.
- **RF-25** Gestionar insumos (harina, azúcar, huevos, mantequilla, levadura, leche, chocolate) y su stock mínimo.
- **RF-26** Gestionar proveedores y registrar compras de insumos que suman al stock.
- **RF-27** Alertas de stock bajo para productos e insumos.

### Comunicación y opiniones
- **RF-28** Formulario de contacto para visitantes y clientes; el administrador lo responde y gestiona su estado.
- **RF-29** Notificaciones push e internas sobre cambios de estado del pedido y nuevos pedidos.
- **RF-30** El cliente califica (1 a 5) y comenta productos de pedidos entregados; el administrador modera.

### Reportes
- **RF-31** Panel con ventas diarias/mensuales, productos más vendidos, pedidos por estado y compras de insumos.
- **RF-32** Exportar reportes a CSV/Excel.

---

## 3. Requisitos no funcionales

| ID | Categoría | Requisito |
|---|---|---|
| RNF-01 | PWA | Instalable (manifest, íconos 192/512 y maskable), con service worker (vite-plugin-pwa). |
| RNF-02 | PWA | Funciona sin conexión para el catálogo ya visitado y muestra página offline para el resto. |
| RNF-03 | Rendimiento | LCP < 2,5 s en 4G; imágenes en WebP con carga diferida; puntaje Lighthouse ≥ 90 en PWA y rendimiento. |
| RNF-04 | Usabilidad | Mobile-first y responsive; flujo de compra en máximo 4 pasos. |
| RNF-05 | Accesibilidad | Contraste WCAG AA, etiquetas en formularios y navegación por teclado. |
| RNF-06 | Seguridad | HTTPS obligatorio; contraseñas con bcrypt; JWT con expiración; helmet, CORS restringido y rate limiting. |
| RNF-07 | Seguridad | Validación de entradas en servidor (Zod/Joi), consultas parametrizadas contra inyección SQL, subida de imágenes limitada por tipo y tamaño. |
| RNF-08 | Privacidad | Cumplir la Ley 1581 de 2012 (habeas data): consentimiento y política de tratamiento de datos. |
| RNF-09 | Disponibilidad | Disponibilidad objetivo del 99 %; copias de seguridad automáticas de la BD. |
| RNF-10 | Base de datos | MySQL 8 con InnoDB, utf8mb4 e integridad referencial; usar *pool* de conexiones limitado al plan de Clever Cloud. |
| RNF-11 | Mantenibilidad | API REST versionada (`/api/v1`), código en Git, variables en `.env`, ESLint/Prettier y documentación con Swagger. |
| RNF-12 | Escalabilidad | Backend sin estado (stateless) para poder escalar horizontalmente. |
| RNF-13 | Compatibilidad | Chrome, Edge, Firefox y Safari recientes; Android 9+ e iOS 15+. |
| RNF-14 | Localización | Idioma español, moneda COP (sin decimales visibles) y zona horaria America/Bogota. |
| RNF-15 | Auditoría | Registro de cambios de estado de pedidos y movimientos de inventario con usuario y fecha. |

---

## 4. Historias de usuario

**Prioridad (MoSCoW):** M = imprescindible · S = importante · C = deseable

### Visitante
| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-01 | Como visitante quiero ver el catálogo para conocer los productos y precios sin registrarme. | Se listan productos publicados con imagen, precio y disponibilidad; los agotados se marcan. | M |
| HU-02 | Como visitante quiero buscar y filtrar por categoría para encontrar rápido lo que quiero. | La búsqueda devuelve resultados por nombre/descripción; el filtro combina con la búsqueda. | M |
| HU-03 | Como visitante quiero enviar un mensaje de contacto para resolver dudas con la panadería. | El formulario valida campos obligatorios y confirma el envío. | M |
| HU-04 | Como visitante quiero instalar la app en mi celular para acceder como una aplicación nativa. | Se ofrece el aviso de instalación y la app abre en pantalla completa. | S |

### Cliente
| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-05 | Como cliente quiero registrarme e iniciar sesión para hacer pedidos. | Correo único; contraseña mínima de 8 caracteres; se exige aceptar el tratamiento de datos. | M |
| HU-06 | Como cliente quiero recuperar mi contraseña si la olvido. | Se envía un enlace temporal por correo que caduca. | S |
| HU-07 | Como cliente quiero guardar mis direcciones para no escribirlas cada vez. | Puedo crear, editar, eliminar y marcar una dirección principal. | M |
| HU-08 | Como cliente quiero agregar productos al carrito y ajustar cantidades para armar mi pedido. | El total se recalcula al instante; no se supera el stock disponible. | M |
| HU-09 | Como cliente quiero elegir domicilio o recogida y una hora para recibir mi pedido cuando me convenga. | La fecha no puede ser pasada; el domicilio exige dirección. | M |
| HU-10 | Como cliente quiero indicar cómo pagaré y subir el comprobante para completar mi compra. | Puedo elegir método de pago y adjuntar imagen del comprobante. | M |
| HU-11 | Como cliente quiero ver el estado de mi pedido para saber cuándo llegará. | Veo la línea de tiempo de estados con hora de cada cambio. | M |
| HU-12 | Como cliente quiero recibir notificaciones cuando mi pedido cambie de estado. | Llega notificación push al cambiar el estado. | S |
| HU-13 | Como cliente quiero cancelar un pedido pendiente si me arrepiento. | Solo se puede cancelar en *pendiente*; el stock se restituye. | S |
| HU-14 | Como cliente quiero ver mi historial para repetir pedidos anteriores. | Lista paginada con opción «Volver a pedir». | S |
| HU-15 | Como cliente quiero calificar y comentar productos para ayudar a otros compradores. | Solo puedo opinar de pedidos entregados; una opinión por producto y pedido. | C |
| HU-16 | Como cliente quiero guardar favoritos para encontrarlos fácilmente. | Puedo marcar/desmarcar y ver mi lista. | C |

### Empleado
| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-17 | Como empleado quiero ver los pedidos nuevos para prepararlos a tiempo. | Bandeja ordenada por fecha programada, con filtro por estado y aviso de nuevo pedido. | M |
| HU-18 | Como empleado quiero cambiar el estado de un pedido para mantener informado al cliente. | Solo se permiten transiciones válidas y queda registro en el historial. | M |
| HU-19 | Como empleado quiero aprobar o rechazar comprobantes de pago para validar la compra. | El pago pasa a *aprobado* o *rechazado* con observación. | M |
| HU-20 | Como empleado quiero asignar un repartidor a un pedido a domicilio. | Solo se asignan repartidores activos; el repartidor es notificado. | M |
| HU-21 | Como empleado quiero registrar ventas de mostrador para llevar un solo control de ventas. | La venta descuenta stock y queda con canal «mostrador». | S |
| HU-22 | Como empleado quiero registrar la producción diaria para actualizar el stock. | Se crea un movimiento de inventario tipo *producción* y el stock aumenta. | M |
| HU-23 | Como empleado quiero responder mensajes de contacto. | Puedo cambiar el estado a leído/respondido y escribir la respuesta. | C |

### Repartidor
| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-24 | Como repartidor quiero ver mis entregas asignadas con dirección y teléfono del cliente para organizar mi ruta. | Solo veo entregas propias del día. | M |
| HU-25 | Como repartidor quiero marcar una entrega como recogida, en camino, entregada o fallida. | Cada cambio guarda la hora; «fallida» exige observación. | M |

### Administrador
| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-26 | Como administrador quiero crear y editar productos con imágenes para mantener el catálogo actualizado. | Validación de precio ≥ 0; imágenes en JPG/PNG/WebP de máximo 2 MB; puedo publicar u ocultar. | M |
| HU-27 | Como administrador quiero gestionar categorías. | No se elimina una categoría con productos asociados. | S |
| HU-28 | Como administrador quiero gestionar usuarios y roles para controlar el acceso. | Puedo crear empleados y repartidores, y suspender cuentas. | M |
| HU-29 | Como administrador quiero gestionar insumos y recibir alertas de stock bajo para no quedarme sin materia prima. | Alerta cuando el stock ≤ mínimo. | S |
| HU-30 | Como administrador quiero registrar compras a proveedores para controlar costos y stock de insumos. | La compra suma al stock del insumo y actualiza su último costo. | S |
| HU-31 | Como administrador quiero ver un panel de ventas para tomar decisiones. | Muestra ventas por día/mes, productos más vendidos y pedidos por estado. | S |
| HU-32 | Como administrador quiero exportar reportes a Excel/CSV. | El archivo respeta el rango de fechas elegido. | C |
| HU-33 | Como administrador quiero moderar reseñas ofensivas. | Puedo ocultar una reseña sin eliminarla. | C |

---

## 5. Sugerencia de entrega por fases (según el plan de trabajo)

1. **MVP (hasta 31/oct):** HU-01, 02, 03, 05, 07, 08, 09, 10, 11, 17, 18, 19, 24, 25, 26, 28.
2. **Lanzamiento (16/nov):** HU-04, 12, 13, 14, 20, 21, 22, 29.
3. **Mejoras (dic):** HU-06, 15, 16, 23, 27, 30–33.
