# Bakepulse

Panadería artesanal en Rionegro. PWA en React + Vite + Tailwind y API en Node.js + Express.

Slogan: *Cada creación, un impulso de felicidad.*

## Cómo correrlo

En dos terminales, con Node 22:

```bash
npm install --prefix backend-bakepulse
npm install --prefix frontend-bakepulse
npm run dev --prefix backend-bakepulse
npm run dev --prefix frontend-bakepulse
```

La tienda queda en `http://localhost:5173` y la API en `http://localhost:3001`. Vite reenvía `/api` al backend.

```bash
npm run check --prefix backend-bakepulse
```

## Cinco peticiones por sesión

Cada pestaña puede hacer como máximo 5 peticiones a `/api/v1`. Buscar, filtrar, ver un producto y armar el carrito no gastan peticiones: eso vive en el navegador. El catálogo visitado queda guardado para abrirlo sin conexión.

Una compra típica usa tres: cargar el horno, ingresar y confirmar. **Nueva sesión**, en el pie de página, abre otro cupo de 5.

El pool de MySQL también queda limitado a 5 conexiones, el tope del plan de Clever Cloud.

## Cuentas de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Cliente | mariana.gomez@correo.com | Cliente1234 |
| Panadero | panadero@bakepulse.com | Panadero1234 |
| Repartidor | repartidor@bakepulse.com | Reparto1234 |
| Administrador | admin@bakepulse.com | Admin12345 |

## Base de datos

Sin variables `MYSQL_*`, la API guarda los datos en `backend-bakepulse/data/store.json`. En Vercel ese archivo no persiste entre instancias: hay que poner las credenciales de Clever Cloud en el proyecto.

Copia `backend-bakepulse/.env.example` y completa:

- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `MYSQL_CONNECTION_LIMIT=5`
- `JWT_SECRET`
- `CORS_ORIGIN=https://bakepulsee.vercel.app`

La primera conexión crea las tablas del modelo (roles, usuarios, direcciones, categorías, productos, pedidos, historial, inventario, mensajes) y carga el horno de hoy.

## Vercel

El proyecto se publica desde la raíz del repositorio, no desde `frontend-bakepulse`. En el proyecto de Vercel, la raíz debe ser el repositorio completo. `vercel.json` construye la PWA y publica la API en `/api`.

```bash
npx vercel --prod
```

La dirección prevista es https://bakepulsee.vercel.app/.
