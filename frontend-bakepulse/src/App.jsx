import { useEffect, useMemo, useState } from 'react'
import PWABadge from './PWABadge.jsx'
import './App.css'

const CATEGORIES = ['Todos', 'Hogar', 'Tecnología', 'Ropa', 'Deportes', 'Otros']
const SEED = [
  { id: 1, name: 'Licuadora Oster 600W', price: 120000, category: 'Hogar', desc: 'Poco uso, vaso de vidrio, funciona perfecto.', phone: '', image: '', mine: false },
  { id: 2, name: 'Audífonos inalámbricos', price: 85000, category: 'Tecnología', desc: 'Batería de 20 horas, con estuche de carga.', phone: '', image: '', mine: false },
  { id: 3, name: 'Bicicleta de ruta talla M', price: 650000, category: 'Deportes', desc: '21 velocidades, recién ajustada.', phone: '', image: '', mine: false },
]
const money = (n) => '$' + Number(n).toLocaleString('es-CO')
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }

function resize(file, cb) {
  const r = new FileReader()
  r.onload = () => {
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, 600 / img.width)
      const c = document.createElement('canvas')
      c.width = img.width * s; c.height = img.height * s
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      cb(c.toDataURL('image/jpeg', 0.7))
    }
    img.src = r.result
  }
  r.readAsDataURL(file)
}

export default function App() {
  const [products, setProducts] = useState(() => load('bp-products', SEED))
  const [cart, setCart] = useState(() => load('bp-cart', []))
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Todos')
  const [view, setView] = useState('shop')
  const [form, setForm] = useState({ name: '', price: '', category: 'Hogar', desc: '', phone: '', image: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => { try { localStorage.setItem('bp-products', JSON.stringify(products)) } catch { setMsg('No hay espacio para guardar más fotos.') } }, [products])
  useEffect(() => { localStorage.setItem('bp-cart', JSON.stringify(cart)) }, [cart])

  const shown = useMemo(() => products.filter(p =>
    (cat === 'Todos' || p.category === cat) &&
    (p.name + p.desc).toLowerCase().includes(q.toLowerCase())), [products, q, cat])
  const inCart = products.filter(p => cart.includes(p.id))
  const total = inCart.reduce((s, p) => s + Number(p.price), 0)

  const toggleCart = (id) => setCart(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id])
  const remove = (id) => { setProducts(p => p.filter(x => x.id !== id)); setCart(c => c.filter(x => x !== id)) }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  function publish(e) {
    e.preventDefault()
    if (!form.name.trim() || !(Number(form.price) > 0)) { setMsg('Escribe el nombre y un precio mayor a 0.'); return }
    setProducts(p => [{ ...form, id: Date.now(), mine: true }, ...p])
    setForm({ name: '', price: '', category: 'Hogar', desc: '', phone: '', image: '' })
    setMsg('Producto publicado.'); setView('shop')
  }
  const wa = (p) => `https://wa.me/${p.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, me interesa: ' + p.name)}`

  return (
    <div className="app">
      <header className="top">
        <h1>Bakepulse</h1>
        <nav>
          <button className={view === 'shop' ? 'on' : ''} onClick={() => setView('shop')}>Productos</button>
          <button className={view === 'sell' ? 'on' : ''} onClick={() => setView('sell')}>Vender</button>
          <button className={view === 'cart' ? 'on' : ''} onClick={() => setView('cart')}>Carrito ({cart.length})</button>
        </nav>
      </header>

      {msg && <p className="msg" role="status" onClick={() => setMsg('')}>{msg}</p>}

      {view === 'shop' && (
        <main>
          <input className="search" placeholder="Buscar productos" value={q} onChange={e => setQ(e.target.value)} />
          <div className="chips">
            {CATEGORIES.map(c => <button key={c} className={c === cat ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}
          </div>
          {shown.length === 0 && <p className="empty">No hay productos con ese filtro. Prueba otra búsqueda o publica el tuyo.</p>}
          <div className="grid">
            {shown.map(p => (
              <article key={p.id} className="item">
                <div className="photo">{p.image ? <img src={p.image} alt={p.name} /> : <span>{p.name[0]}</span>}</div>
                <h2>{p.name}</h2>
                <p className="price">{money(p.price)}</p>
                <p className="desc">{p.desc}</p>
                <div className="row">
                  <button className="main" onClick={() => toggleCart(p.id)}>{cart.includes(p.id) ? 'Quitar del carrito' : 'Agregar al carrito'}</button>
                  {p.phone && <a href={wa(p)} target="_blank" rel="noreferrer">WhatsApp</a>}
                  {p.mine && <button className="ghost" onClick={() => remove(p.id)}>Eliminar</button>}
                </div>
              </article>
            ))}
          </div>
        </main>
      )}

      {view === 'sell' && (
        <main>
          <form className="form" onSubmit={publish}>
            <h2>Publica un producto</h2>
            <label>Nombre<input value={form.name} onChange={set('name')} /></label>
            <label>Precio (COP)<input type="number" min="0" value={form.price} onChange={set('price')} /></label>
            <label>Categoría<select value={form.category} onChange={set('category')}>{CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}</select></label>
            <label>Descripción<textarea rows="3" value={form.desc} onChange={set('desc')} /></label>
            <label>WhatsApp para contacto (con indicativo, ej. 573001234567)<input value={form.phone} onChange={set('phone')} /></label>
            <label>Foto<input type="file" accept="image/*" onChange={e => e.target.files[0] && resize(e.target.files[0], img => setForm(f => ({ ...f, image: img })))} /></label>
            {form.image && <img className="preview" src={form.image} alt="Vista previa" />}
            <button className="main" type="submit">Publicar producto</button>
          </form>
        </main>
      )}

      {view === 'cart' && (
        <main>
          <h2>Tu carrito</h2>
          {inCart.length === 0 ? <p className="empty">Aún no agregas productos. Ve a Productos y elige los que quieras.</p> : (
            <>
              <ul className="cart">
                {inCart.map(p => <li key={p.id}><span>{p.name}</span><b>{money(p.price)}</b><button className="ghost" onClick={() => toggleCart(p.id)}>Quitar</button></li>)}
              </ul>
              <p className="total">Total: {money(total)}</p>
              <button className="main" onClick={() => { setCart([]); setMsg('Pedido registrado. Contacta a cada vendedor para coordinar el pago y la entrega.'); setView('shop') }}>Confirmar pedido</button>
            </>
          )}
        </main>
      )}
      <PWABadge />
    </div>
  )
}
