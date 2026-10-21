/** Catálogo y cuentas iniciales. Las contraseñas se hashean al crear el almacén. */
export const DEMO_PASSWORDS = {
  'admin@bakepulse.com': 'Admin12345',
  'panadero@bakepulse.com': 'Panadero1234',
  'repartidor@bakepulse.com': 'Reparto1234',
  'mariana.gomez@correo.com': 'Cliente1234',
}

export const ROLES = [
  { id: 1, name: 'administrador', description: 'Dueño: catálogo, usuarios, pedidos y reportes' },
  { id: 2, name: 'panadero', description: 'Cocina y mostrador: pedidos, inventario y pagos' },
  { id: 3, name: 'repartidor', description: 'Entregas a domicilio asignadas' },
  { id: 4, name: 'cliente', description: 'Compra, sigue pedidos y guarda direcciones' },
]

export const CATEGORIES = [
  { id: 1, name: 'Panes', description: 'Pan artesanal y de masa madre' },
  { id: 2, name: 'Hojaldres', description: 'Hojaldres de mantequilla' },
  { id: 3, name: 'Dulces', description: 'Rollos, galletas y antojos' },
  { id: 4, name: 'Tortas', description: 'Porciones y tortas de la casa' },
]

export const PRODUCTS = [
  {
    id: 1, categoryId: 2, name: 'Croissant de mantequilla',
    description: 'Capas doradas, mantequilla real y un centro suave.',
    price: 8500, stock: 12, minStock: 4, imageUrl: '/images/croissant.png',
    badge: 'El favorito', rating: 4.9, isActive: 1,
  },
  {
    id: 2, categoryId: 1, name: 'Pan de masa madre',
    description: 'Fermentación lenta de 24 horas. Corteza crujiente.',
    price: 18000, stock: 8, minStock: 3, imageUrl: '/images/masa-madre.png',
    badge: '24 h de fermentación', rating: null, isActive: 1,
  },
  {
    id: 3, categoryId: 3, name: 'Rollo de canela',
    description: 'Canela aromática y glaseado de queso crema.',
    price: 9000, stock: 6, minStock: 3, imageUrl: '/images/canela.png',
    badge: 'Recién horneado', rating: null, isActive: 1,
  },
  {
    id: 4, categoryId: 4, name: 'Torta de zanahoria',
    description: 'Porción generosa con nueces y crema de queso.',
    price: 12000, stock: 5, minStock: 2, imageUrl: '/images/zanahoria.png',
    badge: 'Por porción', rating: null, isActive: 1,
  },
  {
    id: 5, categoryId: 3, name: 'Galleta de chocolate',
    description: 'Bordes crocantes, centro suave y chocolate al 70%.',
    price: 6500, stock: 16, minStock: 6, imageUrl: '/images/galleta.png',
    badge: 'Chocolate 70%', rating: null, isActive: 1,
  },
  {
    id: 6, categoryId: 1, name: 'Pan brioche',
    description: 'Miga tierna y un delicado toque de mantequilla.',
    price: 15000, stock: 0, minStock: 2, imageUrl: '/images/brioche.png',
    badge: 'Vuelve mañana', rating: null, isActive: 1,
  },
]

export const USERS = [
  { id: 1, roleId: 1, name: 'Ana Restrepo', email: 'admin@bakepulse.com', phone: '3100000001', password: DEMO_PASSWORDS['admin@bakepulse.com'] },
  { id: 2, roleId: 2, name: 'Luis Herrera', email: 'panadero@bakepulse.com', phone: '3100000002', password: DEMO_PASSWORDS['panadero@bakepulse.com'] },
  { id: 3, roleId: 3, name: 'Camilo Ríos', email: 'repartidor@bakepulse.com', phone: '3100000003', password: DEMO_PASSWORDS['repartidor@bakepulse.com'] },
  { id: 4, roleId: 4, name: 'Mariana Gómez', email: 'mariana.gomez@correo.com', phone: '3104567890', password: DEMO_PASSWORDS['mariana.gomez@correo.com'] },
]

export const SHOP = {
  name: 'Bakepulse',
  slogan: 'Cada creación, un impulso de felicidad',
  city: 'Rionegro, Antioquia',
  hours: 'Lun–sáb · 7:00 a. m.–7:00 p. m.',
  deliveryFee: 5000,
  heroImage: '/images/hero.png',
  heroNote: 'Tiempo, mantequilla y mucho oficio.',
  address: 'Centro, Rionegro, Antioquia',
}

export const DELIVERY_FEE = 5000
export const REQUEST_LIMIT = Number(process.env.SESSION_REQUEST_LIMIT || 5)
