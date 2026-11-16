// Local flavour artwork keeps every variant visually distinct while the catalogue
// has no product_images rows linked to a variant_id. Real variant images from the
// API still take precedence in ProductDetailsPage.
const FLAVOR_ARTWORK = {
  'wotofo-puff': {
    'blue-razz-ice': '/flavors/wotofo-puff-blue-razz-ice.jpg',
    'watermelon-ice': '/flavors/wotofo-puff-watermelon-ice.jpg',
    'mixed-berry': '/flavors/wotofo-puff-mixed-berry.jpg',
    'mango-ice': '/flavors/wotofo-puff-mango-ice.jpg',
    'grape-ice': '/flavors/wotofo-puff-grape-ice.jpg',
  },
  'al-fakher-lemon-mint': {
    'lemon-mint': '/flavors/al-fakher-lemon-mint-lemon-mint.jpg',
  },
  'al-fakher-pineapple-ice': {
    'pineapple-ice': '/flavors/al-fakher-pineapple-ice-pineapple-ice.jpg',
  },
  'al-fakher-two-apple': {
    'two-apple': '/flavors/al-fakher-two-apple-two-apple.jpg',
  },
  'mazaya-grape': {
    grape: '/flavors/mazaya-grape-grape.jpg',
  },
  'mazaya-watermelon': {
    watermelon: '/flavors/mazaya-watermelon-watermelon.jpg',
  },
  'mazaya-mint': {
    mint: '/flavors/mazaya-mint-mint.jpg',
  },
  'mazaya-double-apple': {
    'double-apple': '/flavors/mazaya-double-apple-double-apple.jpg',
  },
  'refillo-classic': {
    watermelon: '/flavors/refillo-classic-watermelon.jpg',
    mint: '/flavors/refillo-classic-mint.jpg',
    mango: '/flavors/refillo-classic-mango.jpg',
    'double-apple': '/flavors/refillo-classic-double-apple.jpg',
  },
  'refillo-premium': {
    watermelon: '/flavors/refillo-premium-watermelon.jpg',
    mint: '/flavors/refillo-premium-mint.jpg',
    mango: '/flavors/refillo-premium-mango.jpg',
    'double-apple': '/flavors/refillo-premium-double-apple.jpg',
  },
  'nexpod-15k': {
    watermelon: '/flavors/nexpod-15k-watermelon.jpg',
    blueberry: '/flavors/nexpod-15k-blueberry.jpg',
    grape: '/flavors/nexpod-15k-grape.jpg',
    'mango-ice': '/flavors/nexpod-15k-mango-ice.jpg',
    mint: '/flavors/nexpod-15k-mint.jpg',
  },
  'nexpod-20k': {
    blueberry: '/flavors/nexpod-20k-blueberry.jpg',
    grape: '/flavors/nexpod-20k-grape.jpg',
    'mango-ice': '/flavors/nexpod-20k-mango-ice.jpg',
    mint: '/flavors/nexpod-20k-mint.jpg',
    watermelon: '/flavors/nexpod-20k-watermelon.jpg',
  },
  'nexpod-30k': {
    'mango-ice': '/flavors/nexpod-30k-mango-ice.jpg',
    mint: '/flavors/nexpod-30k-mint.jpg',
    watermelon: '/flavors/nexpod-30k-watermelon.jpg',
    blueberry: '/flavors/nexpod-30k-blueberry.jpg',
    grape: '/flavors/nexpod-30k-grape.jpg',
  },
  'nexbar-18k': {
    'mango-ice': '/flavors/nexbar-18k-mango-ice.jpg',
    mint: '/flavors/nexbar-18k-mint.jpg',
    watermelon: '/flavors/nexbar-18k-watermelon.jpg',
    blueberry: '/flavors/nexbar-18k-blueberry.jpg',
    grape: '/flavors/nexbar-18k-grape.jpg',
  },
  'nexbar-25k': {
    'mango-ice': '/flavors/nexbar-25k-mango-ice.jpg',
    mint: '/flavors/nexbar-25k-mint.jpg',
    watermelon: '/flavors/nexbar-25k-watermelon.jpg',
    blueberry: '/flavors/nexbar-25k-blueberry.jpg',
    grape: '/flavors/nexbar-25k-grape.jpg',
  },
  'nexpod-5k': {
    'mango-ice': '/flavors/nexpod-5k-mango-ice.jpg',
    mint: '/flavors/nexpod-5k-mint.jpg',
    watermelon: '/flavors/nexpod-5k-watermelon.jpg',
    blueberry: '/flavors/nexpod-5k-blueberry.jpg',
    grape: '/flavors/nexpod-5k-grape.jpg',
  },
  'capsule-nexpod-15k': {
    'mango-ice': '/flavors/capsule-nexpod-15k-mango-ice.jpg',
    mint: '/flavors/capsule-nexpod-15k-mint.jpg',
    watermelon: '/flavors/capsule-nexpod-15k-watermelon.jpg',
    blueberry: '/flavors/capsule-nexpod-15k-blueberry.jpg',
    grape: '/flavors/capsule-nexpod-15k-grape.jpg',
  },
  'capsule-nexpod-5k': {
    'mango-ice': '/flavors/capsule-nexpod-5k-mango-ice.jpg',
    mint: '/flavors/capsule-nexpod-5k-mint.jpg',
    watermelon: '/flavors/capsule-nexpod-5k-watermelon.jpg',
    blueberry: '/flavors/capsule-nexpod-5k-blueberry.jpg',
    grape: '/flavors/capsule-nexpod-5k-grape.jpg',
  },
  'capsule-nexpod-30k': {
    'mango-ice': '/flavors/capsule-nexpod-30k-mango-ice.jpg',
    mint: '/flavors/capsule-nexpod-30k-mint.jpg',
    watermelon: '/flavors/capsule-nexpod-30k-watermelon.jpg',
    blueberry: '/flavors/capsule-nexpod-30k-blueberry.jpg',
    grape: '/flavors/capsule-nexpod-30k-grape.jpg',
  },
  'vozol-star': {
    'peach-mango-watermelon': '/flavors/vozol-star-peach-mango-watermelon.jpg',
    'cherry-cola': '/flavors/vozol-star-cherry-cola.jpg',
    'blackberry-grape': '/flavors/vozol-star-blackberry-grape.jpg',
    'super-mint': '/flavors/vozol-star-super-mint.jpg',
  },
  'vozol-gear': {
    'mango-ice': '/flavors/vozol-gear-mango-ice.jpg',
    'grape-ice': '/flavors/vozol-gear-grape-ice.jpg',
    'watermelon-ice': '/flavors/vozol-gear-watermelon-ice.jpg',
    'blue-razz-ice': '/flavors/vozol-gear-blue-razz-ice.jpg',
    'super-mint': '/flavors/vozol-gear-super-mint.jpg',
  },
}

