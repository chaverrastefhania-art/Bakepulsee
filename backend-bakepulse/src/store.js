import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  CATEGORIES, DELIVERY_FEE, PRODUCTS, REQUEST_LIMIT, ROLES, SHOP, USERS,
} from './seed-data.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRANSITIONS = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['preparando', 'cancelado'],
  preparando: ['listo', 'cancelado'],
  listo: ['en_camino', 'entregado', 'cancelado'],
  en_camino: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
}

function fail(status, message) {
  const error = new Error(message)
  error.status = status
  throw error
}

function bogotaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value
  return {
    stamp: `${get('year')}${get('month')}${get('day')}`,
    day: `${get('year')}-${get('month')}-${get('day')}`,
    iso: `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}-05:00`,
  }
}

function roleName(roleId) {
  return ROLES.find((role) => role.id === roleId)?.name || 'cliente'
}

function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: roleName(user.roleId),
    isActive: Boolean(user.isActive),
  }
}

function money(value) {
  return Math.round(Number(value) * 100) / 100
}

let active = null

export function getStore() {
  if (!active) throw new Error('El almacén no está listo')
  return active
}

export async function initStore() {
  if (active) return active
  if (process.env.MYSQL_HOST) {
    try {
      active = await createMysqlStore()
      return active
    } catch (error) {
      console.error('MySQL no respondió. Sigo con el archivo local:', error.message)
    }
  }
  active = await createMemoryStore()
  return active
}

function buildFresh() {
  const now = bogotaParts().iso
  const users = USERS.map((user) => ({
    id: user.id,
    roleId: user.roleId,
    name: user.name,
    email: user.email.toLowerCase(),
    phone: user.phone,
    passwordHash: bcrypt.hashSync(user.password, 10),
    isActive: 1,
    acceptedTermsAt: now,
    createdAt: now,
  }))
  return {
    seq: { user: 4, address: 1, category: 4, product: 6, order: 1, item: 1, history: 2, movement: 1, review: 1, message: 0 },
    sessions: {},
    roles: ROLES,
    users,
    addresses: [{
      id: 1, userId: 4, label: 'Casa', addressLine: 'Calle 47 #50-24, apto. 201',
      neighborhood: 'Centro', city: 'Rionegro', reference: 'Timbre 201, puerta de madera', isDefault: 1,
    }],
    categories: CATEGORIES.map((category) => ({ ...category, isActive: 1 })),
    products: PRODUCTS.map((product) => ({ ...product })),
    orders: [{
      id: 1, code: 'BP-20261020-0001', customerId: 4, deliveryUserId: 3,
      deliveryType: 'domicilio', deliveryAddress: 'Calle 47 #50-24, apto. 201, Centro, Rionegro',
      contactPhone: '3104567890', paymentMethod: 'efectivo', paymentStatus: 'pagado',
      status: 'entregado', subtotal: 8500, deliveryFee: 5000, total: 13500,
      notes: 'Pedido de ejemplo, ya entregado.', scheduledFor: null, createdAt: '2026-10-20T09:30:00-05:00',
    }],
    items: [{ id: 1, orderId: 1, productId: 1, productName: 'Croissant de mantequilla', unitPrice: 8500, quantity: 1 }],
    history: [
      { id: 1, orderId: 1, status: 'pendiente', changedBy: 4, comment: 'Pedido creado', createdAt: '2026-10-20T09:30:00-05:00' },
      { id: 2, orderId: 1, status: 'entregado', changedBy: 3, comment: 'Entregado en la puerta', createdAt: '2026-10-20T10:20:00-05:00' },
    ],
    movements: [{ id: 1, productId: 1, userId: 2, orderId: 1, type: 'venta', quantity: -1, reason: 'Pedido BP-20261020-0001', createdAt: '2026-10-20T09:30:00-05:00' }],
    reviews: [{ id: 1, userId: 4, productId: 1, orderId: 1, rating: 5, comment: 'Capas increíbles, se nota la mantequilla.', isVisible: 1, createdAt: '2026-10-20T18:00:00-05:00' }],
    messages: [],
  }
}

