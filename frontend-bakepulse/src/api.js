const SID = 'bp-sid'
const TOKEN = 'bp-token'
const CATALOG = 'bp-catalog'
const CART = 'bp-cart'
const BUDGET = 'bp-budget'
const ACCOUNT = 'bp-account'
const BOOTED = 'bp-booted'

export function sessionId() {
  let id = sessionStorage.getItem(SID)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SID, id)
  }
  return id
}

export function newSession() {
  sessionStorage.removeItem(SID)
  sessionStorage.removeItem(BUDGET)
  sessionStorage.removeItem(BOOTED)
  sessionStorage.removeItem(ACCOUNT)
  return sessionId()
}

export function wasBooted() {
  return sessionStorage.getItem(BOOTED) === '1'
}

export function markBooted() {
  sessionStorage.setItem(BOOTED, '1')
}

export function readBudget() {
  try { return JSON.parse(sessionStorage.getItem(BUDGET) || 'null') } catch { return null }
}

export function readToken() {
  return localStorage.getItem(TOKEN)
}

export function writeToken(value) {
  if (value) localStorage.setItem(TOKEN, value)
  else localStorage.removeItem(TOKEN)
}

export function readCart() {
  try { return JSON.parse(localStorage.getItem(CART) || '[]') } catch { return [] }
}

export function writeCart(cart) {
  localStorage.setItem(CART, JSON.stringify(cart))
}

export function readCatalog() {
  try { return JSON.parse(localStorage.getItem(CATALOG) || 'null') } catch { return null }
}

export function writeCatalog(catalog) {
  localStorage.setItem(CATALOG, JSON.stringify({ ...catalog, savedAt: new Date().toISOString() }))
}

export function readAccount() {
  try { return JSON.parse(sessionStorage.getItem(ACCOUNT) || 'null') } catch { return null }
}

export function writeAccount(account) {
  if (account) sessionStorage.setItem(ACCOUNT, JSON.stringify(account))
  else sessionStorage.removeItem(ACCOUNT)
}

export function cop(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString('es-CO')}`
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-session-id': sessionId(),
  }
  const auth = readToken()
  if (auth) headers.Authorization = `Bearer ${auth}`
  const response = await fetch(`/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (data.budget) sessionStorage.setItem(BUDGET, JSON.stringify(data.budget))
  if (!response.ok) {
    const error = new Error(data.error || 'No pudimos completar la petición.')
    error.status = response.status
    error.budget = data.budget
    throw error
  }
  return data
}
