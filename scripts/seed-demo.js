#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const demoPrefix = 'demo-'

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const categories = [
  {
    name: 'Liquides',
    slug: `${demoPrefix}liquides`,
    description: 'Liquides de vape de démonstration.',
    image_path: 'demo/categories/liquides.jpg',
    sort_order: 1,
  },
  {
    name: 'Pods',
    slug: `${demoPrefix}pods`,
    description: 'Systèmes pod compacts de démonstration.',
    image_path: 'demo/categories/pods.jpg',
    sort_order: 2,
  },
  {
    name: 'Kits',
    slug: `${demoPrefix}kits`,
    description: 'Kits complets de démonstration.',
    image_path: 'demo/categories/kits.jpg',
    sort_order: 3,
  },
  {
    name: 'Batteries',
    slug: `${demoPrefix}batteries`,
    description: 'Batteries et accus de démonstration.',
    image_path: 'demo/categories/batteries.jpg',
    sort_order: 4,
  },
  {
    name: 'Accessoires',
    slug: `${demoPrefix}accessoires`,
    description: 'Accessoires de démonstration.',
    image_path: 'demo/categories/accessoires.jpg',
    sort_order: 5,
  },
]

const brands = [
  ['Nexa', 'nexa'],
  ['Atlas Vape', 'atlas-vape'],
  ['Carthage Cloud', 'carthage-cloud'],
  ['Medina Labs', 'medina-labs'],
  ['Sirocco', 'sirocco'],
  ['Oasis Coil', 'oasis-coil'],
  ['Djerba Mist', 'djerba-mist'],
  ['Cap Bon Tech', 'cap-bon-tech'],
].map(([name, slug]) => ({
  name,
  slug: `${demoPrefix}${slug}`,
  description: `Marque ${name} pour le catalogue de démonstration.`,
  image_path: `demo/brands/${slug}.jpg`,
}))