async function createMemoryStore() {
  const file = process.env.STORE_FILE || path.join(__dirname, '..', 'data', 'store.json')
  let state
  if (fs.existsSync(file)) {
    state = JSON.parse(fs.readFileSync(file, 'utf8'))
  } else {
    state = buildFresh()
    persist()
  }

  function persist() {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, JSON.stringify(state))
    } catch (error) {
      console.error('No pude guardar el archivo de datos:', error.message)
    }
  }

  function nextId(key) {
    state.seq[key] += 1
    return state.seq[key]
  }

  function productView(product) {
    const category = state.categories.find((item) => item.id === product.categoryId)
    return {
      id: product.id,
      categoryId: product.categoryId,
      category: category?.name || '',
      name: product.name,
      description: product.description,
      price: money(product.price),
      stock: product.stock,
      minStock: product.minStock,
      imageUrl: product.imageUrl,
      badge: product.badge,
      rating: product.rating,
      isActive: Boolean(product.isActive),
      available: product.isActive && product.stock > 0,
    }
  }

  function orderView(order) {
    const customer = state.users.find((user) => user.id === order.customerId)
    const courier = state.users.find((user) => user.id === order.deliveryUserId)
    return {
      id: order.id,
      code: order.code,
      customerId: order.customerId,
      customerName: customer?.name || '',
      customerPhone: order.contactPhone,
      deliveryUserId: order.deliveryUserId,
      deliveryName: courier?.name || null,
      deliveryType: order.deliveryType,
      deliveryAddress: order.deliveryAddress,
      contactPhone: order.contactPhone,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      subtotal: money(order.subtotal),
      deliveryFee: money(order.deliveryFee),
      total: money(order.total),
      notes: order.notes,
      scheduledFor: order.scheduledFor,
      createdAt: order.createdAt,
      items: state.items.filter((item) => item.orderId === order.id).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: money(item.unitPrice),
        quantity: item.quantity,
        lineTotal: money(item.unitPrice * item.quantity),
      })),
      history: state.history.filter((row) => row.orderId === order.id).map((row) => ({
        status: row.status,
        comment: row.comment,
        createdAt: row.createdAt,
        byName: state.users.find((user) => user.id === row.changedBy)?.name || '',
      })),
    }
  }

  function summary() {
    const today = bogotaParts().day
    const deliveredToday = state.orders.filter((order) => order.status === 'entregado' && String(order.createdAt).slice(0, 10) === today)
    const byStatus = {}
    for (const order of state.orders) byStatus[order.status] = (byStatus[order.status] || 0) + 1
    return {
      todayOrders: deliveredToday.length,
      todaySales: deliveredToday.reduce((sum, order) => sum + Number(order.total), 0),
      byStatus,
      lowStock: state.products.filter((product) => product.isActive && product.stock <= product.minStock).map(productView),
    }
  }

  function ordersFor(user) {
    if (user.role === 'cliente') return state.orders.filter((order) => order.customerId === user.id).map(orderView).reverse()
    if (user.role === 'repartidor') {
      return state.orders
        .filter((order) => order.deliveryUserId === user.id && !['cancelado'].includes(order.status))
        .map(orderView)
        .reverse()
    }
    return state.orders.map(orderView).reverse()
  }

  function accountFor(user) {
    if (!user) return null
    const full = publicUser(state.users.find((item) => item.id === user.id))
    const payload = {
      user: full,
      addresses: state.addresses.filter((address) => address.userId === user.id),
      orders: ordersFor(full),
    }
    if (full.role === 'administrador' || full.role === 'panadero') {
      payload.board = {
        orders: ordersFor(full),
        messages: [...state.messages].reverse(),
        couriers: state.users.filter((item) => item.roleId === 3 && item.isActive).map(publicUser),
        summary: summary(),
        users: full.role === 'administrador' ? state.users.map(publicUser) : undefined,
        products: state.products.map(productView),
      }
    } else if (full.role === 'repartidor') {
      payload.board = { orders: ordersFor(full), couriers: [], messages: [], summary: summary() }
    }
    return payload
  }

  return {
    mode: 'file',
    async consume(sessionId) {
      const row = state.sessions[sessionId] || { hits: 0 }
      if (row.hits >= REQUEST_LIMIT) {
        return { allowed: false, used: row.hits, remaining: 0, limit: REQUEST_LIMIT }
      }
      row.hits += 1
      state.sessions[sessionId] = row
      persist()
      return { allowed: true, used: row.hits, remaining: REQUEST_LIMIT - row.hits, limit: REQUEST_LIMIT }
    },
    async catalog() {
      return {
        shop: SHOP,
        categories: state.categories.filter((category) => category.isActive),
        products: state.products.filter((product) => product.isActive).map(productView),
      }
    },
    async userByEmail(email) {
      return state.users.find((user) => user.email === email.toLowerCase()) || null
    },
    async publicUserById(id) {
      return publicUser(state.users.find((user) => user.id === id))
    },
    async accountFor(user) {
      return accountFor(user)
    },
    async createUser({ name, email, phone, password }) {
      if (state.users.some((user) => user.email === email.toLowerCase())) {
        fail(409, 'Este correo ya tiene una cuenta. Ingresa o recupera tu contraseña.')
      }
      const user = {
        id: nextId('user'),
        roleId: 4,
        name,
        email: email.toLowerCase(),
        phone,
        passwordHash: bcrypt.hashSync(password, 10),
        isActive: 1,
        acceptedTermsAt: bogotaParts().iso,
        createdAt: bogotaParts().iso,
      }
      state.users.push(user)
      persist()
      return publicUser(user)
    },
    async createOrder(user, input) {
      const customer = state.users.find((item) => item.id === user.id)
      if (!customer?.isActive) fail(403, 'Tu cuenta está suspendida.')
      let addressText = null
      if (input.deliveryType === 'domicilio') {
        if (input.addressId) {
          const saved = state.addresses.find((address) => address.id === input.addressId && address.userId === user.id)
          if (!saved) fail(400, 'No encontramos esa dirección.')
          addressText = [saved.addressLine, saved.neighborhood, saved.city].filter(Boolean).join(', ')
        } else if (input.address?.addressLine) {
          addressText = [input.address.addressLine, input.address.neighborhood, input.address.city || 'Rionegro'].filter(Boolean).join(', ')
          if (input.address.save) {
            if (input.address.isDefault) {
              for (const address of state.addresses) {
                if (address.userId === user.id) address.isDefault = 0
              }
            }
            state.addresses.push({
              id: nextId('address'),
              userId: user.id,
              label: input.address.label || 'Casa',
              addressLine: input.address.addressLine,
              neighborhood: input.address.neighborhood || '',
              city: input.address.city || 'Rionegro',
              reference: input.address.reference || '',
              isDefault: input.address.isDefault ? 1 : 0,
            })
          }
        } else {
          fail(400, 'El domicilio necesita una dirección en Rionegro.')
        }
      }
      if (input.scheduledFor) {
        const when = new Date(input.scheduledFor)
        if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
          fail(400, 'La fecha del pedido no puede ser pasada.')
        }
      }
      const lines = []
      for (const line of input.items) {
        const product = state.products.find((item) => item.id === line.productId && item.isActive)
        if (!product) fail(400, 'Hay un producto que ya no está publicado.')
        if (product.stock < line.quantity) {
          fail(409, product.stock === 0
            ? `${product.name} se agotó. No confirmamos la compra.`
            : `Solo quedan ${product.stock} de ${product.name}. Ajusta la cantidad.`)
        }
        lines.push({ product, quantity: line.quantity })
      }
      const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
      const deliveryFee = input.deliveryType === 'domicilio' ? DELIVERY_FEE : 0
      const now = bogotaParts()
      const sameDay = state.orders.filter((order) => order.code?.includes(`BP-${now.stamp}-`)).length + 1
      const order = {
        id: nextId('order'),
        code: `BP-${now.stamp}-${String(sameDay).padStart(4, '0')}`,
        customerId: user.id,
        deliveryUserId: null,
        deliveryType: input.deliveryType,
        deliveryAddress: addressText,
        contactPhone: input.contactPhone,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'pendiente',
        status: 'pendiente',
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        notes: input.notes || '',
        scheduledFor: input.scheduledFor || null,
        createdAt: now.iso,
      }
      state.orders.push(order)
      for (const line of lines) {
        line.product.stock -= line.quantity
        state.items.push({
          id: nextId('item'), orderId: order.id, productId: line.product.id,
          productName: line.product.name, unitPrice: line.product.price, quantity: line.quantity,
        })
        state.movements.push({
          id: nextId('movement'), productId: line.product.id, userId: user.id, orderId: order.id,
          type: 'venta', quantity: -line.quantity, reason: `Pedido ${order.code}`, createdAt: now.iso,
        })
      }
      state.history.push({
        id: nextId('history'), orderId: order.id, status: 'pendiente', changedBy: user.id,
        comment: 'Pedido creado', createdAt: now.iso,
      })
      persist()
      return {
        order: orderView(order),
        products: lines.map((line) => productView(line.product)),
      }
    },
    async applyAction(user, action) {
      const now = bogotaParts().iso
      if (action.type === 'contact') {
        const message = {
          id: nextId('message'),
          userId: user?.id || null,
          name: action.name,
          email: action.email,
          phone: action.phone || '',
          message: action.message,
          status: 'nuevo',
          createdAt: now,
        }
        state.messages.push(message)
        persist()
        return { message: 'Recibimos tu mensaje. Te responderemos en el horario de la panadería.' }
      }
      const full = state.users.find((item) => item.id === user?.id)
      if (!full?.isActive) fail(403, 'Tu cuenta está suspendida.')
      if (action.type === 'address.save') {
        if (action.isDefault) {
          for (const address of state.addresses) {
            if (address.userId === user.id) address.isDefault = 0
          }
        }
        if (action.id) {
          const current = state.addresses.find((address) => address.id === action.id && address.userId === user.id)
          if (!current) fail(404, 'No encontramos esa dirección.')
          Object.assign(current, {
            label: action.label || current.label,
            addressLine: action.addressLine,
            neighborhood: action.neighborhood || '',
            city: action.city || 'Rionegro',
            reference: action.reference || '',
            isDefault: action.isDefault ? 1 : 0,
          })
        } else {
          state.addresses.push({
            id: nextId('address'), userId: user.id, label: action.label || 'Casa',
            addressLine: action.addressLine, neighborhood: action.neighborhood || '',
            city: action.city || 'Rionegro', reference: action.reference || '',
            isDefault: action.isDefault ? 1 : 0,
          })
        }
        persist()
        return { addresses: state.addresses.filter((address) => address.userId === user.id) }
      }
      if (action.type === 'address.delete') {
        const before = state.addresses.length
        state.addresses = state.addresses.filter((address) => !(address.id === action.id && address.userId === user.id))
        if (state.addresses.length === before) fail(404, 'No encontramos esa dirección.')
        persist()
        return { addresses: state.addresses.filter((address) => address.userId === user.id) }
      }
      if (action.type === 'order.cancel') {
        const order = state.orders.find((item) => item.id === action.orderId && item.customerId === user.id)
        if (!order) fail(404, 'No encontramos ese pedido.')
        if (order.status !== 'pendiente') fail(409, 'Solo puedes cancelar un pedido pendiente.')
        restore(order, user.id, now, 'Cancelado por el cliente')
        persist()
        return { order: orderView(order), products: state.products.map(productView) }
      }
      if (action.type === 'order.status') {
        if (!['administrador', 'panadero', 'repartidor'].includes(user.role)) fail(403, 'No tienes permiso para cambiar el estado.')
        const order = state.orders.find((item) => item.id === action.orderId)
        if (!order) fail(404, 'No encontramos ese pedido.')
        if (user.role === 'repartidor' && order.deliveryUserId !== user.id) fail(403, 'Esta entrega no está en tu ruta.')
        const next = action.status
        if (user.role === 'repartidor' && !['en_camino', 'entregado', 'cancelado'].includes(next)) {
          fail(403, 'Puedes marcar la entrega como en camino, entregada o fallida.')
        }
        if (next === 'cancelado' && user.role === 'repartidor' && !action.comment) {
          fail(400, 'Si la entrega falla, escribe qué pasó.')
        }
        if (!TRANSITIONS[order.status]?.includes(next)) {
          fail(409, `No se puede pasar de ${order.status} a ${next}.`)
        }
        if (next === 'en_camino' && order.deliveryType !== 'domicilio') {
          fail(409, 'Un pedido para recoger no sale a domicilio.')
        }
        if (next === 'cancelado') restore(order, user.id, now, action.comment || 'Cancelado por la panadería')
        else {
          order.status = next
          state.history.push({ id: nextId('history'), orderId: order.id, status: next, changedBy: user.id, comment: action.comment || '', createdAt: now })
        }
        persist()
        return { order: orderView(order), summary: summary(), products: state.products.map(productView) }
      }
      if (action.type === 'order.payment') {
        if (!['administrador', 'panadero'].includes(user.role)) fail(403, 'Solo la panadería confirma pagos.')
        const order = state.orders.find((item) => item.id === action.orderId)
        if (!order) fail(404, 'No encontramos ese pedido.')
        if (!['pendiente', 'pagado'].includes(action.paymentStatus)) fail(400, 'El pago queda pendiente o pagado.')
        order.paymentStatus = action.paymentStatus
        persist()
        return { order: orderView(order) }
      }
      if (action.type === 'order.assign') {
        if (!['administrador', 'panadero'].includes(user.role)) fail(403, 'Solo la panadería asigna repartidores.')
        const order = state.orders.find((item) => item.id === action.orderId)
        if (!order) fail(404, 'No encontramos ese pedido.')
        if (order.deliveryType !== 'domicilio') fail(409, 'La recogida en panadería no lleva repartidor.')
        const courier = state.users.find((item) => item.id === action.deliveryUserId && item.roleId === 3 && item.isActive)
        if (!courier) fail(400, 'Elige un repartidor activo.')
        order.deliveryUserId = courier.id
        state.history.push({
          id: nextId('history'), orderId: order.id, status: order.status, changedBy: user.id,
          comment: `Repartidor asignado: ${courier.name}`, createdAt: now,
        })
        persist()
        return { order: orderView(order) }
      }
      if (action.type === 'product.save') {
        if (!['administrador', 'panadero'].includes(user.role)) fail(403, 'No puedes editar el catálogo.')
        if (action.price < 0 || action.stock < 0) fail(400, 'El precio y el stock no pueden ser negativos.')
        const category = state.categories.find((item) => item.id === action.categoryId && item.isActive)
        if (!category) fail(400, 'Elige una categoría válida.')
        let product = action.id ? state.products.find((item) => item.id === action.id) : null
        if (action.id && !product) fail(404, 'No encontramos ese producto.')
        if (!product) {
          product = { id: nextId('product'), createdAt: now }
          state.products.push(product)
        }
        const previous = product.stock || 0
        Object.assign(product, {
          categoryId: action.categoryId,
          name: action.name,
          description: action.description || '',
          price: money(action.price),
          stock: action.stock,
          minStock: action.minStock ?? product.minStock ?? 5,
          imageUrl: action.imageUrl || product.imageUrl || '',
          badge: action.badge || '',
          rating: product.rating ?? null,
          isActive: action.isActive === false ? 0 : 1,
        })
        if (action.id && action.stock !== previous) {
          state.movements.push({
            id: nextId('movement'), productId: product.id, userId: user.id, orderId: null,
            type: 'ajuste', quantity: action.stock - previous, reason: action.reason || 'Ajuste de inventario', createdAt: now,
          })
        }
        persist()
        return { product: productView(product), summary: summary() }
      }
      if (action.type === 'stock') {
        if (!['administrador', 'panadero'].includes(user.role)) fail(403, 'No puedes mover inventario.')
        const product = state.products.find((item) => item.id === action.productId)
        if (!product) fail(404, 'No encontramos ese producto.')
        const quantity = Number(action.quantity)
        if (!Number.isInteger(quantity) || quantity === 0) fail(400, 'Indica una cantidad distinta de cero.')
        if (product.stock + quantity < 0) fail(409, 'El stock no puede quedar negativo.')
        product.stock += quantity
        state.movements.push({
          id: nextId('movement'), productId: product.id, userId: user.id, orderId: null,
          type: action.movementType || 'entrada', quantity, reason: action.reason || 'Producción del día', createdAt: now,
        })
        persist()
        return { product: productView(product), summary: summary() }
      }
      if (action.type === 'user.active') {
        if (user.role !== 'administrador') fail(403, 'Solo el administrador suspende cuentas.')
        const target = state.users.find((item) => item.id === action.userId)
        if (!target) fail(404, 'No encontramos ese usuario.')
        if (target.id === user.id) fail(409, 'No puedes suspender tu propia cuenta.')
        target.isActive = action.isActive ? 1 : 0
        persist()
        return { users: state.users.map(publicUser) }
      }
      if (action.type === 'message.status') {
        if (!['administrador', 'panadero'].includes(user.role)) fail(403, 'No puedes gestionar mensajes.')
        const message = state.messages.find((item) => item.id === action.id)
        if (!message) fail(404, 'No encontramos ese mensaje.')
        if (!['nuevo', 'leido', 'respondido'].includes(action.status)) fail(400, 'Estado de mensaje no válido.')
        message.status = action.status
        persist()
        return { messages: [...state.messages].reverse() }
      }
      fail(400, 'No reconozco esa acción.')

      function restore(order, userId, at, comment) {
        if (order.status === 'cancelado') return
        for (const item of state.items.filter((row) => row.orderId === order.id)) {
          const product = state.products.find((row) => row.id === item.productId)
          if (product) product.stock += item.quantity
          state.movements.push({
            id: nextId('movement'), productId: item.productId, userId, orderId: order.id,
            type: 'devolucion', quantity: item.quantity, reason: comment, createdAt: at,
          })
        }
        order.status = 'cancelado'
        state.history.push({ id: nextId('history'), orderId: order.id, status: 'cancelado', changedBy: userId, comment, createdAt: at })
      }
    },
  }
}

