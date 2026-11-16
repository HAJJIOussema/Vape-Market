export const catalogFamilies = [
  {
    name: 'NEXPOD',
    slug: 'nexpod',
    logo: '/brands/nexpod.png',
    products: ['nexpod-5k', 'nexpod-15k', 'nexpod-30k'],
  },
  {
    name: 'NEXBAR',
    slug: 'nexbar',
    logo: '/brands/nexpod.png',
    products: ['nexbar-18k', 'nexbar-25k'],
  },
  {
    name: 'VOZOL',
    slug: 'vozol',
    logo: '/brands/vozol.png',
    products: ['vozol-50k'],
  },
  {
    name: 'WOTOFO',
    slug: 'wotofo',
    logo: '/brands/wotofo.png',
    products: ['wotofo-refillo'],
  },
  {
    name: 'MAZAYA',
    slug: 'mazaya',
    logo: '/brands/mazaya.png',
    products: ['mazaya-grape', 'mazaya-double-apple', 'mazaya-mint', 'mazaya-watermelon'],
  },
  {
    name: 'AL FAKHER',
    slug: 'al-fakher',
    logo: '/brands/al-fakher.png',
    products: ['al-fakher-two-apple', 'al-fakher-pineapple-ice', 'al-fakher-lemon-mint'],
  },
  {
    name: 'DEEP CLOUD',
    slug: 'deep-cloud',
    logo: '/brands/deep-cloud.png',
    products: ['deep-cloud-blue-razz', 'deep-cloud-mint', 'deep-cloud-peach-ice', 'deep-cloud-strawberry'],
  },
  {
    name: 'CROWN BAR',
    slug: 'crown-bar',
    logo: '/brands/crown-bar.png',
    products: ['crown-bar-18k', 'crown-bar-25k', 'crown-bar-40k'],
  },
  {
    name: 'CAPSULES',
    slug: 'capsules',
    logo: null,
    products: ['capsule-nexpod-15k', 'capsule-nexpod-30k'],
  },
  {
    name: 'E-LIQUIDES',
    slug: 'e-liquides',
    logo: null,
    products: [],
  },
]

export function getCatalogFamily(slug) {
  return catalogFamilies.find((family) => family.slug === slug) || null
}