import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { initStore } from './store.js'

const SECRET = process.env.JWT_SECRET || 'bakepulse-dev-cambia-este-secreto'
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173,https://bakepulsee.vercel.app,https://bakepulsee-kappa.vercel.app')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

function originAllowed(origin) {
  if (!origin || origins.includes(origin)) return true
  try {
    const url = new URL(origin)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true
    return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app') && url.hostname.includes('bakepulsee')
  } catch {
    return false
  }
}

let ready

function db() {
  if (!ready) ready = initStore()
  return ready
}

function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    SECRET,
    { expiresIn: '12h' },
  )
}

function send(res, status, body, budget) {
  res.status(status).json(budget ? { ...body, budget } : body)
}

const registerSchema = z.object({
  name: z.string().trim().min(3).max(100),
  email: z.string().trim().email().max(150),
  phone: z.string().trim().min(7).max(20),
  password: z.string().min(8).max(72),
  acceptedTerms: z.literal(true),
})

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive().max(50),
  })).min(1).max(20),
  deliveryType: z.enum(['domicilio', 'recoger']),
  paymentMethod: z.enum(['efectivo', 'transferencia']),
  contactPhone: z.string().trim().min(7).max(20),
  addressId: z.number().int().positive().optional(),
  address: z.object({
    label: z.string().trim().max(40).optional(),
    addressLine: z.string().trim().min(5).max(200),
    neighborhood: z.string().trim().max(100).optional(),
    city: z.string().trim().max(80).optional(),
    reference: z.string().trim().max(200).optional(),
    save: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  }).optional(),
  notes: z.string().trim().max(255).optional(),
  scheduledFor: z.string().max(40).nullable().optional(),
})

