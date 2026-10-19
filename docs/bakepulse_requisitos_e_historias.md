# Bakepulse — Requisitos e historias de usuario

**Producto:** PWA de compra y venta de pan y repostería artesanal · Rionegro, Antioquia
**Stack:** React + Vite PWA + Tailwind · Node.js + Express · MySQL (Clever Cloud)

---

## 1. Roles del sistema

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Visitante** | Persona sin sesión | Ver catálogo, buscar, usar el carrito, enviar mensaje de contacto, registrarse |
| **Cliente** | Persona registrada | Todo lo del visitante, más: pedir, ver y cancelar sus pedidos, guardar direcciones, opinar |
| **Panadero** | Personal de cocina y mostrador | Gestionar catálogo e inventario, atender y preparar pedidos, responder mensajes |
| **Repartidor** | Domiciliario | Ver los pedidos que le asignaron y marcar la entrega |
| **Administrador** | Dueño del negocio | Todo lo del panadero, más: gestionar usuarios y roles, asignar repartidores, ver reportes |

### Matriz de permisos por módulo

| Módulo | Visitante | Cliente | Panadero | Repartidor | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver catálogo | ✔ | ✔ | ✔ | ✔ | ✔ |
| Carrito | ✔ | ✔ | — | — | — |
| Crear pedido | — | ✔ | — | — | — |
| Ver sus propios pedidos | — | ✔ | — | — | — |
| Ver todos los pedidos | — | — | ✔ | — | ✔ |
| Cambiar estado del pedido | — | cancelar (solo pendiente) | ✔ | solo entrega | ✔ |
| Asignar repartidor | — | — | — | — | ✔ |
| Ver entregas asignadas | — | — | — | ✔ | ✔ |
| CRUD productos y categorías | — | — | ✔ | — | ✔ |
| Inventario (entradas, ajustes) | — | — | ✔ | — | ✔ |
| Opiniones (escribir) | — | ✔ | — | — | — |
| Opiniones (moderar) | — | — | — | — | ✔ |
| Mensajes de contacto | enviar | enviar | responder | — | responder |
| Usuarios y roles | — | — | — | — | ✔ |
| Reportes de ventas | — | — | — | — | ✔ |

---

## 2. Requisitos funcionales

Prioridad: **A** = imprescindible para el lanzamiento · **M** = importante · **B** = deseable.

### Cuentas y acceso
| ID | Requisito | Rol | Prior. |
|---|---|---|---|
| RF-01 | El sistema debe permitir registrarse con nombre, correo, contraseña y celular. | Visitante | A |
| RF-02 | El sistema debe permitir iniciar y cerrar sesión. | Todos | A |
| RF-03 | El sistema debe restringir cada pantalla y cada endpoint según el rol del usuario. | Todos | A |
| RF-04 | El sistema debe permitir recuperar la contraseña por correo. | Todos | M |
| RF-05 | El usuario debe poder editar su perfil (nombre, celular, contraseña). | Autenticados | M |
| RF-06 | El cliente debe poder guardar, editar y eliminar direcciones de entrega y marcar una como principal. | Cliente | M |

### Catálogo
| ID | Requisito | Rol | Prior. |
|---|---|---|---|
| RF-07 | El sistema debe mostrar el catálogo con imagen, descripción, precio y disponibilidad. | Todos | A |
| RF-08 | El sistema debe permitir filtrar por categoría y buscar por nombre. | Todos | A |
| RF-09 | El sistema debe mostrar como "agotado" los productos sin stock y no permitir agregarlos al carrito. | Todos | A |
| RF-10 | El panadero/admin debe poder crear, editar y ocultar productos. | Panadero, Admin | A |
| RF-11 | El panadero/admin debe poder crear, editar y desactivar categorías. | Panadero, Admin | M |
| RF-12 | El sistema no debe borrar productos con ventas: los oculta y conserva el historial. | Panadero, Admin | A |