const productTemplates = [
  ['Menthe Fraîche', 'liquides', 'nexa', 'E-liquide frais aux notes de menthe douce.'],
  ['Fraise Basilic', 'liquides', 'atlas-vape', 'Mélange fruité et aromatique inspiré du bassin méditerranéen.'],
  ['Agrumes du Cap Bon', 'liquides', 'carthage-cloud', 'Profil citronné et équilibré aux agrumes.'],
  ['Raisin Rose', 'liquides', 'medina-labs', 'Saveur raisin légèrement florale et persistante.'],
  ['Thé à la Pêche', 'liquides', 'sirocco', 'Thé glacé et pêche mûre pour une vape douce.'],
  ['Pod Compact Air', 'pods', 'nexa', 'Pod rechargeable compact pour un usage quotidien.'],
  ['Pod Nano Plus', 'pods', 'atlas-vape', 'Pod léger avec tirage automatique et format nomade.'],
  ['Pod Breeze', 'pods', 'carthage-cloud', 'Pod simple à utiliser avec batterie intégrée.'],
  ['Pod Urban', 'pods', 'medina-labs', 'Pod discret pensé pour les déplacements.'],
  ['Pod Oasis', 'pods', 'sirocco', 'Pod ergonomique avec autonomie renforcée.'],
  ['Kit Starter One', 'kits', 'oasis-coil', 'Kit de démarrage accessible et facile à utiliser.'],
  ['Kit MTL Classic', 'kits', 'djerba-mist', 'Kit orienté inhalation indirecte et autonomie.'],
  ['Kit Cloud Mini', 'kits', 'cap-bon-tech', 'Kit compact pour une vapeur généreuse.'],
  ['Kit Sirocco Pro', 'kits', 'sirocco', 'Kit polyvalent avec réglages essentiels.'],
  ['Kit Medina 80', 'kits', 'medina-labs', 'Kit robuste avec puissance réglable.'],
  ['Batterie Slim 650', 'batteries', 'nexa', 'Batterie compacte pour formats pod compatibles.'],
  ['Batterie Twist 900', 'batteries', 'atlas-vape', 'Batterie réglable avec finition résistante.'],
  ['Batterie Longlife 1200', 'batteries', 'carthage-cloud', 'Batterie intégrée conçue pour une autonomie prolongée.'],
  ['Accu Safe 18650', 'batteries', 'cap-bon-tech', 'Accu rechargeable destiné aux appareils compatibles.'],
  ['Chargeur Dual USB', 'batteries', 'oasis-coil', 'Chargeur USB double port pour appareils compatibles.'],
  ['Résistance Mesh 0.6', 'accessoires', 'oasis-coil', 'Résistance mesh de remplacement pour vape directe.'],
  ['Résistance MTL 1.2', 'accessoires', 'djerba-mist', 'Résistance de remplacement pour tirage indirect.'],
  ['Cartouche Air 2 ml', 'accessoires', 'nexa', 'Cartouche de remplacement pour pod compatible.'],
  ['Cartouche Nano 2 ml', 'accessoires', 'atlas-vape', 'Cartouche compacte avec remplissage pratique.'],
  ['Drip Tip 510 Noir', 'accessoires', 'carthage-cloud', 'Embout 510 de remplacement en finition noire.'],
  ['Drip Tip 810 Sable', 'accessoires', 'medina-labs', 'Embout 810 confortable en finition sable.'],
  ['Verre Bubble 4 ml', 'accessoires', 'sirocco', 'Réservoir de remplacement en verre renforcé.'],
  ['Verre Straight 3 ml', 'accessoires', 'oasis-coil', 'Réservoir droit de remplacement.'],
  ['Kit Joints Universels', 'accessoires', 'djerba-mist', 'Assortiment de joints pour entretien courant.'],
  ['Pochette de Transport', 'accessoires', 'cap-bon-tech', 'Pochette de protection pour appareil et accessoires.'],
  ['Fruits Rouges Glacés', 'liquides', 'oasis-coil', 'Assemblage de fruits rouges avec une finale fraîche.'],
  ['Myrtille Citron', 'liquides', 'djerba-mist', 'Myrtille acidulée et citron lumineux.'],
  ['Pastèque Grenade', 'liquides', 'cap-bon-tech', 'Pastèque juteuse et grenade légèrement acidulée.'],
  ['Vanille Café', 'liquides', 'nexa', 'Alliance ronde de vanille et de café torréfié.'],
  ['Mangue Passion', 'liquides', 'atlas-vape', 'Mangue mûre et fruit de la passion exotique.'],
  ['Pod Compact Air XL', 'pods', 'oasis-coil', 'Version grande autonomie du pod Compact Air.'],
  ['Pod Nano Plus S', 'pods', 'djerba-mist', 'Format compact avec cartouche rechargeable.'],
  ['Pod Breeze Max', 'pods', 'cap-bon-tech', 'Pod endurant avec puissance adaptée au quotidien.'],
  ['Pod Urban Mesh', 'pods', 'nexa', 'Pod urbain équipé d’une cartouche mesh.'],
  ['Pod Oasis Touch', 'pods', 'atlas-vape', 'Pod tactile avec réglage simple du tirage.'],
  ['Kit Starter One Plus', 'kits', 'carthage-cloud', 'Kit complet avec autonomie améliorée.'],
  ['Kit MTL Classic Mini', 'kits', 'medina-labs', 'Format compact orienté inhalation indirecte.'],
  ['Kit Cloud Mini 2', 'kits', 'sirocco', 'Évolution compacte pour une vapeur généreuse.'],
  ['Kit Sirocco Pro 2', 'kits', 'oasis-coil', 'Kit polyvalent avec écran et réglages précis.'],
  ['Kit Medina 100', 'kits', 'djerba-mist', 'Kit robuste avec batterie longue durée.'],
  ['Batterie Slim 800', 'batteries', 'carthage-cloud', 'Batterie fine pour pods à connectique compatible.'],
  ['Batterie Twist 1100', 'batteries', 'medina-labs', 'Batterie réglable avec recharge USB-C.'],
  ['Batterie Longlife 1500', 'batteries', 'sirocco', 'Batterie intégrée pour une journée prolongée.'],
  ['Accu Safe 21700', 'batteries', 'oasis-coil', 'Accu rechargeable pour appareils compatibles 21700.'],
  ['Chargeur Compact USB-C', 'batteries', 'djerba-mist', 'Chargeur compact pour appareils compatibles.'],
]

const flavorVariants = ['Classique', 'Menthe', 'Agrumes', 'Fruits Rouges', 'Vanille']

if (productTemplates.length !== 50) {
  throw new Error(`The demo catalog must contain exactly 50 products, found ${productTemplates.length}.`)
}

