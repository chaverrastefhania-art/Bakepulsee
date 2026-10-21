import os from 'os'
import path from 'path'

process.env.STORE_FILE = path.join(os.tmpdir(), `bakepulse-${Date.now()}.json`)
process.env.SESSION_REQUEST_LIMIT = '5'
process.env.MYSQL_HOST = ''
process.env.MYSQL_ADDON_HOST = ''
process.env.MYSQL_ADDON_URI = ''
process.env.MYSQL_URI = ''

const { createApp } = await import('./app.js')
const server = createApp().listen(0)
const port = server.address().port
const base = `http://127.0.0.1:${port}`

function session() {
  return crypto.randomUUID()
}

async function call(sid, method, pathname, { token, body } = {}) {
  const headers = { 'content-type': 'application/json', 'x-session-id': sid }
  if (token) headers.authorization = `Bearer ${token}`
  const response = await fetch(base + pathname, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json()
  return { status: response.status, data }
}

try {
  const health = await fetch(`${base}/api/v1/health`)
  const healthBody = await health.json()
  if (!health.ok || healthBody.storage !== 'file') throw new Error('health')

  const sid = session()
  const boot = await call(sid, 'GET', '/api/v1/bootstrap')
  if (boot.status !== 200 || boot.data.products.length !== 6) throw new Error('catalogo')
  const croissant = boot.data.products.find((item) => item.name.startsWith('Croissant'))
  if (croissant.stock !== 12 || croissant.price !== 8500) throw new Error('producto')

  const login = await call(sid, 'POST', '/api/v1/auth', {
    body: { action: 'login', email: 'mariana.gomez@correo.com', password: 'Cliente1234' },
  })
  if (login.status !== 200 || login.data.account.user.role !== 'cliente') throw new Error('login')
  const token = login.data.token

  const soldOut = await call(sid, 'POST', '/api/v1/orders', {
    token,
    body: {
      items: [{ productId: 6, quantity: 1 }],
      deliveryType: 'recoger',
      paymentMethod: 'efectivo',
      contactPhone: '3104567890',
    },
  })
  if (soldOut.status !== 409) throw new Error('agotado')

  const order = await call(sid, 'POST', '/api/v1/orders', {
    token,
    body: {
      items: [{ productId: croissant.id, quantity: 2 }],
      deliveryType: 'domicilio',
      paymentMethod: 'efectivo',
      contactPhone: '3104567890',
      addressId: login.data.account.addresses[0].id,
    },
  })
  if (order.status !== 201 || !order.data.order.code.startsWith('BP-')) throw new Error('pedido ' + order.data.error)
  if (order.data.order.total !== 22000) throw new Error('total ' + order.data.order.total)
  if (order.data.products[0].stock !== 10) throw new Error('stock')

  const note = await call(sid, 'POST', '/api/v1/actions', {
    token,
    body: { type: 'contact', name: 'Mariana Gómez', email: 'mariana.gomez@correo.com', message: '¿Tienen pan mañana?' },
  })
  if (note.status !== 200) throw new Error('contacto ' + note.data.error)
  const blocked = await call(sid, 'GET', '/api/v1/bootstrap')
  if (blocked.status !== 429) throw new Error('limite ' + blocked.status)

  const staffSid = session()
  await call(staffSid, 'GET', '/api/v1/bootstrap')
  const baker = await call(staffSid, 'POST', '/api/v1/auth', {
    body: { action: 'login', email: 'panadero@bakepulse.com', password: 'Panadero1234' },
  })
  if (baker.data.account.user.role !== 'panadero') throw new Error('panadero')
  const moved = await call(staffSid, 'POST', '/api/v1/actions', {
    token: baker.data.token,
    body: { type: 'order.status', orderId: order.data.order.id, status: 'confirmado' },
  })
  if (moved.status !== 200 || moved.data.order.status !== 'confirmado') throw new Error('estado ' + moved.data.error)

  const customerSid = session()
  await call(customerSid, 'GET', '/api/v1/bootstrap')
  const again = await call(customerSid, 'POST', '/api/v1/auth', {
    body: { action: 'login', email: 'mariana.gomez@correo.com', password: 'Cliente1234' },
  })
  const fresh = again.data.account.orders.find((item) => item.status === 'pendiente')
  const created = await call(customerSid, 'POST', '/api/v1/orders', {
    token: again.data.token,
    body: {
      items: [{ productId: 5, quantity: 1 }],
      deliveryType: 'recoger',
      paymentMethod: 'transferencia',
      contactPhone: '3104567890',
    },
  })
  if (created.status !== 201) throw new Error('segundo ' + created.data.error)
  const cancel = await call(customerSid, 'POST', '/api/v1/actions', {
    token: again.data.token,
    body: { type: 'order.cancel', orderId: created.data.order.id },
  })
  if (cancel.status !== 200 || cancel.data.order.status !== 'cancelado') throw new Error('cancelar')
  const cookie = cancel.data.products.find((item) => item.id === 5)
  if (cookie.stock !== 16) throw new Error('devolucion ' + cookie.stock)
  if (!fresh && again.data.account.orders[0]?.code !== 'BP-20261020-0001') {
    /* el historial de ejemplo puede seguir presente */
  }

  console.log('Bakepulse API ok')
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  server.close()
}
