import { useEffect, useMemo, useRef, useState } from 'react'
import PWABadge from './PWABadge.jsx'
import {
  api, cop, markBooted, newSession, readAccount, readBudget, readCart, readCatalog,
  readToken, wasBooted, writeAccount, writeCart, writeCatalog, writeToken,
} from './api.js'
import { Button, Choice, Field, Icon, Logo, Pill, inputClass } from './ui.jsx'

const STATUS = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  preparando: 'En preparación',
  listo: 'Listo',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}
const NEXT = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['preparando', 'cancelado'],
  preparando: ['listo', 'cancelado'],
  listo: ['en_camino', 'entregado', 'cancelado'],
  en_camino: ['entregado', 'cancelado'],
}
const DEMOS = [
  ['Cliente', 'mariana.gomez@correo.com', 'Cliente1234'],
  ['Panadero', 'panadero@bakepulse.com', 'Panadero1234'],
  ['Repartidor', 'repartidor@bakepulse.com', 'Reparto1234'],
  ['Administrador', 'admin@bakepulse.com', 'Admin12345'],
]

function routeOf() {
  const raw = (window.location.hash || '#/').replace(/^#/, '')
  const [path, id] = raw.split('/').filter(Boolean)
  if (!path) return { name: 'home' }
  if (path === 'producto') return { name: 'product', id: Number(id) }
  return { name: path }
}

export default function App() {
  const cached = readCatalog()
  const [route, setRoute] = useState(routeOf)
  const [catalog, setCatalog] = useState(cached)
  const [account, setAccount] = useState(readAccount)
  const [cart, setCart] = useState(readCart)
  const [budget, setBudget] = useState(readBudget)
  const [notice, setNotice] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  const [install, setInstall] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todo')
  const [ready, setReady] = useState(Boolean(cached && wasBooted()))

  useEffect(() => { writeCart(cart) }, [cart])
  useEffect(() => {
    const sync = () => setRoute(routeOf())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  useEffect(() => {
    const prompt = (event) => { event.preventDefault(); setInstall(event) }
    window.addEventListener('beforeinstallprompt', prompt)
    return () => window.removeEventListener('beforeinstallprompt', prompt)
  }, [])
  useEffect(() => {
    if (wasBooted() && readCatalog()) return undefined
    if (!navigator.onLine) { setReady(true); return undefined }
    let ignore = false
    api('/bootstrap').then((data) => {
      if (ignore) return
      const next = { shop: data.shop, categories: data.categories, products: data.products, savedAt: new Date().toISOString() }
      writeCatalog(next)
      setCatalog(next)
      if (data.account) { setAccount(data.account); writeAccount(data.account) }
      if (data.budget) setBudget(data.budget)
      markBooted()
      setReady(true)
    }).catch((error) => {
      if (ignore) return
      setNotice(error.message)
      setBudget(error.budget || readBudget())
      setReady(true)
    })
    return () => { ignore = true }
  }, [])

  function applyRemote(data) {
    if (data.shop) {
      const next = { shop: data.shop, categories: data.categories, products: data.products, savedAt: new Date().toISOString() }
      if (data.products) {
        setCatalog((current) => {
          const merged = data.products.length ? next : current
          if (merged) writeCatalog(merged)
          return merged || current
        })
      }
    }
    const incoming = data.products || data.account?.board?.products
    if (incoming && !data.shop) {
      setCatalog((current) => {
        if (!current) return current
        const products = current.products.map((product) => incoming.find((item) => item.id === product.id) || product)
        const extra = incoming.filter((item) => !products.some((product) => product.id === item.id))
        const next = { ...current, products: [...products, ...extra] }
        writeCatalog(next)
        return next
      })
    }
    if (data.account) {
      setAccount(data.account)
      writeAccount(data.account)
    }
    if (data.budget) setBudget(data.budget)
    if (data.order && data.account) setAccount(data.account)
  }

  async function run(path, options) {
    setNotice('')
    try {
      const data = await api(path, options)
      applyRemote(data)
      return data
    } catch (error) {
      setBudget(error.budget || readBudget())
      setNotice(error.message)
      throw error
    }
  }

  function go(hash) {
    window.location.hash = hash
    window.scrollTo(0, 0)
  }

  function add(product, quantity = 1) {
    if (!product.available) return
    setCart((current) => {
      const found = current.find((item) => item.productId === product.id)
      const nextQty = (found?.quantity || 0) + quantity
      if (nextQty > product.stock) {
        setNotice(`Solo hay ${product.stock} de ${product.name}.`)
        return current
      }
      setNotice(`${product.name} está en el carrito.`)
      if (found) return current.map((item) => item.productId === product.id ? { ...item, quantity: nextQty } : item)
      return [...current, { productId: product.id, quantity }]
    })
  }

  function setQty(productId, quantity) {
    setCart((current) => current.flatMap((item) => {
      if (item.productId !== productId) return [item]
      if (quantity <= 0) return []
      const product = catalog?.products.find((row) => row.id === productId)
      return [{ ...item, quantity: Math.min(quantity, product?.stock || quantity) }]
    }))
  }

  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const shop = catalog?.shop
  const lines = useMemo(() => cart.map((item) => {
    const product = catalog?.products.find((row) => row.id === item.productId)
    return product ? { ...item, product, line: product.price * item.quantity } : null
  }).filter(Boolean), [cart, catalog])
  const subtotal = lines.reduce((sum, line) => sum + line.line, 0)
  const nav = [
    ['#/', 'home', 'Inicio'],
    ['#/carrito', 'bag', 'Carrito'],
    ['#/pedidos', 'receipt', 'Pedidos'],
    ['#/cuenta', 'user', 'Mi cuenta'],
  ]
  const activeNav = route.name === 'home' || route.name === 'product' ? 'home' : route.name === 'checkout' ? 'bag' : route.name

  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex h-[88px] max-w-6xl items-center justify-between gap-4 px-5 md:h-[100px] md:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm md:flex" aria-label="Secciones">
            {[['#/', 'Catálogo', 'home'], ['#/pedidos', 'Mis pedidos', 'pedidos'], ['#/contacto', 'Contacto', 'contacto']].map(([href, label, name]) => (
              <a key={name} href={href} className={activeNav === name || (name === 'home' && activeNav === 'home') ? 'font-semibold' : 'text-muted'}>{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="#/cuenta" className="hidden text-[13px] md:inline">{account ? account.user.name.split(' ')[0] : 'Ingresar'}</a>
            <a href="#/carrito" className="flex items-center gap-1.5 rounded-lg bg-mist p-2.5" aria-label={`Carrito, ${count} productos`}>
              <Icon name="bag" />
              <span className="text-xs font-semibold">{count}</span>
            </a>
          </div>
        </div>
      </header>

      {notice && (
        <button className="block w-full bg-butter px-5 py-3 text-left text-[13px]" onClick={() => setNotice('')}>{notice}</button>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 pb-28 md:px-8 md:pb-16">
        {!ready && <p className="text-muted">Calentando el horno…</p>}
        {ready && !catalog && <p>No hay catálogo guardado y no hay conexión. Ábrela cuando vuelva la red.</p>}
        {ready && catalog && route.name === 'home' && (
          <Home
            catalog={catalog} query={query} setQuery={setQuery} category={category} setCategory={setCategory}
            add={add} online={online} install={install} onInstall={async () => { await install.prompt(); setInstall(null) }}
            budget={budget} go={go}
          />
        )}
        {ready && catalog && route.name === 'product' && (
          <Product catalog={catalog} id={route.id} add={add} go={go} />
        )}
        {route.name === 'carrito' && (
          <Cart lines={lines} subtotal={subtotal} fee={shop?.deliveryFee || 5000} setQty={setQty} go={go} online={online} />
        )}
        {route.name === 'checkout' && (
          <Checkout lines={lines} subtotal={subtotal} shop={shop} account={account} online={online} go={go} run={run} setCart={setCart} />
        )}
        {route.name === 'pedidos' && <Orders account={account} go={go} run={run} />}
        {route.name === 'cuenta' && (
          <Account account={account} budget={budget} go={go} run={run} onAuth={(data) => { writeToken(data.token); applyRemote(data) }} onLeave={() => { writeToken(null); writeAccount(null); setAccount(null); go('#/') }} />
        )}
        {route.name === 'contacto' && <Contact account={account} run={run} />}
        {route.name === 'privacidad' && <Privacy />}
        {route.name === 'operacion' && <Staff account={account} catalog={catalog} run={run} />}
      </main>

      <footer className="bg-sand px-5 py-8 text-ink md:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          <div>
            <h2 className="font-serif text-[28px] leading-tight">Hablemos entre hornadas.</h2>
            <p className="mt-2 text-[13px]">Una sola panadería, hecha con cariño en Rionegro, Antioquia.</p>
          </div>
          <a href="#/contacto" className="self-end text-xs">Contacto · Enviar un mensaje</a>
          <div className="self-end text-xs">
            <p>{shop?.hours || 'Lun–sáb · 7:00 a. m.–7:00 p. m.'}</p>
            <p className="mt-2">Precios en pesos colombianos · COP</p>
            <p className="mt-2">Peticiones de esta sesión: {budget ? `${budget.used}/${budget.limit}` : '0/5'}</p>
            <button className="mt-2 underline" onClick={() => { newSession(); window.location.reload() }}>Nueva sesión</button>
          </div>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-between border-t border-line bg-white px-4 pb-5 pt-3 md:hidden" aria-label="Navegación principal">
        {nav.map(([href, icon, label]) => {
          const on = activeNav === label.toLowerCase() || (label === 'Inicio' && activeNav === 'home') || (label === 'Carrito' && activeNav === 'carrito') || (label === 'Pedidos' && activeNav === 'pedidos') || (label === 'Mi cuenta' && activeNav === 'cuenta')
          return (
            <a key={label} href={href} className="flex w-[76px] flex-col items-center gap-1 text-[10px]">
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${on ? 'bg-cyan' : ''}`}><Icon name={icon} /></span>
              <span className={on ? 'font-semibold' : ''}>{label}</span>
            </a>
          )
        })}
      </nav>
      <PWABadge />
    </div>
  )
}

function Home({ catalog, query, setQuery, category, setCategory, add, online, install, onInstall, budget, go }) {
  const categories = ['Todo', ...catalog.categories.map((item) => item.name)]
  const shown = catalog.products.filter((product) => {
    const byCat = category === 'Todo' || product.category === category
    const text = `${product.name} ${product.description}`.toLowerCase()
    return byCat && text.includes(query.toLowerCase())
  })
  return (
    <div className="flex flex-col gap-10">
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,520px)_1fr]">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide"><Icon name="pin" className="size-4" /> HECHO EN RIONEGRO, ANTIOQUIA</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.15] md:text-[64px]">Buenos días,<br />recién horneados.</h1>
          <p className="mt-4 max-w-xl text-muted">Pan de fermentación lenta, hojaldres dorados y pequeños antojos. De nuestro horno a tu mesa.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Pill tone="mist">Domicilio en Rionegro</Pill>
            <Pill>Recoge en panadería</Pill>
          </div>
          <p className="mt-4 text-xs text-muted">Horneamos hoy · Abierto hasta las 7:00 p. m.</p>
        </div>
        <div className="relative h-64 overflow-hidden rounded-3xl md:h-96">
          <img src={catalog.shop.heroImage} alt="Croissants recién horneados sobre la mesa de Bakepulse" className="h-full w-full object-cover" />
          <p className="absolute bottom-4 left-4 flex items-center gap-2 rounded-[10px] bg-white px-3.5 py-2.5 text-xs font-semibold"><Icon name="wheat" className="size-[18px]" /> {catalog.shop.heroNote}</p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="font-serif text-4xl">Del horno de hoy</h2>
          <p className="text-xs text-muted">{shown.length} productos</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex h-[46px] w-full items-center gap-2 rounded-lg border border-line bg-white px-3.5 md:w-[280px]">
            <Icon name="search" className="size-[18px] text-muted" />
            <span className="sr-only">Buscar productos</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="¿Qué se te antoja?" className="w-full bg-transparent text-[13px] outline-none" />
          </label>
          <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Categorías">
            {categories.map((name) => (
              <button key={name} onClick={() => setCategory(name)} className={`shrink-0 rounded-full px-4 py-3 text-xs ${category === name ? 'bg-cyan font-semibold' : 'border border-line bg-white'}`}>{name}</button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted">Buscar y filtrar ocurre en tu teléfono: no gasta peticiones. Llevas {budget ? `${budget.used} de ${budget.limit}` : '0 de 5'}.</p>
        {shown.length === 0 && <p className="mt-8 text-muted">No hay productos con ese filtro. Prueba otra búsqueda.</p>}
        <div className="mt-7 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((product) => <Card key={product.id} product={product} add={add} go={go} />)}
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl bg-sand p-6 md:grid-cols-3">
        {[['wheat', 'Hecho a mano', 'Ingredientes honestos y fermentación sin afán.'], ['bike', 'Cerca de ti', 'Domicilios en Rionegro o recogida sin costo.'], ['cash', 'Pagas al recibir', 'Efectivo o transferencia contra entrega.']].map(([icon, title, text]) => (
          <div key={title} className="flex gap-3">
            <Icon name={icon} className="size-6 shrink-0" />
            <div>
              <h3 className="text-[13px] font-semibold">{title}</h3>
              <p className="text-xs text-muted">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {install && (
        <section className="rounded-2xl">
          <h3 className="text-sm font-semibold">Lleva el horno en tu bolsillo.</h3>
          <p className="mt-1 text-xs text-muted">Instala Bakepulse y vuelve a tu carrito cuando quieras.</p>
          <Button tone="ghost" className="mt-3 w-full md:w-auto" onClick={onInstall}>Instalar Bakepulse</Button>
        </section>
      )}
      {!online && (
        <section className="rounded-2xl bg-sand p-4">
          <p className="text-xs font-semibold">Sin conexión · Catálogo guardado</p>
          <p className="mt-2 text-xs text-muted">Puedes explorar. Para confirmar un pedido necesitas conexión.</p>
        </section>
      )}
    </div>
  )
}

function Card({ product, add, go }) {
  const [added, setAdded] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  function onAdd() {
    add(product)
    setAdded(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setAdded(false), 1400)
  }

  return (
    <article className="flex flex-col gap-3.5">
      <button title={`Ver ${product.name}`} onClick={() => go(`#/producto/${product.id}`)} className="relative block w-full cursor-pointer text-left">
        <img src={product.imageUrl} alt={product.name} className="h-[220px] w-full rounded-2xl object-cover transition hover:brightness-95 md:h-[250px]" />
        {product.badge && <span className="absolute left-3 top-3"><Pill>{product.badge}</Pill></span>}
      </button>
      <div className="min-h-[88px]">
        <p className="text-[10px] uppercase text-muted">{product.category}{product.rating ? ` · ★ ${String(product.rating).replace('.', ',')}` : ''}</p>
        <h3 className="mt-1 font-serif text-[25px] leading-tight"><a href={`#/producto/${product.id}`}>{product.name}</a></h3>
        <p className="mt-1 text-[13px] text-muted">{product.description}</p>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[19px] font-semibold">{cop(product.price)}</p>
        <p className={`text-[11px] ${product.available ? 'text-leaf' : 'text-muted'}`}>{product.available ? `${product.stock} disponibles` : 'Agotado por hoy'}</p>
      </div>
      {product.available
        ? (
          <Button className="w-full" tone={added ? 'leaf' : 'cyan'} title={added ? 'Ya está en el carrito' : 'Agregar al carrito'} onClick={onAdd}>
            <Icon name={added ? 'check' : 'plus'} className="size-[18px]" /> {added ? 'Agregado' : 'Agregar'}
          </Button>
        )
        : <Button tone="stone" className="w-full" disabled>Agotado</Button>}
    </article>
  )
}

function Product({ catalog, id, add, go }) {
  const product = catalog.products.find((item) => item.id === id)
  const [qty, setQty] = useState(1)
  if (!product) return <p>Ese producto ya no está en el horno de hoy. <a className="underline" href="#/">Volver al catálogo</a></p>
  return (
    <article className="grid gap-8 lg:grid-cols-2">
      <img src={product.imageUrl} alt={product.name} className="h-[320px] w-full rounded-3xl object-cover md:h-[460px]" />
      <div>
        <button className="text-sm text-muted" onClick={() => go('#/')}>← Catálogo</button>
        <p className="mt-4 text-[11px] uppercase text-muted">{product.category}{product.rating ? ` · ★ ${String(product.rating).replace('.', ',')}` : ''}</p>
        <h1 className="mt-2 font-serif text-5xl leading-tight">{product.name}</h1>
        <p className="mt-4 text-muted">{product.description}</p>
        <p className="mt-6 text-3xl font-semibold">{cop(product.price)}</p>
        <p className={`mt-1 text-xs ${product.available ? 'text-leaf' : 'text-muted'}`}>{product.available ? `${product.stock} disponibles hoy` : 'Agotado por hoy'}</p>
        <div className="mt-6 flex items-center gap-3">
          <button className="size-12 rounded-lg border border-line" onClick={() => setQty((value) => Math.max(1, value - 1))} aria-label="Disminuir">−</button>
          <span className="w-8 text-center font-semibold">{qty}</span>
          <button className="size-12 rounded-lg border border-line" onClick={() => setQty((value) => Math.min(product.stock, value + 1))} aria-label="Aumentar">+</button>
        </div>
        <Button className="mt-6 w-full md:w-auto" disabled={!product.available} onClick={() => { add(product, qty); go('#/carrito') }}>Agregar {qty} al carrito</Button>
      </div>
    </article>
  )
}

function Cart({ lines, subtotal, fee, setQty, go, online }) {
  return (
    <section className="mx-auto max-w-xl">
      <h1 className="font-serif text-4xl">Tu carrito</h1>
      {lines.length === 0 && <p className="mt-4 text-muted">Aún no eliges nada. El horno sigue abierto en el catálogo.</p>}
      <ul className="mt-6 divide-y divide-line">
        {lines.map((line) => (
          <li key={line.productId} className="flex items-center gap-3 py-4">
            <img src={line.product.imageUrl} alt="" className="size-16 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{line.product.name}</p>
              <p className="text-sm text-muted">{cop(line.line)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Quitar uno" onClick={() => setQty(line.productId, line.quantity - 1)}>−</button>
              <span>{line.quantity}</span>
              <button aria-label="Sumar uno" onClick={() => setQty(line.productId, line.quantity + 1)}>+</button>
            </div>
          </li>
        ))}
      </ul>
      {lines.length > 0 && (
        <>
          <p className="mt-4 flex justify-between"><span className="text-muted">Subtotal</span><span>{cop(subtotal)}</span></p>
          <p className="mt-1 text-xs text-muted">El domicilio en Rionegro suma {cop(fee)}. Recoger no tiene costo.</p>
          <Button className="mt-6 w-full" disabled={!online} tone={online ? 'cyan' : 'stone'} onClick={() => go('#/checkout')}>
            {online ? `Confirmar pedido · ${cop(subtotal)}` : 'Confirmar pedido · Sin conexión'}
          </Button>
        </>
      )}
    </section>
  )
}

function Checkout({ lines, subtotal, shop, account, online, go, run, setCart }) {
  const feeBase = shop?.deliveryFee || 5000
  const [delivery, setDelivery] = useState('domicilio')
  const [pay, setPay] = useState('efectivo')
  const [when, setWhen] = useState('ahora')
  const [schedule, setSchedule] = useState('')
  const [addressId, setAddressId] = useState(account?.addresses?.find((item) => item.isDefault)?.id || account?.addresses?.[0]?.id || null)
  const [addressLine, setAddressLine] = useState('Calle 47 #50-24, apto. 201')
  const [neighborhood, setNeighborhood] = useState('Centro')
  const [reference, setReference] = useState('')
  const [phone, setPhone] = useState(account?.user.phone || '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const fee = delivery === 'domicilio' ? feeBase : 0
  const total = subtotal + fee
  if (!account) {
    return <section className="max-w-xl"><h1 className="font-serif text-4xl">Entra para confirmar</h1><p className="mt-3 text-muted">Tu carrito se queda guardado.</p><Button className="mt-6" onClick={() => go('#/cuenta')}>Ingresar o crear cuenta</Button></section>
  }
  if (lines.length === 0 && !done) return <p>El carrito está vacío. <a className="underline" href="#/">Ver el horno de hoy</a></p>
  if (done) {
    return (
      <section className="max-w-xl">
        <Pill tone="mist">PEDIDO RECIBIDO</Pill>
        <h1 className="mt-3 font-serif text-5xl leading-tight">Ya está en el horno.</h1>
        <p className="mt-3">Tu código es <strong>{done.code}</strong>. Total {cop(done.total)}.</p>
        <Button className="mt-6" onClick={() => go('#/pedidos')}>Ver el estado</Button>
      </section>
    )
  }
  async function confirm() {
    setBusy(true)
    try {
      const body = {
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        deliveryType: delivery,
        paymentMethod: pay,
        contactPhone: phone,
        scheduledFor: when === 'despues' && schedule ? `${schedule.length === 16 ? `${schedule}:00` : schedule}-05:00` : null,
      }
      if (delivery === 'domicilio') {
        if (addressId) body.addressId = addressId
        else body.address = { label: 'Casa', addressLine, neighborhood, city: 'Rionegro', reference, save: true, isDefault: true }
      }
      const data = await run('/orders', { method: 'POST', body })
      setCart([])
      setDone(data.order)
    } catch { /* el aviso vive en el encabezado */ } finally { setBusy(false) }
  }
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <Pill tone="mist">ÚLTIMO PASO</Pill>
        <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">Ya casi está<br />en tu mesa.</h1>
        <p className="mt-2 text-xs text-muted">Hola, {account.user.name.split(' ')[0]}. Revisa los datos antes de confirmar.</p>
      </div>
      <div className="flex flex-col gap-2.5">
        <h2 className="font-semibold">1. ¿Cómo lo quieres recibir?</h2>
        <Choice active={delivery === 'domicilio'} icon="bike" title="Domicilio" text={`En Rionegro · ${cop(feeBase)}`} onClick={() => setDelivery('domicilio')} />
        <Choice active={delivery === 'recoger'} icon="store" title="Recoger en panadería" text="Sin costo de envío · $0" onClick={() => setDelivery('recoger')} />
      </div>
      {delivery === 'domicilio' && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[13px] font-semibold">Dirección de entrega</h2>
          {account.addresses?.length > 0 && (
            <select className={inputClass} value={addressId || ''} onChange={(event) => setAddressId(Number(event.target.value))}>
              {account.addresses.map((address) => <option key={address.id} value={address.id}>{address.label} · {address.addressLine}</option>)}
              <option value="">Escribir otra</option>
            </select>
          )}
          {!addressId && (
            <>
              <Field label="Dirección"><input className={inputClass} value={addressLine} onChange={(event) => setAddressLine(event.target.value)} /></Field>
              <Field label="Barrio"><input className={inputClass} value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} /></Field>
            </>
          )}
          <Field label="Indicaciones para llegar (opcional)"><input className={inputClass} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Timbre, portería, color de la puerta" /></Field>
        </div>
      )}
      {delivery === 'recoger' && <p className="rounded-2xl bg-sand p-4 text-sm">Bakepulse · Centro, Rionegro. Te avisaremos cuando esté listo. Sin campo de dirección.</p>}
      <div className="flex flex-col gap-2.5">
        <h2 className="font-semibold">2. ¿Para cuándo?</h2>
        <Choice active={when === 'ahora'} icon="check" title="Hoy, lo antes posible" text="Estimado: 45–60 minutos" onClick={() => setWhen('ahora')} />
        <Field label="O programar para después"><input className={inputClass} type="datetime-local" value={schedule} onChange={(event) => { setSchedule(event.target.value); setWhen('despues') }} /></Field>
      </div>
      <div className="flex flex-col gap-2.5">
        <h2 className="font-semibold">3. Paga cuando recibas</h2>
        <Choice active={pay === 'efectivo'} icon="cash" title="Efectivo contra entrega" text="Entrega el dinero al repartidor" onClick={() => setPay('efectivo')} />
        <Choice active={pay === 'transferencia'} icon="bank" title="Transferencia contra entrega" text="La realizas al recibir, no desde la app" onClick={() => setPay('transferencia')} />
        <p className="text-[11px] text-muted">No pedimos tarjetas ni pagos anticipados.</p>
      </div>
      <Field label="Celular de contacto"><input className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
      <div className="rounded-2xl border border-line bg-white p-4">
        <h2 className="font-semibold">Tu pedido</h2>
        {lines.map((line) => <p key={line.productId} className="mt-2 text-xs">{line.quantity} × {line.product.name} · {cop(line.line)}</p>)}
        <div className="my-3 h-px bg-line" />
        <p className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span>{cop(subtotal)}</span></p>
        <p className="mt-2 flex justify-between text-sm"><span className="text-muted">{delivery === 'domicilio' ? 'Domicilio en Rionegro' : 'Recogida'}</span><span>{cop(fee)}</span></p>
        <p className="mt-3 flex items-center justify-between font-semibold"><span>Total COP</span><span className="text-2xl">{cop(total)}</span></p>
      </div>
      <Button className="w-full" disabled={!online || busy} onClick={confirm}><Icon name="check" className="size-[18px]" /> {busy ? 'Confirmando…' : `Confirmar pedido · ${cop(total)}`}</Button>
      <p className="text-center text-[11px] text-muted">Revalidamos precios y stock antes de crear el pedido. Si algo se agotó, te avisaremos sin confirmar la compra.</p>
    </section>
  )
}

function Orders({ account, go, run }) {
  const [busy, setBusy] = useState(false)
  if (!account) return <section><h1 className="font-serif text-4xl">Mis pedidos</h1><p className="mt-3 text-muted">Ingresa para ver el estado de cada horneada.</p><Button className="mt-6" onClick={() => go('#/cuenta')}>Ingresar</Button></section>
  const orders = account.role === undefined ? account.orders : account.orders
  return (
    <section className="flex flex-col gap-5">
      <h1 className="font-serif text-4xl">{account.user.role === 'cliente' ? 'Mis pedidos' : 'Pedidos'}</h1>
      {orders.length === 0 && <p className="text-muted">Todavía no hay pedidos en esta cuenta.</p>}
      {orders.map((order) => (
        <article key={order.id} className="rounded-2xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{order.code}</h2>
            <Pill tone="mist">{STATUS[order.status] || order.status}</Pill>
          </div>
          <p className="mt-2 text-sm text-muted">{order.deliveryType === 'domicilio' ? order.deliveryAddress : 'Recogida en panadería'} · {cop(order.total)}</p>
          <ul className="mt-3 text-xs">{order.items.map((item) => <li key={item.productId}>{item.quantity} × {item.productName}</li>)}</ul>
          <ol className="mt-4 space-y-2 border-l border-line pl-3 text-xs">
            {order.history.map((row, index) => <li key={`${row.status}-${index}`}><strong>{STATUS[row.status] || row.status}</strong> · {row.byName} {row.comment ? `· ${row.comment}` : ''}</li>)}
          </ol>
          {account.user.role === 'cliente' && order.status === 'pendiente' && (
            <Button tone="ghost" className="mt-4" disabled={busy} onClick={async () => { setBusy(true); try { await run('/actions', { method: 'POST', body: { type: 'order.cancel', orderId: order.id } }) } catch { /* aviso */ } setBusy(false) }}>Cancelar pedido</Button>
          )}
        </article>
      ))}
      {account.user.role !== 'cliente' && <Button tone="ghost" onClick={() => go('#/operacion')}>Ir a la operación</Button>}
    </section>
  )
}

function Account({ account, budget, go, run, onAuth, onLeave }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', acceptedTerms: false })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [address, setAddress] = useState({ label: 'Casa', addressLine: '', neighborhood: '', city: 'Rionegro', isDefault: true })
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const data = await run('/auth', {
        method: 'POST',
        body: mode === 'login'
          ? { action: 'login', email: form.email, password: form.password }
          : { action: 'register', ...form, acceptedTerms: form.acceptedTerms },
      })
      onAuth(data)
      go('#/')
    } catch { /* aviso */ } finally { setBusy(false) }
  }

  if (!account && !readToken()) {
    return (
      <section className="mx-auto flex max-w-xl flex-col gap-5">
        <Pill tone="mist">BIENVENIDO A NUESTRA MESA</Pill>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">{mode === 'login' ? 'Qué bueno verte de nuevo.' : <>El próximo antojo<br />empieza aquí.</>}</h1>
        <p className="text-[13px] text-muted">{mode === 'login' ? 'Ingresa para pedir y seguir cada horneada.' : 'Crea tu cuenta para pedir, guardar direcciones y seguir cada horneada.'}</p>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          {mode === 'register' && <Field label="Nombre completo"><input className={inputClass} value={form.name} onChange={set('name')} required /></Field>}
          <Field label="Correo electrónico"><input className={inputClass} type="email" value={form.email} onChange={set('email')} required /></Field>
          {mode === 'register' && <Field label="Celular" hint="Número de contacto para tus entregas en Colombia."><input className={inputClass} value={form.phone} onChange={set('phone')} required /></Field>}
          <Field label="Contraseña" hint={mode === 'register' ? 'Mínimo 8 caracteres.' : undefined}>
            <span className="flex items-center gap-2">
              <input className={inputClass} type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} required minLength={mode === 'register' ? 8 : 1} />
              <button type="button" className="shrink-0 text-xs underline" onClick={() => setShow((value) => !value)}>{show ? 'Ocultar' : 'Ver'}</button>
            </span>
          </Field>
          {mode === 'register' && (
            <div className="rounded-xl border border-line bg-white p-4 text-xs">
              <label className="flex gap-3">
                <input type="checkbox" checked={form.acceptedTerms} onChange={set('acceptedTerms')} className="mt-0.5 size-5 accent-cyan" />
                <span>Autorizo a Bakepulse a tratar mis datos personales para gestionar mi cuenta, pedidos y entregas. *</span>
              </label>
              <p className="mt-3 text-[11px] text-muted">Según la Ley 1581 de 2012. Puedes consultar, actualizar o solicitar la supresión de tus datos por el canal de contacto.</p>
              <a href="#/privacidad" className="mt-2 inline-block font-semibold">Leer aviso y política de privacidad</a>
            </div>
          )}
          <Button className="w-full" disabled={busy || (mode === 'register' && !form.acceptedTerms)}>{mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}</Button>
        </form>
        <button className="text-sm" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? '¿Aún no tienes cuenta? Crear una' : '¿Ya tienes cuenta? Ingresar'}</button>
        <div className="rounded-lg bg-sand p-3 text-[11px] text-muted">
          <p className="font-semibold text-ink">Cuentas de demostración</p>
          {DEMOS.map(([role, email, password]) => <p key={email} className="mt-1">{role}: {email} · {password}</p>)}
          <p className="mt-2">Esta sesión permite {budget?.limit || 5} peticiones. Llevas {budget?.used || 0}.</p>
        </div>
      </section>
    )
  }

  if (!account) return <p>Tu sesión está guardada, pero esta pestaña aún no cargó la cuenta. Pulsa Nueva sesión en el pie si el contador llegó a 5, o recarga cuando quede presupuesto.</p>

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="font-serif text-4xl">Hola, {account.user.name.split(' ')[0]}</h1>
      <p className="text-sm text-muted">{account.user.email} · {account.user.role}</p>
      <div>
        <h2 className="font-semibold">Direcciones</h2>
        <ul className="mt-3 space-y-2">
          {account.addresses.map((item) => (
            <li key={item.id} className="rounded-xl border border-line bg-white p-3 text-sm">
              <Pill>{item.label}{item.isDefault ? ' · Principal' : ''}</Pill>
              <p className="mt-2">{item.addressLine}</p>
              <p className="text-xs text-muted">{item.neighborhood} · {item.city}</p>
              <button className="mt-2 text-xs underline" onClick={() => run('/actions', { method: 'POST', body: { type: 'address.delete', id: item.id } })}>Eliminar</button>
            </li>
          ))}
        </ul>
        <form className="mt-4 flex flex-col gap-3" onSubmit={async (event) => {
          event.preventDefault()
          try {
            await run('/actions', { method: 'POST', body: { type: 'address.save', ...address } })
            setAddress({ label: 'Casa', addressLine: '', neighborhood: '', city: 'Rionegro', isDefault: false })
          } catch { /* aviso */ }
        }}>
          <Field label="Nueva dirección"><input className={inputClass} required value={address.addressLine} onChange={(event) => setAddress({ ...address, addressLine: event.target.value })} /></Field>
          <Field label="Barrio"><input className={inputClass} value={address.neighborhood} onChange={(event) => setAddress({ ...address, neighborhood: event.target.value })} /></Field>
          <Button className="w-full">Guardar dirección</Button>
        </form>
      </div>
      {account.user.role !== 'cliente' && <Button onClick={() => go('#/operacion')}>Abrir operación del día</Button>}
      <Button tone="ghost" onClick={onLeave}>Cerrar sesión</Button>
    </section>
  )
}

function Contact({ account, run }) {
  const [form, setForm] = useState({ name: account?.user.name || '', email: account?.user.email || '', phone: account?.user.phone || '', message: '' })
  const [sent, setSent] = useState('')
  return (
    <section className="mx-auto max-w-xl">
      <h1 className="font-serif text-4xl">Hablemos entre hornadas.</h1>
      <p className="mt-2 text-sm text-muted">Escríbenos y te respondemos en el horario de la panadería.</p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={async (event) => {
        event.preventDefault()
        try {
          const data = await run('/actions', { method: 'POST', body: { type: 'contact', ...form } })
          setSent(data.message)
        } catch { /* aviso */ }
      }}>
        <Field label="Nombre"><input className={inputClass} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="Correo"><input className={inputClass} type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Celular"><input className={inputClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        <Field label="Mensaje"><textarea className={`${inputClass} h-28 py-3`} required minLength={8} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></Field>
        <Button className="w-full">Enviar mensaje</Button>
        {sent && <p className="text-sm">{sent}</p>}
      </form>
    </section>
  )
}

function Privacy() {
  return (
    <section className="mx-auto max-w-2xl text-sm leading-6">
      <h1 className="font-serif text-4xl">Tratamiento de datos</h1>
      <p className="mt-4">Bakepulse, panadería en Rionegro, Antioquia, trata tu nombre, correo, celular y dirección solo para crear tu cuenta, preparar el pedido y entregarlo. La base es tu autorización, según la Ley 1581 de 2012.</p>
      <p className="mt-3">Puedes conocer, actualizar o pedir la supresión de tus datos por el formulario de contacto. No usamos esta autorización para publicidad. Las contraseñas se guardan cifradas y la sesión del servidor caduca a las 12 horas.</p>
      <p className="mt-3">Cada visita puede hacer como máximo 5 peticiones al servidor. El catálogo que ya viste queda guardado en el teléfono para consultarlo sin conexión.</p>
    </section>
  )
}

function Staff({ account, catalog, run }) {
  const [note, setNote] = useState('')
  const [draft, setDraft] = useState(null)
  if (!account || account.user.role === 'cliente') return <p>Esta área es de la panadería. Ingresa con una cuenta de operación.</p>
  const board = account.board || { orders: account.orders, messages: [], couriers: [], summary: null, products: catalog?.products || [] }
  async function act(body) {
    try { await run('/actions', { method: 'POST', body }) } catch { /* aviso */ }
  }
  return (
    <section className="flex flex-col gap-8">
      <div>
        <p className="text-[11px] font-semibold">OPERACIÓN · {account.user.role.toUpperCase()}</p>
        <h1 className="font-serif text-4xl">El día en la panadería</h1>
        {board.summary && <p className="mt-2 text-sm text-muted">Entregados hoy: {board.summary.todayOrders} · {cop(board.summary.todaySales)}. Cada cambio usa una petición.</p>}
      </div>
      <div className="grid gap-4">
        {(board.orders || []).filter((order) => order.status !== 'cancelado').map((order) => (
          <article key={order.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold">{order.code} · {order.customerName}</h2>
              <Pill tone="mist">{STATUS[order.status]}</Pill>
            </div>
            <p className="mt-1 text-xs text-muted">{order.contactPhone} · {order.deliveryType === 'domicilio' ? order.deliveryAddress : 'Recoge en tienda'} · {order.paymentMethod} · {order.paymentStatus} · {cop(order.total)}</p>
            <p className="mt-2 text-xs">{order.items.map((item) => `${item.quantity} ${item.productName}`).join(' · ')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(account.user.role === 'repartidor' ? ['en_camino', 'entregado', 'cancelado'] : NEXT[order.status] || []).map((status) => (
                <Button key={status} className="min-h-10" onClick={() => act({ type: 'order.status', orderId: order.id, status, comment: status === 'cancelado' ? (note || 'Entrega fallida') : '' })}>{STATUS[status]}</Button>
              ))}
              {account.user.role !== 'repartidor' && (
                <Button tone="ghost" className="min-h-10" onClick={() => act({ type: 'order.payment', orderId: order.id, paymentStatus: order.paymentStatus === 'pagado' ? 'pendiente' : 'pagado' })}>
                  {order.paymentStatus === 'pagado' ? 'Marcar pendiente' : 'Marcar pagado'}
                </Button>
              )}
            </div>
            {account.user.role !== 'repartidor' && order.deliveryType === 'domicilio' && (
              <label className="mt-3 block text-xs">Asignar repartidor
                <select className={`${inputClass} mt-1`} value={order.deliveryUserId || ''} onChange={(event) => act({ type: 'order.assign', orderId: order.id, deliveryUserId: Number(event.target.value) })}>
                  <option value="">Elegir</option>
                  {(board.couriers || []).map((courier) => <option key={courier.id} value={courier.id}>{courier.name}</option>)}
                </select>
              </label>
            )}
          </article>
        ))}
      </div>
      {account.user.role === 'repartidor' && <Field label="Si una entrega falla, escribe el motivo antes de cancelarla"><input className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} /></Field>}
      {account.user.role !== 'repartidor' && (
        <div>
          <h2 className="font-serif text-3xl">Inventario</h2>
          <ul className="mt-4 space-y-3">
            {(board.products || catalog?.products || []).map((product) => (
              <li key={product.id} className="rounded-xl bg-sand p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{product.name} · {cop(product.price)} · stock {product.stock}</span>
                  <span className="flex gap-2">
                    <Button tone="ghost" className="min-h-10" onClick={() => setDraft({ ...product })}>Editar</Button>
                    <Button className="min-h-10" onClick={() => act({ type: 'stock', productId: product.id, quantity: 5, movementType: 'entrada', reason: 'Producción del día' })}>+5 producción</Button>
                  </span>
                </div>
                {draft?.id === product.id && (
                  <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={(event) => {
                    event.preventDefault()
                    act({
                      type: 'product.save',
                      id: draft.id,
                      name: draft.name,
                      description: draft.description,
                      price: Number(draft.price),
                      stock: Number(draft.stock),
                      minStock: Number(draft.minStock ?? 5),
                      categoryId: Number(draft.categoryId),
                      imageUrl: draft.imageUrl,
                      badge: draft.badge || '',
                      isActive: Boolean(draft.isActive),
                    })
                    setDraft(null)
                  }}>
                    <input className={inputClass} aria-label="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                    <input className={inputClass} aria-label="Precio" type="number" min="0" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} />
                    <input className={inputClass} aria-label="Stock" type="number" min="0" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} />
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(draft.isActive)} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> Publicado</label>
                    <Button className="md:col-span-2">Guardar producto</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {board.summary?.lowStock?.length > 0 && <p className="mt-3 text-xs">Stock bajo: {board.summary.lowStock.map((item) => item.name).join(', ')}</p>}
        </div>
      )}
      {account.user.role === 'administrador' && (
        <div>
          <h2 className="font-serif text-3xl">Cuentas</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(board.users || []).map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3">
                <span>{user.name} · {user.role} · {user.isActive ? 'activa' : 'suspendida'}</span>
                {user.id !== account.user.id && <button className="underline" onClick={() => act({ type: 'user.active', userId: user.id, isActive: !user.isActive })}>{user.isActive ? 'Suspender' : 'Activar'}</button>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {account.user.role !== 'repartidor' && (
        <div>
          <h2 className="font-serif text-3xl">Mensajes</h2>
          {(board.messages || []).length === 0 && <p className="mt-2 text-sm text-muted">No hay mensajes nuevos.</p>}
          <ul className="mt-3 space-y-3">
            {(board.messages || []).map((message) => (
              <li key={message.id} className="rounded-xl border border-line p-3 text-sm">
                <p className="font-semibold">{message.name} · {message.status}</p>
                <p className="mt-1">{message.message}</p>
                <button className="mt-2 text-xs underline" onClick={() => act({ type: 'message.status', id: message.id, status: 'respondido' })}>Marcar respondido</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