### Carrito y pedidos
| ID | Requisito | Rol | Prior. |
|---|---|---|---|
| RF-13 | El usuario debe poder agregar, quitar y cambiar la cantidad de productos del carrito, sin superar el stock. | Visitante, Cliente | A |
| RF-14 | El carrito debe conservarse al cerrar la app o al iniciar sesión. | Visitante, Cliente | A |
| RF-15 | El cliente debe poder confirmar un pedido eligiendo **domicilio** (con dirección) o **recoger en tienda**. | Cliente | A |
| RF-16 | El servidor debe recalcular precios y validar stock al crear el pedido, sin confiar en los valores del navegador. | Sistema | A |
| RF-17 | El cliente debe poder elegir el método de pago (efectivo o transferencia contra entrega). | Cliente | A |
| RF-18 | El cliente debe poder programar un pedido para una fecha y hora futuras. | Cliente | B |
| RF-19 | El cliente debe poder ver el historial y el estado de sus pedidos. | Cliente | A |
| RF-20 | El cliente debe poder cancelar un pedido mientras esté en estado *pendiente*. | Cliente | M |
| RF-21 | El panadero/admin debe ver todos los pedidos, filtrarlos por estado y cambiar su estado (pendiente → confirmado → preparando → listo → en camino → entregado, o cancelado). | Panadero, Admin | A |
| RF-22 | El sistema debe guardar cada cambio de estado con quién lo hizo y cuándo. | Sistema | M |
| RF-23 | El admin debe poder asignar un repartidor a los pedidos a domicilio. | Admin | A |
| RF-24 | El repartidor debe ver solo sus entregas asignadas (dirección, teléfono, total a cobrar) y marcarlas como entregadas. | Repartidor | A |
| RF-25 | El cliente debe recibir aviso dentro de la app cuando cambie el estado de su pedido (notificación push como mejora). | Cliente | M |

### Inventario
| ID | Requisito | Rol | Prior. |
|---|---|---|---|
| RF-26 | El sistema debe descontar el stock automáticamente al confirmar un pedido y devolverlo si se cancela. | Sistema | A |
| RF-27 | El panadero/admin debe poder registrar entradas, ajustes y mermas de inventario con motivo. | Panadero, Admin | M |
| RF-28 | El sistema debe alertar cuando un producto llegue a su stock mínimo. | Panadero, Admin | M |
| RF-29 | El sistema debe conservar el historial de movimientos de inventario por producto. | Panadero, Admin | M |

### Opiniones y contacto
| ID | Requisito | Rol | Prior. |
|---|---|---|---|
| RF-30 | El cliente debe poder calificar (1 a 5) y comentar un producto solo si lo recibió en un pedido entregado. | Cliente | M |
| RF-31 | El sistema debe mostrar el promedio de calificaciones en cada producto. | Todos | B |
| RF-32 | El admin debe poder ocultar opiniones inapropiadas. | Admin | B |
| RF-33 | Cualquier persona debe poder enviar un mensaje de contacto (nombre, correo, mensaje). | Todos | A |
| RF-34 | El panadero/admin debe poder ver los mensajes y marcarlos como leído o respondido. | Panadero, Admin | M |

### Administración y reportes
| ID | Requisito | Rol | Prior. |
|---|---|---|---|
| RF-35 | El admin debe poder crear usuarios de personal (panadero, repartidor), cambiar roles y activar o desactivar cuentas. | Admin | A |
| RF-36 | El admin debe ver ventas por día y por rango de fechas. | Admin | M |
| RF-37 | El admin debe ver los productos más vendidos. | Admin | M |
| RF-38 | El admin debe poder exportar reportes a CSV. | Admin | B |

### PWA
| ID | Requisito | Rol | Prior. |
|---|---|---|---|
| RF-39 | La aplicación debe poder instalarse en el celular (manifiesto e íconos). | Todos | A |
| RF-40 | El catálogo debe verse sin conexión con los últimos datos descargados, e indicar que no hay señal al intentar pedir. | Todos | M |

---