async function createMysqlStore() {
  const mysql = await import('mysql2/promise')
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 5),
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '-05:00',
    enableKeepAlive: true,
  })
  const conn = await pool.getConnection()
  try {
    await migrate(conn)
    const [rows] = await conn.query('SELECT COUNT(*) AS n FROM roles')
    if (Number(rows[0].n) === 0) await seedMysql(conn)
  } finally {
    conn.release()
  }

  async function q(sql, params = []) {
    const [rows] = await pool.query(sql, params)
    return rows
  }

  function productView(row) {
    return {
      id: row.id,
      categoryId: row.category_id,
      category: row.category_name,
      name: row.name,
      description: row.description,
      price: money(row.price),
      stock: Number(row.stock),
      minStock: Number(row.min_stock),
      imageUrl: row.image_url,
      badge: row.badge,
      rating: row.rating == null ? null : Number(row.rating),
      isActive: Boolean(row.is_active),
      available: row.is_active && Number(row.stock) > 0,
    }
  }

  async function loadOrder(id) {
    const orders = await q(`
      SELECT o.*, c.name AS customer_name, d.name AS delivery_name
      FROM orders o
      JOIN users c ON c.id = o.customer_id
      LEFT JOIN users d ON d.id = o.delivery_user_id
      WHERE o.id = ?`, [id])
    if (!orders[0]) return null
    const items = await q('SELECT * FROM order_items WHERE order_id = ?', [id])
    const history = await q(`
      SELECT h.status, h.comment, h.created_at, u.name AS by_name
      FROM order_status_history h JOIN users u ON u.id = h.changed_by
      WHERE h.order_id = ? ORDER BY h.id`, [id])
    return mapOrder(orders[0], items, history)
  }

  function mapOrder(order, items, history) {
    return {
      id: order.id,
      code: order.code,
      customerId: order.customer_id,
      customerName: order.customer_name,
      customerPhone: order.contact_phone,
      deliveryUserId: order.delivery_user_id,
      deliveryName: order.delivery_name,
      deliveryType: order.delivery_type,
      deliveryAddress: order.delivery_address,
      contactPhone: order.contact_phone,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      status: order.status,
      subtotal: money(order.subtotal),
      deliveryFee: money(order.delivery_fee),
      total: money(order.total),
      notes: order.notes,
      scheduledFor: order.scheduled_for,
      createdAt: order.created_at,
      items: items.map((item) => ({
        productId: item.product_id,
        productName: item.product_name,
        unitPrice: money(item.unit_price),
        quantity: item.quantity,
        lineTotal: money(item.unit_price * item.quantity),
      })),
      history: history.map((row) => ({
        status: row.status, comment: row.comment, createdAt: row.created_at, byName: row.by_name,
      })),
    }
  }

  async function ordersFor(user) {
    let sql = `
      SELECT o.*, c.name AS customer_name, d.name AS delivery_name
      FROM orders o
      JOIN users c ON c.id = o.customer_id
      LEFT JOIN users d ON d.id = o.delivery_user_id`
    const params = []
    if (user.role === 'cliente') {
      sql += ' WHERE o.customer_id = ?'
      params.push(user.id)
    } else if (user.role === 'repartidor') {
      sql += ' WHERE o.delivery_user_id = ? AND o.status <> "cancelado"'
      params.push(user.id)
    }
    sql += ' ORDER BY o.id DESC'
    const orders = await q(sql, params)
    const result = []
    for (const order of orders) {
      const items = await q('SELECT * FROM order_items WHERE order_id = ?', [order.id])
      const history = await q(`
        SELECT h.status, h.comment, h.created_at, u.name AS by_name
        FROM order_status_history h JOIN users u ON u.id = h.changed_by
        WHERE h.order_id = ? ORDER BY h.id`, [order.id])
      result.push(mapOrder(order, items, history))
    }
    return result
  }

  async function summary() {
    const day = bogotaParts().day
    const [today] = await q(`
      SELECT COUNT(*) AS pedidos, COALESCE(SUM(total),0) AS ventas
      FROM orders WHERE status = 'entregado' AND DATE(created_at) = ?`, [day])
    const byRows = await q('SELECT status, COUNT(*) AS n FROM orders GROUP BY status')
    const byStatus = {}
    for (const row of byRows) byStatus[row.status] = Number(row.n)
    const low = await q(`
      SELECT p.*, c.name AS category_name FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1 AND p.stock <= p.min_stock`)
    return {
      todayOrders: Number(today.pedidos),
      todaySales: money(today.ventas),
      byStatus,
      lowStock: low.map(productView),
    }
  }

  async function addressesOf(userId) {
    const rows = await q('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id', [userId])
    return rows.map((row) => ({
      id: row.id, userId: row.user_id, label: row.label, addressLine: row.address_line,
      neighborhood: row.neighborhood, city: row.city, reference: row.reference, isDefault: row.is_default,
    }))
  }

  async function accountFor(user) {
    if (!user) return null
    const [row] = await q('SELECT * FROM users WHERE id = ?', [user.id])
    const full = {
      id: row.id, name: row.name, email: row.email, phone: row.phone,
      role: roleName(row.role_id), isActive: Boolean(row.is_active),
    }
    const payload = { user: full, addresses: await addressesOf(user.id), orders: await ordersFor(full) }
    if (full.role === 'administrador' || full.role === 'panadero' || full.role === 'repartidor') {
      const couriers = await q('SELECT * FROM users WHERE role_id = 3 AND is_active = 1')
      const messages = await q('SELECT * FROM contact_messages ORDER BY id DESC')
      payload.board = {
        orders: payload.orders,
        messages: messages.map(mapMessage),
        couriers: couriers.map((item) => ({
          id: item.id, name: item.name, email: item.email, phone: item.phone,
          role: 'repartidor', isActive: true,
        })),
        summary: await summary(),
      }
      if (full.role === 'administrador') {
        const users = await q('SELECT * FROM users ORDER BY id')
        payload.board.users = users.map((item) => ({
          id: item.id, name: item.name, email: item.email, phone: item.phone,
          role: roleName(item.role_id), isActive: Boolean(item.is_active),
        }))
      }
      if (full.role !== 'repartidor') {
        payload.board.products = (await q(`
          SELECT p.*, c.name AS category_name FROM products p
          JOIN categories c ON c.id = p.category_id ORDER BY p.id`)).map(productView)
      }
    }
    return payload
  }

  return {
    mode: 'mysql',
    async consume(sessionId) {
      const rows = await q('SELECT hits FROM api_sessions WHERE id = ?', [sessionId])
      const hits = rows[0] ? Number(rows[0].hits) : 0
      if (hits >= REQUEST_LIMIT) return { allowed: false, used: hits, remaining: 0, limit: REQUEST_LIMIT }
      if (rows[0]) await q('UPDATE api_sessions SET hits = hits + 1 WHERE id = ?', [sessionId])
      else await q('INSERT INTO api_sessions (id, hits) VALUES (?, 1)', [sessionId])
      return { allowed: true, used: hits + 1, remaining: REQUEST_LIMIT - hits - 1, limit: REQUEST_LIMIT }
    },
    async catalog() {
      const categories = await q('SELECT id, name, description, is_active AS isActive FROM categories WHERE is_active = 1')
      const products = await q(`
        SELECT p.*, c.name AS category_name FROM products p
        JOIN categories c ON c.id = p.category_id WHERE p.is_active = 1 ORDER BY p.id`)
      return { shop: SHOP, categories, products: products.map(productView) }
    },
    async userByEmail(email) {
      const rows = await q('SELECT * FROM users WHERE email = ?', [email.toLowerCase()])
      if (!rows[0]) return null
      return { ...rows[0], roleId: rows[0].role_id, passwordHash: rows[0].password_hash, isActive: rows[0].is_active }
    },
    accountFor,
    async createUser({ name, email, phone, password }) {
      const existing = await q('SELECT id FROM users WHERE email = ?', [email.toLowerCase()])
      if (existing[0]) fail(409, 'Este correo ya tiene una cuenta. Ingresa o recupera tu contraseña.')
      const hash = bcrypt.hashSync(password, 10)
      const result = await q(
        'INSERT INTO users (role_id, name, email, phone, password_hash, is_active, accepted_terms_at) VALUES (4,?,?,?,?,1,NOW())',
        [name, email.toLowerCase(), phone, hash],
      )
      return { id: result.insertId, name, email: email.toLowerCase(), phone, role: 'cliente', isActive: true }
    },
    async createOrder(user, input) {
      const connection = await pool.getConnection()
      try {
        await connection.beginTransaction()
        const [customers] = await connection.query('SELECT is_active, phone FROM users WHERE id = ?', [user.id])
        if (!customers[0]?.is_active) fail(403, 'Tu cuenta está suspendida.')
        let addressText = null
        if (input.deliveryType === 'domicilio') {
          if (input.addressId) {
            const [saved] = await connection.query('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [input.addressId, user.id])
            if (!saved[0]) fail(400, 'No encontramos esa dirección.')
            addressText = [saved[0].address_line, saved[0].neighborhood, saved[0].city].filter(Boolean).join(', ')
          } else if (input.address?.addressLine) {
            addressText = [input.address.addressLine, input.address.neighborhood, input.address.city || 'Rionegro'].filter(Boolean).join(', ')
            if (input.address.save) {
              if (input.address.isDefault) await connection.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [user.id])
              await connection.query(
                'INSERT INTO addresses (user_id, label, address_line, neighborhood, city, reference, is_default) VALUES (?,?,?,?,?,?,?)',
                [user.id, input.address.label || 'Casa', input.address.addressLine, input.address.neighborhood || '', input.address.city || 'Rionegro', input.address.reference || '', input.address.isDefault ? 1 : 0],
              )
            }
          } else fail(400, 'El domicilio necesita una dirección en Rionegro.')
        }
        if (input.scheduledFor && new Date(input.scheduledFor).getTime() < Date.now() - 60_000) {
          fail(400, 'La fecha del pedido no puede ser pasada.')
        }
        const ids = input.items.map((item) => item.productId)
        const [locked] = await connection.query(
          `SELECT * FROM products WHERE id IN (${ids.map(() => '?').join(',')}) FOR UPDATE`,
          ids,
        )
        const lines = []
        for (const line of input.items) {
          const product = locked.find((item) => item.id === line.productId && item.is_active)
          if (!product) fail(400, 'Hay un producto que ya no está publicado.')
          if (Number(product.stock) < line.quantity) {
            fail(409, Number(product.stock) === 0
              ? `${product.name} se agotó. No confirmamos la compra.`
              : `Solo quedan ${product.stock} de ${product.name}. Ajusta la cantidad.`)
          }
          lines.push({ product, quantity: line.quantity })
        }
        const subtotal = lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0)
        const deliveryFee = input.deliveryType === 'domicilio' ? DELIVERY_FEE : 0
        const stamp = bogotaParts().stamp
        const [countRows] = await connection.query('SELECT COUNT(*) AS n FROM orders WHERE code LIKE ?', [`BP-${stamp}-%`])
        const code = `BP-${stamp}-${String(Number(countRows[0].n) + 1).padStart(4, '0')}`
        const [created] = await connection.query(`
          INSERT INTO orders (code, customer_id, delivery_type, delivery_address, contact_phone, payment_method, payment_status, status, subtotal, delivery_fee, total, notes, scheduled_for)
          VALUES (?,?,?,?,?,?, 'pendiente', 'pendiente', ?,?,?,?,?)`,
        [code, user.id, input.deliveryType, addressText, input.contactPhone, input.paymentMethod, subtotal, deliveryFee, subtotal + deliveryFee, input.notes || '', input.scheduledFor || null])
        const orderId = created.insertId
        for (const line of lines) {
          await connection.query(
            'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?,?,?,?,?)',
            [orderId, line.product.id, line.product.name, line.product.price, line.quantity],
          )
          await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [line.quantity, line.product.id])
          await connection.query(
            'INSERT INTO stock_movements (product_id, user_id, order_id, type, quantity, reason) VALUES (?,?,?,?,?,?)',
            [line.product.id, user.id, orderId, 'venta', -line.quantity, `Pedido ${code}`],
          )
        }
        await connection.query(
          'INSERT INTO order_status_history (order_id, status, changed_by, comment) VALUES (?,?,?,?)',
          [orderId, 'pendiente', user.id, 'Pedido creado'],
        )
        await connection.commit()
        const products = await q(`
          SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id
          WHERE p.id IN (${ids.map(() => '?').join(',')})`, ids)
        return { order: await loadOrder(orderId), products: products.map(productView) }
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    },
    async applyAction(user, action) {
      if (action.type === 'contact') {
        await q(
          'INSERT INTO contact_messages (user_id, name, email, phone, message, status) VALUES (?,?,?,?,?, "nuevo")',
          [user?.id || null, action.name, action.email, action.phone || '', action.message],
        )
        return { message: 'Recibimos tu mensaje. Te responderemos en el horario de la panadería.' }
      }
      if (action.type === 'address.save') {
        if (action.isDefault) await q('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [user.id])
        if (action.id) {
          const result = await q(
            'UPDATE addresses SET label=?, address_line=?, neighborhood=?, city=?, reference=?, is_default=? WHERE id=? AND user_id=?',
            [action.label || 'Casa', action.addressLine, action.neighborhood || '', action.city || 'Rionegro', action.reference || '', action.isDefault ? 1 : 0, action.id, user.id],
          )
          if (!result.affectedRows) fail(404, 'No encontramos esa dirección.')
        } else {
          await q(
            'INSERT INTO addresses (user_id, label, address_line, neighborhood, city, reference, is_default) VALUES (?,?,?,?,?,?,?)',
            [user.id, action.label || 'Casa', action.addressLine, action.neighborhood || '', action.city || 'Rionegro', action.reference || '', action.isDefault ? 1 : 0],
          )
        }
        return { addresses: await addressesOf(user.id) }
      }
      if (action.type === 'address.delete') {
        const result = await q('DELETE FROM addresses WHERE id = ? AND user_id = ?', [action.id, user.id])
        if (!result.affectedRows) fail(404, 'No encontramos esa dirección.')
        return { addresses: await addressesOf(user.id) }
      }
      if (action.type === 'order.cancel') {
        const connection = await pool.getConnection()
        try {
          await connection.beginTransaction()
          const [orders] = await connection.query('SELECT * FROM orders WHERE id = ? AND customer_id = ? FOR UPDATE', [action.orderId, user.id])
          if (!orders[0]) fail(404, 'No encontramos ese pedido.')
          if (orders[0].status !== 'pendiente') fail(409, 'Solo puedes cancelar un pedido pendiente.')
          await restoreMysql(connection, orders[0], user.id, 'Cancelado por el cliente')
          await connection.commit()
        } catch (error) {
          await connection.rollback()
          throw error
        } finally {
          connection.release()
        }
        const products = await q('SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id')
        return { order: await loadOrder(action.orderId), products: products.map(productView) }
      }
      if (['order.status', 'order.payment', 'order.assign', 'product.save', 'stock', 'user.active', 'message.status'].includes(action.type)) {
        return mysqlStaffAction(pool, user, action, { loadOrder, productView, summary, q })
      }
      fail(400, 'No reconozco esa acción.')
    },
  }
}

