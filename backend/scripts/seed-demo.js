#!/usr/bin/env node

const path = require('node:path')
const dotenv = require('dotenv')
const { createClient } = require('@supabase/supabase-js')

const envPath = path.resolve(__dirname, '../.env')
const envResult = dotenv.config({ path: envPath })

if (envResult.error && envResult.error.code !== 'ENOENT') {
  throw new Error(`Unable to load environment file ${envPath}: ${envResult.error.message}`)
}

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  const missing = [
    !supabaseUrl ? 'SUPABASE_URL' : null,
    !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
  ].filter(Boolean)
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}. `
    + `Expected them in ${envPath}.`,
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const categoryDefinitions = [
  ['Pods Jetables', 'pods-jetables'],
  ['Pods Rechargeables', 'pods-rechargeables'],
  ['Cartouches', 'cartouches'],
  ['Résistances', 'resistances'],
  ['E-liquides', 'e-liquides'],
  ['Puffs Premium', 'puffs-premium'],
]

const brandDefinitions = [
  ['Wotofo', 'wotofo', 'brands/wotofo.png'],
  ['Nexpod', 'nexpod', 'brands/nexpod.png'],
  ['Vozol', 'vozol', 'brands/vozol.png'],
  ['Refillo', 'refillo', 'brands/refillo.png'],
  ['Deep Cloud', 'deep-cloud', 'brands/deep-cloud.png'],
  ['Crown Bar', 'crown-bar', 'brands/crown-bar.png'],
  ['Al Fakher', 'al-fakher', 'brands/al-fakher.png'],
  ['Mazaya', 'mazaya', 'brands/mazaya.png'],
]

const flavors = [
  'Mixed Berries',
  'Piña Colada',
  'Blackberry Ice',
  'Lemon Mint',
  'Tropical Ice',
  'Forest Berries',
  'Cola Ice',
  'Watermelon Ice',
  'Cherry Ice',
  'Mint',
  'Grape Ice',
  'Blue Razz Ice',
  'Double Apple',
  'Melon Ice',
  'Strawberry Kiwi',
  'Energy Ice',
  'Melon Blast',
]

const productDefinitions = [
  ['Wotofo Nex Pod', 'wotofo', 'pods-rechargeables', 45, 'Pod rechargeable compact Wotofo.'],
  ['Wotofo NexM Mesh Coil', 'wotofo', 'resistances', 18, 'Résistance mesh de remplacement Wotofo.'],
  ['Wotofo 10PCS 15ML 20MG', 'wotofo', 'e-liquides', 19, 'Pack de liquides Wotofo 15 ml dosés à 20 mg.'],
  ['Nexpod', 'nexpod', 'pods-jetables', 53, 'Pod jetable compact Nexpod.'],
  ['Vozol', 'vozol', 'pods-jetables', 54, 'Pod jetable Vozol au format nomade.'],
  ['Refillo', 'refillo', 'cartouches', 53, 'Système Refillo avec cartouche rechargeable.'],
  ['Deep Cloud Technology', 'deep-cloud', 'pods-rechargeables', 59, 'Pod rechargeable Deep Cloud Technology.'],
  ['Crown Bar Al Fakher 60K Two Apple', 'crown-bar', 'puffs-premium', 64, 'Puff premium aux notes de double pomme.'],
  ['MegaMax 40K Pineapple Ice', 'al-fakher', 'puffs-premium', 59, 'Puff premium ananas glacé.'],
  ['Mazaya Puff', 'mazaya', 'puffs-premium', 59, 'Puff premium Mazaya.'],
]

function slugify(value) {
  return value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function assertNoError(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

async function clearDemoData() {
  const variants = assertNoError(
    await supabase.from('product_variants').select('id, product_id').like('sku', 'VM-%'),
    'list demo variants',
  )
  const variantIds = variants.map((variant) => variant.id)
  const productIds = [...new Set(variants.map((variant) => variant.product_id))]

  if (variantIds.length > 0) {
    assertNoError(
      await supabase.from('inventory').delete().in('variant_id', variantIds),
      'delete demo inventory',
    )
  }

  if (productIds.length > 0) {
    assertNoError(
      await supabase.from('products').update({ status: 'draft' }).in('id', productIds),
      'deactivate demo products',
    )
    assertNoError(
      await supabase.from('product_images').delete().in('product_id', productIds),
      'delete demo images',
    )
    assertNoError(
      await supabase.from('product_variants').delete().in('product_id', productIds),
      'delete demo variants',
    )
    assertNoError(
      await supabase.from('products').delete().in('id', productIds),
      'delete demo products',
    )
  }

  assertNoError(
    await supabase.from('brands').delete()
      .in('slug', brandDefinitions.map(([, slug]) => slug))
      .in('image_path', brandDefinitions.map(([, , imagePath]) => imagePath)),
    'delete demo brands',
  )
  assertNoError(
    await supabase.from('categories').delete()
      .in('slug', categoryDefinitions.map(([, slug]) => slug))
      .like('description', 'Catégorie de démonstration%'),
    'delete demo categories',
  )
}

async function createCatalog() {
  const categories = assertNoError(
    await supabase.from('categories').insert(categoryDefinitions.map(([name, slug], index) => ({
      name,
      slug,
      description: `Catégorie de démonstration ${name}.`,
      sort_order: index + 1,
      is_active: true,
    }))).select('id, slug'),
    'create categories',
  )
  const brands = assertNoError(
    await supabase.from('brands').insert(brandDefinitions.map(([name, slug, image_path]) => ({
      name,
      slug,
      image_path,
      description: `Marque de démonstration ${name}.`,
      is_active: true,
    }))).select('id, slug'),
    'create brands',
  )

  const categoryIds = new Map(categories.map((category) => [category.slug, category.id]))
  const brandIds = new Map(brands.map((brand) => [brand.slug, brand.id]))
  const brandById = new Map(brands.map((brand) => [brand.id, brand.slug]))
  const products = assertNoError(
    await supabase.from('products').insert(productDefinitions.map(([name, brand, category, price, description]) => ({
      name,
      slug: slugify(name),
      brand_id: brandIds.get(brand),
      category_id: categoryIds.get(category),
      description,
      status: 'draft',
    }))).select('id, name, slug, brand_id'),
    'create products',
  )

  const productByName = new Map(products.map((product) => [product.name, product]))
  const variants = []
  let skuId = 1
  for (const [name, brand, category, price] of productDefinitions) {
    const product = productByName.get(name)
    const productFlavors = name === 'Wotofo 10PCS 15ML 20MG' ? flavors : ['Standard']
    productFlavors.forEach((flavor, index) => {
      variants.push({
        product_id: product.id,
        sku: `VM-${brand.toUpperCase().replace(/-/g, '')}-${String(skuId).padStart(3, '0')}`,
        name: flavor,
        attributes: { flavor },
        price_tnd: price,
        is_default: index === 0,
        status: 'active',
      })
      skuId += 1
    })
  }

  const variantRows = assertNoError(
    await supabase.from('product_variants').insert(variants).select('id, product_id'),
    'create variants',
  )
  assertNoError(
    await supabase.from('inventory').insert(variantRows.map((variant, index) => ({
      variant_id: variant.id,
      on_hand: 5 + (index % 96),
      reserved: 0,
    }))),
    'create inventory',
  )
  assertNoError(
    await supabase.from('product_images').insert(products.map((product) => {
      const brandSlug = brandById.get(product.brand_id)
      return {
        product_id: product.id,
        storage_path: `products/${brandSlug}/${product.slug}/main.jpg`,
        alt_text: `Image principale de ${product.name}`,
        sort_order: 0,
      }
    })),
    'create product images',
  )
  assertNoError(
    await supabase.from('products').update({ status: 'active' }).in('id', products.map((product) => product.id)),
    'activate products',
  )
  return { categories: categories.length, brands: brands.length, products: products.length, variants: variantRows.length }
}

async function main() {
  console.log(`Seeding demo catalogue into ${supabaseUrl}`)
  await clearDemoData()
  const stats = await createCatalog()
  console.log(JSON.stringify({ success: true, ...stats, stock: stats.variants, images: stats.products }, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({ success: false, error: error.message }))
  process.exitCode = 1
})