## 3. Requisitos no funcionales

| ID | Categoría | Requisito | Meta medible |
|---|---|---|---|
| RNF-01 | Rendimiento | El catálogo debe cargar rápido en móvil con 4G. | Carga inicial < 3 s; respuesta de la API < 500 ms en el 95 % de las consultas |
| RNF-02 | Rendimiento | Las imágenes deben cargarse de forma diferida y optimizada. | Cada imagen < 200 KB |
| RNF-03 | Seguridad | Las contraseñas se guardan con hash bcrypt; nunca en texto plano. | 100 % de las cuentas |
| RNF-04 | Seguridad | La autenticación usa tokens JWT con expiración. | Expiración ≤ 7 días |
| RNF-05 | Seguridad | Todo el tráfico va por HTTPS y el CORS solo permite el dominio del frontend. | Sin peticiones HTTP |
| RNF-06 | Seguridad | Se validan todas las entradas y se usan consultas parametrizadas contra inyección SQL. | 0 consultas con concatenación |
| RNF-07 | Seguridad | Se limita la cantidad de intentos de inicio de sesión (rate limiting). | Máx. 10 intentos por IP cada 15 min |
| RNF-08 | Seguridad | Las credenciales y secretos viven en variables de entorno, no en el repositorio. | 0 secretos en el código |
| RNF-09 | Privacidad | Se debe cumplir la Ley 1581 de 2012 (protección de datos personales): aviso de privacidad y consentimiento en el registro. | Casilla obligatoria de aceptación |
| RNF-10 | Usabilidad | Diseño *mobile-first*, botones y textos legibles, interfaz en español. | Uso correcto desde 360 px de ancho |
| RNF-11 | Accesibilidad | Contraste suficiente, foco visible, etiquetas en formularios. | Nivel WCAG 2.1 AA |
| RNF-12 | Usabilidad | Un cliente debe poder hacer un pedido en pocos pasos. | ≤ 5 toques desde el catálogo hasta confirmar |
| RNF-13 | Disponibilidad | El servicio debe estar disponible en horario de atención. | ≥ 99 % mensual |
| RNF-14 | Integridad | La creación de pedidos es transaccional: se guarda todo o nada. | Sin pedidos a medias ni stock negativo |
| RNF-15 | Integridad | La base de datos usa llaves foráneas, restricciones CHECK e índices en consultas frecuentes. | Todas las relaciones con FK |
| RNF-16 | Compatibilidad | Debe funcionar en Chrome y Edge recientes, Safari iOS 16+ y Chrome Android. | Pruebas manuales en cada uno |
| RNF-17 | PWA | Debe ser instalable y cumplir criterios PWA. | Lighthouse PWA aprobado; Performance ≥ 85 |
| RNF-18 | Mantenibilidad | Código en capas (rutas, middleware, acceso a datos), API REST documentada y uso de ESLint. | Endpoints listados en el README |
| RNF-19 | Escalabilidad | El backend debe funcionar con el límite de conexiones del plan de Clever Cloud. | Pool de ≤ 4 conexiones |
| RNF-20 | Respaldo | La base de datos debe tener copias de seguridad automáticas. | Backup diario del add-on |
| RNF-21 | Localización | Moneda en pesos colombianos, textos en español (es-CO) y zona horaria America/Bogota. | Formato $ 10.000 |
| RNF-22 | Trazabilidad | Se registran los errores del servidor y los cambios de estado de pedidos. | Historial consultable |

---

## 4. Historias de usuario

Formato: **Como** [rol], **quiero** [acción], **para** [beneficio]. Cada historia incluye criterios de aceptación y su relación con los requisitos.

### Visitante

**HU-01 · Ver el catálogo** (RF-07, RF-08, RF-09)
Como visitante, quiero ver los productos con foto, precio y disponibilidad, para decidir qué quiero antes de crear una cuenta.
- El catálogo se muestra sin iniciar sesión.
- Puedo filtrar por categoría.
- Los productos sin stock aparecen como agotados y no se pueden agregar.