function assertNoError(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

async function deleteBySlugs(table, slugs) {
  if (slugs.length === 0) return
  assertNoError(await supabase.from(table).delete().in('slug', slugs), `delete ${table}`)
}

async function clearDemoData() {
  const products = assertNoError(
    await supabase.from('products').select('id').like('slug', `${demoPrefix}%`),
    'list demo products',
  )
  const productIds = (products || []).map((product) => product.id)

  if (productIds.length > 0) {
    assertNoError(
      await supabase.from('products').update({ status: 'draft' }).in('id', productIds),
      'deactivate demo products',
    )
    const variants = assertNoError(
      await supabase.from('product_variants').select('id').in('product_id', productIds),
      'list demo variants',
    )
    const variantIds = (variants || []).map((variant) => variant.id)
    if (variantIds.length > 0) {
      assertNoError(await supabase.from('product_images').delete().in('product_id', productIds), 'delete demo images')
      assertNoError(await supabase.from('inventory').delete().in('variant_id', variantIds), 'delete demo inventory')
      assertNoError(await supabase.from('product_variants').delete().in('id', variantIds), 'delete demo variants')
    }
    assertNoError(await supabase.from('products').delete().in('id', productIds), 'delete demo products')
  }

  await deleteBySlugs('brands', brands.map((brand) => brand.slug))
  await deleteBySlugs('categories', categories.map((category) => category.slug))
}

async function insertCatalog() {
  const categoryRows = assertNoError(
    await supabase.from('categories').insert(categories).select('id, slug'),
    'insert categories',
  )
  const brandRows = assertNoError(
    await supabase.from('brands').insert(brands).select('id, slug'),
    'insert brands',
  )
  const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row.id]))
  const brandBySlug = new Map(brandRows.map((row) => [row.slug.replace(demoPrefix, ''), row.id]))

  const products = productTemplates.map(([name, categorySlug, brandSlug, description], index) => ({
    category_id: categoryBySlug.get(`${demoPrefix}${categorySlug}`),
    brand_id: brandBySlug.get(brandSlug),
    name: `${name} ${String(index + 1).padStart(2, '0')}`,
    slug: `${demoPrefix}${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}-${index + 1}`,
    description,
    status: 'draft',
  }))
  const productRows = assertNoError(
    await supabase.from('products').insert(products).select('id, slug'),
    'insert products',
  )

  const variants = productRows.flatMap((product, productIndex) => {
    const basePrice = 19 + ((productIndex * 7) % 70)
    return [0, 1].map((variantIndex) => ({
      product_id: product.id,
      sku: `DEMO-${String(productIndex + 1).padStart(3, '0')}-${variantIndex + 1}`,
      name: variantIndex === 0 ? 'Version standard' : 'Version premium',
      attributes: {
        format: variantIndex === 0 ? 'standard' : 'premium',
        profile: flavorVariants[productIndex % flavorVariants.length],
      },
      price_tnd: basePrice + (variantIndex * 8),
      is_default: variantIndex === 0,
      status: 'active',
    }))
  })
  const variantRows = assertNoError(
    await supabase.from('product_variants').insert(variants).select('id, product_id, sku'),
    'insert variants',
  )

  const inventory = variantRows.map((variant, index) => ({
    variant_id: variant.id,
    on_hand: 8 + ((index * 13) % 73),
    reserved: 0,
  }))
  assertNoError(await supabase.from('inventory').insert(inventory), 'insert inventory')

  const images = productRows.map((product) => ({
    product_id: product.id,
    storage_path: `demo/products/${product.slug}.jpg`,
    alt_text: `Image du produit ${product.slug}`,
    sort_order: 0,
  }))
  assertNoError(await supabase.from('product_images').insert(images), 'insert product images')

  assertNoError(
    await supabase.from('products')
      .update({ status: 'active' })
      .in('id', productRows.map((product) => product.id)),
    'activate products',
  )

  return { products: productRows.length, variants: variantRows.length, inventory: inventory.length }
}

async function main() {
  console.log(`Seeding demo catalogue into ${supabaseUrl}`)
  await clearDemoData()
  const summary = await insertCatalog()
  console.log(JSON.stringify({ success: true, ...summary }, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: error.message,
  }))
  process.exitCode = 1
})