function mapMessage(row) {
  return {
    id: row.id, userId: row.user_id, name: row.name, email: row.email, phone: row.phone,
    message: row.message, status: row.status, createdAt: row.created_at,
  }
}

async function restoreMysql(connection, order, userId, comment) {
  const [items] = await connection.query('SELECT * FROM order_items WHERE order_id = ?', [order.id])
  for (const item of items) {
    await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id])
    await connection.query(
      'INSERT INTO stock_movements (product_id, user_id, order_id, type, quantity, reason) VALUES (?,?,?,?,?,?)',
      [item.product_id, userId, order.id, 'devolucion', item.quantity, comment],
    )
  }
  await connection.query('UPDATE orders SET status = "cancelado" WHERE id = ?', [order.id])
  await connection.query(
    'INSERT INTO order_status_history (order_id, status, changed_by, comment) VALUES (?,?,?,?)',
    [order.id, 'cancelado', userId, comment],
  )
}

async function mysqlStaffAction(pool, user, action, helpers) {
  const staff = ['administrador', 'panadero']
  if (action.type === 'order.status') {
    if (!['administrador', 'panadero', 'repartidor'].includes(user.role)) fail(403, 'No tienes permiso para cambiar el estado.')
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [orders] = await connection.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [action.orderId])
      const order = orders[0]
      if (!order) fail(404, 'No encontramos ese pedido.')
      if (user.role === 'repartidor' && order.delivery_user_id !== user.id) fail(403, 'Esta entrega no está en tu ruta.')
      if (user.role === 'repartidor' && !['en_camino', 'entregado', 'cancelado'].includes(action.status)) {
        fail(403, 'Puedes marcar la entrega como en camino, entregada o fallida.')
      }
      if (action.status === 'cancelado' && user.role === 'repartidor' && !action.comment) fail(400, 'Si la entrega falla, escribe qué pasó.')
      if (!TRANSITIONS[order.status]?.includes(action.status)) fail(409, `No se puede pasar de ${order.status} a ${action.status}.`)
      if (action.status === 'en_camino' && order.delivery_type !== 'domicilio') fail(409, 'Un pedido para recoger no sale a domicilio.')
      if (action.status === 'cancelado') await restoreMysql(connection, order, user.id, action.comment || 'Cancelado por la panadería')
      else {
        await connection.query('UPDATE orders SET status = ? WHERE id = ?', [action.status, order.id])
        await connection.query(
          'INSERT INTO order_status_history (order_id, status, changed_by, comment) VALUES (?,?,?,?)',
          [order.id, action.status, user.id, action.comment || ''],
        )
      }
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
    return { order: await helpers.loadOrder(action.orderId), summary: await helpers.summary(), products: (await helpers.q('SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id')).map(helpers.productView) }
  }
  if (action.type === 'order.payment') {
    if (!staff.includes(user.role)) fail(403, 'Solo la panadería confirma pagos.')
    if (!['pendiente', 'pagado'].includes(action.paymentStatus)) fail(400, 'El pago queda pendiente o pagado.')
    const result = await helpers.q('UPDATE orders SET payment_status = ? WHERE id = ?', [action.paymentStatus, action.orderId])
    if (!result.affectedRows) fail(404, 'No encontramos ese pedido.')
    return { order: await helpers.loadOrder(action.orderId) }
  }
  if (action.type === 'order.assign') {
    if (!staff.includes(user.role)) fail(403, 'Solo la panadería asigna repartidores.')
    const orders = await helpers.q('SELECT * FROM orders WHERE id = ?', [action.orderId])
    if (!orders[0]) fail(404, 'No encontramos ese pedido.')
    if (orders[0].delivery_type !== 'domicilio') fail(409, 'La recogida en panadería no lleva repartidor.')
    const couriers = await helpers.q('SELECT id, name FROM users WHERE id = ? AND role_id = 3 AND is_active = 1', [action.deliveryUserId])
    if (!couriers[0]) fail(400, 'Elige un repartidor activo.')
    await helpers.q('UPDATE orders SET delivery_user_id = ? WHERE id = ?', [couriers[0].id, action.orderId])
    await helpers.q(
      'INSERT INTO order_status_history (order_id, status, changed_by, comment) VALUES (?,?,?,?)',
      [action.orderId, orders[0].status, user.id, `Repartidor asignado: ${couriers[0].name}`],
    )
    return { order: await helpers.loadOrder(action.orderId) }
  }
  if (action.type === 'product.save') {
    if (!staff.includes(user.role)) fail(403, 'No puedes editar el catálogo.')
    if (action.price < 0 || action.stock < 0) fail(400, 'El precio y el stock no pueden ser negativos.')
    const categories = await helpers.q('SELECT id FROM categories WHERE id = ? AND is_active = 1', [action.categoryId])
    if (!categories[0]) fail(400, 'Elige una categoría válida.')
    if (action.id) {
      const current = await helpers.q('SELECT stock FROM products WHERE id = ?', [action.id])
      if (!current[0]) fail(404, 'No encontramos ese producto.')
      await helpers.q(
        'UPDATE products SET category_id=?, name=?, description=?, price=?, stock=?, min_stock=?, image_url=?, badge=?, is_active=? WHERE id=?',
        [action.categoryId, action.name, action.description || '', action.price, action.stock, action.minStock ?? 5, action.imageUrl || '', action.badge || '', action.isActive === false ? 0 : 1, action.id],
      )
      if (Number(current[0].stock) !== Number(action.stock)) {
        await helpers.q(
          'INSERT INTO stock_movements (product_id, user_id, type, quantity, reason) VALUES (?,?,?,?,?)',
          [action.id, user.id, 'ajuste', Number(action.stock) - Number(current[0].stock), action.reason || 'Ajuste de inventario'],
        )
      }
    } else {
      const created = await helpers.q(
        'INSERT INTO products (category_id, name, description, price, stock, min_stock, image_url, badge, is_active) VALUES (?,?,?,?,?,?,?,?,1)',
        [action.categoryId, action.name, action.description || '', action.price, action.stock, action.minStock ?? 5, action.imageUrl || '', action.badge || ''],
      )
      action.id = created.insertId
    }
    const rows = await helpers.q('SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?', [action.id])
    return { product: helpers.productView(rows[0]), summary: await helpers.summary() }
  }
  if (action.type === 'stock') {
    if (!staff.includes(user.role)) fail(403, 'No puedes mover inventario.')
    const quantity = Number(action.quantity)
    if (!Number.isInteger(quantity) || quantity === 0) fail(400, 'Indica una cantidad distinta de cero.')
    const rows = await helpers.q('SELECT stock FROM products WHERE id = ?', [action.productId])
    if (!rows[0]) fail(404, 'No encontramos ese producto.')
    if (Number(rows[0].stock) + quantity < 0) fail(409, 'El stock no puede quedar negativo.')
    await helpers.q('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, action.productId])
    await helpers.q(
      'INSERT INTO stock_movements (product_id, user_id, type, quantity, reason) VALUES (?,?,?,?,?)',
      [action.productId, user.id, action.movementType || 'entrada', quantity, action.reason || 'Producción del día'],
    )
    const product = await helpers.q('SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?', [action.productId])
    return { product: helpers.productView(product[0]), summary: await helpers.summary() }
  }
  if (action.type === 'user.active') {
    if (user.role !== 'administrador') fail(403, 'Solo el administrador suspende cuentas.')
    if (action.userId === user.id) fail(409, 'No puedes suspender tu propia cuenta.')
    const result = await helpers.q('UPDATE users SET is_active = ? WHERE id = ?', [action.isActive ? 1 : 0, action.userId])
    if (!result.affectedRows) fail(404, 'No encontramos ese usuario.')
    const users = await helpers.q('SELECT * FROM users ORDER BY id')
    return {
      users: users.map((item) => ({
        id: item.id, name: item.name, email: item.email, phone: item.phone,
        role: roleName(item.role_id), isActive: Boolean(item.is_active),
      })),
    }
  }
  if (action.type === 'message.status') {
    if (!staff.includes(user.role)) fail(403, 'No puedes gestionar mensajes.')
    if (!['nuevo', 'leido', 'respondido'].includes(action.status)) fail(400, 'Estado de mensaje no válido.')
    const result = await helpers.q('UPDATE contact_messages SET status = ? WHERE id = ?', [action.status, action.id])
    if (!result.affectedRows) fail(404, 'No encontramos ese mensaje.')
    const messages = await helpers.q('SELECT * FROM contact_messages ORDER BY id DESC')
    return { messages: messages.map(mapMessage) }
  }
  fail(400, 'No reconozco esa acción.')
}