**HU-02 · Registrarme** (RF-01, RNF-09)
Como visitante, quiero crear una cuenta con mi correo, para poder hacer pedidos.
- Debo aceptar el tratamiento de datos personales.
- Si el correo ya existe, veo un mensaje claro.
- La contraseña exige mínimo 8 caracteres.
- Al terminar quedo con la sesión iniciada y mi carrito intacto.

**HU-03 · Contactar a la panadería** (RF-33)
Como visitante, quiero enviar un mensaje desde la app, para hacer preguntas sin registrarme.
- El formulario pide nombre, correo y mensaje.
- Veo una confirmación al enviarlo.

### Cliente

**HU-04 · Armar mi carrito** (RF-13, RF-14)
Como cliente, quiero agregar productos y ajustar cantidades, para preparar mi pedido.
- No puedo pedir más unidades que el stock disponible.
- El total se actualiza al cambiar cantidades.
- El carrito sigue ahí si cierro y vuelvo a abrir la app.

**HU-05 · Hacer un pedido a domicilio** (RF-15, RF-16, RF-17)
Como cliente, quiero confirmar mi pedido con mi dirección y forma de pago, para recibir el pan en casa.
- Puedo elegir una dirección guardada o escribir una nueva.
- Veo el total final antes de confirmar.
- Si un producto se agotó mientras compraba, el sistema me dice cuál y no crea el pedido.

**HU-06 · Recoger en tienda** (RF-15)
Como cliente, quiero pedir y recoger en la panadería, para no pagar domicilio.
- Al elegir "recoger" no se me pide dirección.
- El pedido queda con costo de envío cero.

**HU-07 · Programar un pedido** (RF-18)
Como cliente, quiero indicar para qué día y hora lo necesito, para encargar una torta con anticipación.
- Solo puedo elegir fechas futuras.
- La fecha aparece visible para el panadero.

**HU-08 · Seguir mi pedido** (RF-19, RF-25)
Como cliente, quiero ver en qué estado va mi pedido, para saber cuándo llega.
- Veo la lista de mis pedidos, del más reciente al más antiguo.
- El estado cambia cuando la panadería lo actualiza y me llega un aviso.

**HU-09 · Cancelar un pedido** (RF-20, RF-26)
Como cliente, quiero cancelar un pedido que aún no se ha confirmado, para corregir un error.
- Solo puedo cancelar si está en estado pendiente.
- El stock de los productos se devuelve.

**HU-10 · Guardar mis direcciones** (RF-06)
Como cliente, quiero guardar varias direcciones, para no escribirlas cada vez.
- Puedo tener una dirección principal.
- Puedo editar o eliminar cualquiera.

**HU-11 · Opinar sobre un producto** (RF-30, RF-31)
Como cliente, quiero calificar lo que compré, para ayudar a otros y a la panadería a mejorar.
- Solo puedo opinar de productos de pedidos entregados.
- Solo una opinión por producto y pedido.
- Calificación de 1 a 5 y comentario opcional.

**HU-12 · Recuperar mi contraseña** (RF-04)
Como cliente, quiero restablecer mi contraseña por correo, para volver a entrar si la olvido.
- Recibo un enlace de un solo uso que caduca.
- Al cambiarla puedo iniciar sesión con la nueva contraseña.

**HU-13 · Instalar la app** (RF-39, RF-40)
Como cliente, quiero instalar Bakepulse en mi celular, para abrirla como cualquier otra app.
- El navegador ofrece instalarla.
- Sin señal, veo el último catálogo descargado y un aviso de que no puedo pedir.

### Panadero

**HU-14 · Administrar el catálogo** (RF-10, RF-11, RF-12)
Como panadero, quiero crear, editar y ocultar productos, para mantener el menú al día.
- Puedo cambiar nombre, precio, descripción, imagen y categoría.
- Un producto con ventas no se borra: se oculta.