const FLAVOR_THEMES = [
  { pattern: /peach/, accent: '#FF9F5A' },
  { pattern: /cherry|cola/, accent: '#E63946' },
  { pattern: /strawberry|kiwi/, accent: '#FF5C8A' },
  { pattern: /blue razz|blueberry/, accent: '#4C8DFF' },
  { pattern: /mixed berry|blackberry/, accent: '#B85CFF' },
  { pattern: /grape/, accent: '#A66BFF' },
  { pattern: /watermelon|melon/, accent: '#4ADE80' },
  { pattern: /pineapple/, accent: '#FFD23F' },
  { pattern: /lemon/, accent: '#9FE619' },
  { pattern: /mint/, accent: '#43E8A0' },
  { pattern: /mango/, accent: '#FFB020' },
  { pattern: /double apple/, accent: '#84CC16' },
  { pattern: /apple/, accent: '#E03131' },
]

const DEFAULT_ACCENT = '#9FE619'

function slugifyFlavor(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export function getFlavorTheme(name) {
  const flavor = String(name || '').toLowerCase()
  const match = FLAVOR_THEMES.find((theme) => theme.pattern.test(flavor))
  const accent = match?.accent || DEFAULT_ACCENT

  return {
    accent,
    soft: hexToRgba(accent, 0.16),
    glow: hexToRgba(accent, 0.34),
  }
}

export function getFlavorColor(name) {
  return getFlavorTheme(name).accent
}

export function getFlavorArtworkPath(product, variant) {
  if (!product?.slug || !variant?.name) return ''
  const productArtwork = FLAVOR_ARTWORK[product.slug]
  if (!productArtwork) return ''
  return productArtwork[slugifyFlavor(variant.name)] || ''
}