const actionSchema = z.object({
  type: z.enum([
    'contact', 'address.save', 'address.delete', 'order.cancel', 'order.status',
    'order.payment', 'order.assign', 'product.save', 'stock', 'user.active', 'message.status',
  ]),
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(150).optional(),
  phone: z.string().trim().max(20).optional(),
  message: z.string().trim().min(8).max(1000).optional(),
  id: z.number().int().positive().optional(),
  label: z.string().trim().max(40).optional(),
  addressLine: z.string().trim().min(5).max(200).optional(),
  neighborhood: z.string().trim().max(100).optional(),
  city: z.string().trim().max(80).optional(),
  reference: z.string().trim().max(200).optional(),
  isDefault: z.boolean().optional(),
  orderId: z.number().int().positive().optional(),
  status: z.string().trim().max(20).optional(),
  comment: z.string().trim().max(255).optional(),
  paymentStatus: z.enum(['pendiente', 'pagado']).optional(),
  deliveryUserId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  badge: z.string().trim().max(60).optional(),
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().optional(),
  productId: z.number().int().positive().optional(),
  quantity: z.number().int().optional(),
  movementType: z.enum(['entrada', 'ajuste', 'merma']).optional(),
  reason: z.string().trim().max(200).optional(),
  userId: z.number().int().positive().optional(),
}).superRefine((value, ctx) => {
  if (value.type === 'contact' && (!value.name || !value.email || !value.message)) {
    ctx.addIssue({ code: 'custom', message: 'El mensaje necesita nombre, correo y texto.' })
  }
  if (value.type === 'address.save' && !value.addressLine) {
    ctx.addIssue({ code: 'custom', message: 'Escribe la dirección.' })
  }
  if ((value.type === 'order.cancel' || value.type === 'order.status' || value.type === 'order.payment' || value.type === 'order.assign') && !value.orderId) {
    ctx.addIssue({ code: 'custom', message: 'Falta el pedido.' })
  }
  if (value.type === 'product.save' && (value.categoryId == null || value.price == null || value.stock == null || !value.name)) {
    ctx.addIssue({ code: 'custom', message: 'El producto necesita nombre, categoría, precio y stock.' })
  }
})

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({
    origin(origin, callback) {
      callback(null, originAllowed(origin))
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  }))
  app.use(express.json({ limit: '32kb' }))

  app.get('/api/v1/health', async (_req, res) => {
    const store = await db()
    res.json({ ok: true, storage: store.mode, limit: 5 })
  })

  const v1 = express.Router()
  v1.use(async (req, res, next) => {
    const sessionId = String(req.get('x-session-id') || '')
    if (!/^[\w-]{8,80}$/.test(sessionId)) {
      return res.status(400).json({ error: 'Falta la sesión del navegador. Recarga la página.' })
    }
    try {
      const store = await db()
      const budget = await store.consume(sessionId)
      res.set('X-Requests-Limit', String(budget.limit))
      res.set('X-Requests-Remaining', String(budget.remaining))
      if (!budget.allowed) {
        return res.status(429).json({
          error: 'Alcanzaste el máximo de 5 peticiones de esta sesión. Pulsa «Nueva sesión» para continuar.',
          budget,
        })
      }
      req.budget = budget
      req.store = store
      next()
    } catch (error) {
      next(error)
    }
  })

  function readUser(req) {
    const header = req.get('authorization') || ''
    if (!header.startsWith('Bearer ')) return null
    try {
      return jwt.verify(header.slice(7), SECRET)
    } catch {
      return null
    }
  }

  function requireUser(req, res) {
    const user = readUser(req)
    if (!user) {
      send(res, 401, { error: 'Inicia sesión para continuar.' }, req.budget)
      return null
    }
    return user
  }

  v1.get('/bootstrap', async (req, res, next) => {
    try {
      const catalog = await req.store.catalog()
      const authUser = readUser(req)
      const account = authUser ? await req.store.accountFor(authUser) : null
      send(res, 200, { ...catalog, account, storage: req.store.mode }, req.budget)
    } catch (error) {
      next(error)
    }
  })

  v1.post('/auth', async (req, res, next) => {
    try {
      const action = req.body?.action
      if (action === 'register') {
        const parsed = registerSchema.safeParse(req.body)
        if (!parsed.success) {
          return send(res, 400, { error: 'Revisa el nombre, el correo, el celular, una contraseña de 8 caracteres y la autorización de datos.' }, req.budget)
        }
        const user = await req.store.createUser(parsed.data)
        const account = await req.store.accountFor(user)
        return send(res, 201, { token: sign(user), account }, req.budget)
      }
      if (action === 'login') {
        const parsed = loginSchema.safeParse(req.body)
        if (!parsed.success) return send(res, 400, { error: 'Escribe el correo y la contraseña.' }, req.budget)
        const found = await req.store.userByEmail(parsed.data.email)
        if (!found || !bcrypt.compareSync(parsed.data.password, found.passwordHash)) {
          return send(res, 401, { error: 'Correo o contraseña incorrectos.' }, req.budget)
        }
        if (!found.isActive) return send(res, 403, { error: 'Esta cuenta está suspendida.' }, req.budget)
        const roles = { 1: 'administrador', 2: 'panadero', 3: 'repartidor', 4: 'cliente' }
        const user = {
          id: found.id,
          name: found.name,
          email: found.email,
          phone: found.phone,
          role: roles[found.roleId] || 'cliente',
        }
        const account = await req.store.accountFor(user)
        return send(res, 200, { token: sign(account.user), account }, req.budget)
      }
      return send(res, 400, { error: 'Indica si quieres ingresar o crear la cuenta.' }, req.budget)
    } catch (error) {
      next(error)
    }
  })

  v1.post('/orders', async (req, res, next) => {
    try {
      const user = requireUser(req, res)
      if (!user) return
      const parsed = orderSchema.safeParse(req.body)
      if (!parsed.success) {
        return send(res, 400, { error: 'Revisa los productos, el teléfono y la forma de entrega.' }, req.budget)
      }
      const result = await req.store.createOrder(user, parsed.data)
      const account = await req.store.accountFor(user)
      send(res, 201, { ...result, account }, req.budget)
    } catch (error) {
      next(error)
    }
  })

  v1.post('/actions', async (req, res, next) => {
    try {
      const parsed = actionSchema.safeParse(req.body)
      if (!parsed.success) {
        const issue = parsed.error.issues[0]?.message
        return send(res, 400, { error: issue || 'Revisa los datos enviados.' }, req.budget)
      }
      const publicActions = new Set(['contact'])
      const user = readUser(req)
      if (!publicActions.has(parsed.data.type) && !user) {
        return send(res, 401, { error: 'Inicia sesión para continuar.' }, req.budget)
      }
      const result = await req.store.applyAction(user, parsed.data)
      const account = user ? await req.store.accountFor(user) : null
      send(res, 200, { ...result, account }, req.budget)
    } catch (error) {
      next(error)
    }
  })

  app.use('/api/v1', v1)

  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'bakepulse-api', health: '/api/v1/health' })
  })

  app.use((error, req, res, _next) => {
    const status = error.status || 500
    if (status === 500) console.error(error)
    send(res, status, { error: status === 500 ? 'No pudimos completar la petición. Intenta de nuevo.' : error.message }, req.budget)
  })

  return app
}

export default createApp()