**HU-15 · Atender pedidos** (RF-21, RF-22)
Como panadero, quiero ver los pedidos nuevos y avanzar su estado, para que el cliente sepa en qué punto va.
- Veo primero los pedidos pendientes y programados.
- Cada cambio queda registrado con mi nombre y la hora.

**HU-16 · Controlar el inventario** (RF-26, RF-27, RF-29)
Como panadero, quiero registrar lo que horneé y lo que se desperdició, para que el stock sea real.
- Puedo registrar entrada, ajuste o merma con un motivo.
- Veo el historial de movimientos de cada producto.

**HU-17 · Recibir alertas de stock bajo** (RF-28)
Como panadero, quiero ver qué productos se están acabando, para hornear a tiempo.
- La lista muestra los productos en o bajo su mínimo.

**HU-18 · Responder mensajes** (RF-34)
Como panadero, quiero ver los mensajes de contacto, para responder a los clientes.
- Puedo marcarlos como leído o respondido.

### Repartidor

**HU-19 · Ver mis entregas** (RF-24)
Como repartidor, quiero ver solo los pedidos que me asignaron, para organizar mi ruta.
- Veo dirección, celular del cliente, notas y monto a cobrar.
- No puedo ver pedidos de otros repartidores.

**HU-20 · Marcar entrega** (RF-21, RF-24)
Como repartidor, quiero marcar un pedido como entregado, para cerrar el servicio.
- Puedo pasar el pedido de "en camino" a "entregado".
- Si fue pago en efectivo o transferencia, queda registrado como pagado.

### Administrador

**HU-21 · Gestionar el personal** (RF-35, RF-03)
Como administrador, quiero crear cuentas de panadero y repartidor y cambiar roles, para controlar quién accede a qué.
- Puedo desactivar una cuenta sin borrar su historial.
- Un usuario desactivado no puede iniciar sesión.

**HU-22 · Asignar repartidores** (RF-23)
Como administrador, quiero asignar cada pedido a domicilio a un repartidor, para repartir la carga.
- Solo puedo elegir usuarios con rol repartidor activos.
- El repartidor ve el pedido en cuanto se le asigna.

**HU-23 · Ver las ventas** (RF-36)
Como administrador, quiero ver cuánto vendí por día, para entender cómo va el negocio.
- Puedo filtrar por rango de fechas.
- Solo cuentan los pedidos entregados.

**HU-24 · Ver lo más vendido** (RF-37)
Como administrador, quiero saber qué productos se venden más, para decidir qué producir.
- Veo unidades e ingresos por producto.

**HU-25 · Exportar reportes** (RF-38)
Como administrador, quiero descargar los reportes en CSV, para usarlos en Excel o compartirlos.

**HU-26 · Moderar opiniones** (RF-32)
Como administrador, quiero ocultar opiniones ofensivas, para cuidar la imagen de la panadería.
- La opinión oculta deja de mostrarse pero se conserva.

### Historias transversales (sistema)

**HU-27 · Proteger las rutas por rol** (RF-03, RNF-04)
Como administrador, quiero que cada usuario solo acceda a lo de su rol, para proteger los datos del negocio.
- Un cliente que intenta abrir el panel es redirigido.
- La API responde 403 si el rol no corresponde.

**HU-28 · Crear pedidos sin errores de stock** (RF-16, RF-26, RNF-14)
Como panadería, quiero que dos clientes no puedan comprar la última unidad a la vez, para no vender lo que no tengo.
- La creación del pedido bloquea las filas de producto en una transacción.
- Si falla algo, no se guarda nada.

---

## 5. Resumen de prioridades para el lanzamiento (16/11/2026 según tu plan de trabajo)

- **Primera entrega (prioridad A):** HU-01, 02, 03, 04, 05, 06, 08, 13, 14, 15, 19, 20, 21, 22, 27, 28.
- **Segunda entrega (M):** HU-09, 10, 11, 12, 16, 17, 18, 23, 24.
- **Mejoras (B):** HU-07, 25, 26 y notificaciones push.