async function migrate(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS roles (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(150) NOT NULL
  ) ENGINE=InnoDB`)
  await conn.query(`CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id TINYINT UNSIGNED NOT NULL DEFAULT 4,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    accepted_terms_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
  ) ENGINE=InnoDB`)
  await conn.query(`CREATE TABLE IF NOT EXISTS addresses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    label VARCHAR(40) NOT NULL DEFAULT 'Casa',
    address_line VARCHAR(200) NOT NULL,
    neighborhood VARCHAR(100),
    city VARCHAR(80) NOT NULL DEFAULT 'Rionegro',
    reference VARCHAR(200),
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`)
  await conn.query(`CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE,
    description VARCHAR(200),
    is_active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB`)
  await conn.query(`CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id INT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 5,
    image_url VARCHAR(500),
    badge VARCHAR(60) NULL,
    rating DECIMAL(2,1) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_prod_cat FOREIGN KEY (category_id) REFERENCES categories(id)
  ) ENGINE=InnoDB`)
  await conn.query(`CREATE TABLE IF NOT EXISTS orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(24) NULL,
    customer_id INT UNSIGNED NOT NULL,
    delivery_user_id INT UNSIGNED NULL,
    delivery_type ENUM('domicilio','recoger') NOT NULL DEFAULT 'domicilio',
    delivery_address VARCHAR(255) NULL,
    contact_phone VARCHAR(20) NOT NULL,
    payment_method ENUM('efectivo','transferencia') NOT NULL DEFAULT 'efectivo',
    payment_status ENUM('pendiente','pagado') NOT NULL DEFAULT 'pendiente',
    status ENUM('pendiente','confirmado','preparando','listo','en_camino','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
    subtotal DECIMAL(12,2) NOT NULL,
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    notes VARCHAR(255),
    scheduled_for DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ord_customer FOREIGN KEY (customer_id) REFERENCES users(id),
    CONSTRAINT fk_ord_delivery FOREIGN KEY (delivery_user_id) REFERENCES users(id)
  ) ENGINE=InnoDB`)
  await conn.query(`CREATE TABLE IF NOT EXISTS order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    product_name VARCHAR(120) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_prod FOREIGN KEY (product_id) REFERENCES products(id)
  ) ENGINE=InnoDB`)
  await conn.query(`CREATE TABLE IF NOT EXISTS order_status_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    status ENUM('pendiente','confirmado','preparando','listo','en_camino','entregado','cancelado') NOT NULL,
    changed_by INT UNSIGNED NOT NULL,
    comment VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hist_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_hist_user FOREIGN KEY (changed_by) REFERENCES users(id)
  ) ENGINE=InnoDB`)
  await conn.query(`CREATE TABLE IF NOT EXISTS stock_movements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    order_id INT UNSIGNED NULL,
    type ENUM('entrada','venta','ajuste','merma','devolucion') NOT NULL,
    quantity INT NOT NULL,
    reason VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mov_prod FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_mov_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_mov_order FOREIGN KEY (order_id) REFERENCES orders(id)
  ) ENGINE=InnoDB`)
  await conn.query(`CREATE TABLE IF NOT EXISTS reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    order_id INT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment VARCHAR(500),
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rev_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_rev_prod FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_rev_order FOREIGN KEY (order_id) REFERENCES orders(id)
  ) ENGINE=InnoDB`)
  await conn.query(`CREATE TABLE IF NOT EXISTS contact_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    message TEXT NOT NULL,
    status ENUM('nuevo','leido','respondido') NOT NULL DEFAULT 'nuevo',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_msg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`)
  await conn.query(`CREATE TABLE IF NOT EXISTS api_sessions (
    id VARCHAR(80) PRIMARY KEY,
    hits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`)
  await ensureColumn(conn, 'products', 'badge', 'ALTER TABLE products ADD COLUMN badge VARCHAR(60) NULL')
  await ensureColumn(conn, 'products', 'rating', 'ALTER TABLE products ADD COLUMN rating DECIMAL(2,1) NULL')
  await ensureColumn(conn, 'orders', 'code', 'ALTER TABLE orders ADD COLUMN code VARCHAR(24) NULL')
}

async function ensureColumn(conn, table, column, ddl) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  )
  if (Number(rows[0].n) === 0) await conn.query(ddl)
}

async function seedMysql(conn) {
  const fresh = buildFresh()
  for (const role of fresh.roles) {
    await conn.query('INSERT INTO roles (id, name, description) VALUES (?,?,?)', [role.id, role.name, role.description])
  }
  for (const user of fresh.users) {
    await conn.query(
      'INSERT INTO users (id, role_id, name, email, password_hash, phone, is_active, accepted_terms_at) VALUES (?,?,?,?,?,?,1,?)',
      [user.id, user.roleId, user.name, user.email, user.passwordHash, user.phone, user.acceptedTermsAt],
    )
  }
  for (const address of fresh.addresses) {
    await conn.query(
      'INSERT INTO addresses (id, user_id, label, address_line, neighborhood, city, reference, is_default) VALUES (?,?,?,?,?,?,?,?)',
      [address.id, address.userId, address.label, address.addressLine, address.neighborhood, address.city, address.reference, address.isDefault],
    )
  }
  for (const category of fresh.categories) {
    await conn.query('INSERT INTO categories (id, name, description, is_active) VALUES (?,?,?,1)', [category.id, category.name, category.description])
  }
  for (const product of fresh.products) {
    await conn.query(
      'INSERT INTO products (id, category_id, name, description, price, stock, min_stock, image_url, badge, rating, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [product.id, product.categoryId, product.name, product.description, product.price, product.stock, product.minStock, product.imageUrl, product.badge, product.rating, product.isActive],
    )
  }
  for (const order of fresh.orders) {
    await conn.query(
      `INSERT INTO orders (id, code, customer_id, delivery_user_id, delivery_type, delivery_address, contact_phone, payment_method, payment_status, status, subtotal, delivery_fee, total, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [order.id, order.code, order.customerId, order.deliveryUserId, order.deliveryType, order.deliveryAddress, order.contactPhone, order.paymentMethod, order.paymentStatus, order.status, order.subtotal, order.deliveryFee, order.total, order.notes, order.createdAt.slice(0, 19).replace('T', ' ')],
    )
  }
  for (const item of fresh.items) {
    await conn.query(
      'INSERT INTO order_items (id, order_id, product_id, product_name, unit_price, quantity) VALUES (?,?,?,?,?,?)',
      [item.id, item.orderId, item.productId, item.productName, item.unitPrice, item.quantity],
    )
  }
  for (const row of fresh.history) {
    await conn.query(
      'INSERT INTO order_status_history (id, order_id, status, changed_by, comment, created_at) VALUES (?,?,?,?,?,?)',
      [row.id, row.orderId, row.status, row.changedBy, row.comment, row.createdAt.slice(0, 19).replace('T', ' ')],
    )
  }
  for (const row of fresh.movements) {
    await conn.query(
      'INSERT INTO stock_movements (id, product_id, user_id, order_id, type, quantity, reason, created_at) VALUES (?,?,?,?,?,?,?,?)',
      [row.id, row.productId, row.userId, row.orderId, row.type, row.quantity, row.reason, row.createdAt.slice(0, 19).replace('T', ' ')],
    )
  }
  for (const row of fresh.reviews) {
    await conn.query(
      'INSERT INTO reviews (id, user_id, product_id, order_id, rating, comment, is_visible, created_at) VALUES (?,?,?,?,?,?,?,?)',
      [row.id, row.userId, row.productId, row.orderId, row.rating, row.comment, row.isVisible, row.createdAt.slice(0, 19).replace('T', ' ')],
    )
  }
}
