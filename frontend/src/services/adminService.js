// Administration through Supabase directly. Every call is authorised in the
// database: RLS policies (is_admin / is_stock_manager) and role checks inside
// the SECURITY DEFINER functions. Nothing here relies on the browser's role.
import { pick, run, supabase } from './db.js'
import { toPublicProduct } from './productService.js'

export { getAdminOrders } from './orderService.js'

const CATALOG_FIELDS = ['name', 'slug', 'description', 'image_path', 'is_active']
const CATEGORY_FIELDS = [...CATALOG_FIELDS, 'parent_id', 'sort_order']
const PRODUCT_FIELDS = ['category_id', 'brand_id', 'name', 'slug', 'description', 'status']
const VARIANT_FIELDS = ['name', 'sku', 'price_tnd', 'attributes', 'is_default', 'status']
const LIST_LIMIT = 200

function crud(table, fields, label) {
  return {
    list: async () => ({
      data: await run(supabase.from(table).select('*').order('name'), `Impossible de charger les ${label}.`),
    }),
    create: async (payload) => ({
      data: await run(supabase.from(table).insert(pick(payload, fields)).select().single(), 'Impossible d’enregistrer.'),
    }),
    update: async (id, payload) => ({
      data: await run(supabase.from(table).update(pick(payload, fields)).eq('id', id).select().single(), 'Impossible d’enregistrer.'),
    }),
    remove: async (id) => {
      await run(supabase.from(table).delete().eq('id', id), 'Impossible de supprimer.')
      return null
    },
  }
}

const categories = crud('categories', CATEGORY_FIELDS, 'catégories')
const brands = crud('brands', CATALOG_FIELDS, 'marques')
const products = crud('products', PRODUCT_FIELDS, 'produits')

export const getAdminCategories = categories.list
export const createAdminCategory = categories.create
export const updateAdminCategory = categories.update
export const deleteAdminCategory = categories.remove
export const getAdminBrands = brands.list
export const createAdminBrand = brands.create
export const updateAdminBrand = brands.update
export const deleteAdminBrand = brands.remove
export const createAdminProduct = products.create
export const updateAdminProduct = products.update
export const deleteAdminProduct = products.remove

/** All products, whatever their status (admin RLS). */
export async function getAdminProducts() {
  const rows = await run(
    supabase.from('products')
      .select('*, brands(*), categories(*), product_images(*), product_variants(*, in_stock)')
      .order('created_at', { ascending: false }).limit(LIST_LIMIT),
    'Impossible de charger les produits.',
  )
  return { data: (rows || []).map((product) => toPublicProduct(product, { activeVariantsOnly: false })) }
}

function withStock(variant) {
  const inventory = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory
  const { inventory: unused, ...rest } = variant
  void unused
  const onHand = Number(inventory?.on_hand || 0)
  const reserved = Number(inventory?.reserved || 0)
  return { ...rest, on_hand: onHand, reserved, available: onHand - reserved }
}

export async function getAdminProductVariants(productId) {
  const rows = await run(
    supabase.from('product_variants').select('*, inventory(on_hand, reserved)')
      .eq('product_id', productId).order('created_at'),
    'Impossible de charger les variantes.',
  )
  return { data: (rows || []).map(withStock) }
}

// Variant + stock are saved atomically by public.save_product_variant.
export async function createAdminProductVariant(productId, payload) {
  const data = await run(supabase.rpc('save_product_variant', {
    p_product_id: productId,
    p_variant_id: null,
    p_values: pick(payload, VARIANT_FIELDS),
    p_stock: payload.stock === undefined ? null : Number(payload.stock),
  }), 'Impossible d’enregistrer la variante.')
  return { data }
}

export async function updateAdminProductVariant(id, payload) {
  const data = await run(supabase.rpc('save_product_variant', {
    p_product_id: null,
    p_variant_id: id,
    p_values: pick(payload, VARIANT_FIELDS),
    p_stock: payload.stock === undefined ? null : Number(payload.stock),
  }), 'Impossible d’enregistrer la variante.')
  return { data }
}

export async function deleteAdminProductVariant(id) {
  await run(supabase.rpc('delete_product_variant', { p_variant_id: id }), 'Impossible de supprimer la variante.')
  return null
}

export async function getAdminInventory() {
  const rows = await run(
    supabase.from('inventory').select('*, product_variants(*, products(id, name, slug))')
      .order('updated_at', { ascending: false }).limit(LIST_LIMIT),
    'Impossible de charger le stock.',
  )
  return {
    data: (rows || []).map((row) => ({ ...row, available: Number(row.on_hand || 0) - Number(row.reserved || 0) })),
  }
}

export async function getInventoryMovements() {
  const data = await run(
    supabase.from('inventory_movements').select('*, product_variants(sku, name, products(name))')
      .order('created_at', { ascending: false }).limit(LIST_LIMIT),
    'Impossible de charger les mouvements de stock.',
  )
  return { data }
}

export async function adjustInventory(variantId, { delta, reason }) {
  const data = await run(supabase.rpc('adjust_inventory', {
    p_variant_id: variantId,
    p_delta: Number(delta),
    p_reason: String(reason || '').trim(),
  }), 'Impossible d’ajuster le stock.')
  return { data }
}

export async function getAdminUsers() {
  const rows = await run(
    supabase.from('profiles').select('id, full_name, phone, role, created_at, orders(count)')
      .order('created_at', { ascending: false }).limit(LIST_LIMIT),
    'Impossible de charger les utilisateurs.',
  )
  return {
    data: (rows || []).map(({ orders, ...profile }) => ({ ...profile, order_count: Number(orders?.[0]?.count || 0) })),
  }
}

export async function getAdminUser(id) {
  const [profile, orders, addresses] = await Promise.all([
    run(supabase.from('profiles').select('id, full_name, phone, role, created_at, updated_at').eq('id', id).single(),
      'Utilisateur introuvable.'),
    run(supabase.from('orders').select('id, order_number, created_at, status, total_tnd')
      .eq('profile_id', id).order('created_at', { ascending: false }), 'Impossible de charger les commandes.'),
    run(supabase.from('addresses').select('*').eq('profile_id', id)
      .order('is_default', { ascending: false }).order('created_at', { ascending: false }),
    'Impossible de charger les adresses.'),
  ])
  return {
    data: {
      ...profile,
      order_count: orders.length,
      total_ordered_tnd: orders.reduce((total, order) => total + Number(order.total_tnd || 0), 0),
      orders,
      addresses,
    },
  }
}
