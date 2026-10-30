import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import {
  afterAll, beforeAll, describe, expect, it,
} from 'vitest'

const API_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET
  || 'super-secret-jwt-token-with-at-least-32-characters-long'
const PASSWORD = 'TestPassword123!'

function signLocalJwt(role) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: `${API_URL}/auth/v1`,
    ref: 'local',
    role,
    aud: role === 'anon' ? 'anon' : 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url')
  const input = `${header}.${payload}`
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(input).digest('base64url')
  return `${input}.${signature}`
}

function makeClient(accessToken) {
  return createClient(API_URL, signLocalJwt(accessToken ? 'anon' : 'anon'), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  })
}

const admin = createClient(API_URL, signLocalJwt('service_role'), {
  auth: { autoRefreshToken: false, persistSession: false },
})

const fixtures = {
  users: {},
  categoryId: null,
  brandId: null,
  productId: null,
  variantId: null,
  orderIds: [],
  cartIds: [],
  addressIds: [],
}

async function assertNoError(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

async function createUser(name, role) {
  const email = `rls-${name}-${Date.now()}@example.test`
  const created = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `RLS ${name}` },
  })
  const user = await assertNoError(created, `create ${name}`)
  await assertNoError(
    await admin.from('profiles').update({ role }).eq('id', user.user.id),
    `role ${name}`,
  )
  const signedIn = await makeClient().auth.signInWithPassword({ email, password: PASSWORD })
  const session = await assertNoError(signedIn, `sign in ${name}`)
  fixtures.users[name] = { id: user.user.id, client: makeClient(session.session.access_token) }
}

async function createFixtures() {
  const category = await admin.from('categories').insert({
    name: `RLS Category ${Date.now()}`, slug: `rls-category-${Date.now()}`,
  }).select('id').single()
  fixtures.categoryId = (await assertNoError(category, 'category')).id

  const brand = await admin.from('brands').insert({
    name: `RLS Brand ${Date.now()}`, slug: `rls-brand-${Date.now()}`,
  }).select('id').single()
  fixtures.brandId = (await assertNoError(brand, 'brand')).id

  const product = await admin.from('products').insert({
    category_id: fixtures.categoryId,
    brand_id: fixtures.brandId,
    name: 'RLS Product',
    slug: `rls-product-${Date.now()}`,
    status: 'draft',
  }).select('id').single()
  fixtures.productId = (await assertNoError(product, 'product')).id

  const variant = await admin.from('product_variants').insert({
    product_id: fixtures.productId,
    sku: `RLS-${Date.now()}`,
    name: 'RLS Variant',
    price_tnd: 10,
    is_default: true,
    status: 'active',
  }).select('id').single()
  fixtures.variantId = (await assertNoError(variant, 'variant')).id
  await assertNoError(
    await admin.from('products').update({ status: 'active' }).eq('id', fixtures.productId),
    'activate product',
  )
  await assertNoError(
    await admin.from('inventory').insert({ variant_id: fixtures.variantId, on_hand: 10, reserved: 0 }),
    'inventory',
  )

  for (const name of ['customer', 'otherCustomer', 'adminUser', 'superAdmin', 'stockManager']) {
    const role = name === 'adminUser'
      ? 'admin'
      : name === 'superAdmin'
        ? 'super_admin'
        : name === 'stockManager' ? 'stock_manager' : 'customer'
    await createUser(name, role)
  }

  for (const name of ['customer', 'otherCustomer']) {
    const address = await admin.from('addresses').insert({
      profile_id: fixtures.users[name].id,
      label: `${name} home`,
      recipient_name: name,
      phone: '+21620123456',
      governorate: 'Tunis',
      city: 'Tunis',
      address_line: '1 Rue RLS',
      postal_code: '1000',
    }).select('id').single()
    fixtures.addressIds.push((await assertNoError(address, `address ${name}`)).id)

    const cart = await admin.from('carts').insert({ profile_id: fixtures.users[name].id })
      .select('id').single()
    fixtures.cartIds.push((await assertNoError(cart, `cart ${name}`)).id)
  }

  const order = await admin.from('orders').insert({
    order_number: `RLS-${Date.now()}`,
    profile_id: fixtures.users.customer.id,
    customer_email: 'customer@example.test',
    customer_phone: '+21620123456',
    subtotal_tnd: 10,
    shipping_cost_tnd: 0,
    total_tnd: 10,
    shipping_address_snapshot: { city: 'Tunis' },
  }).select('id').single()
  fixtures.orderIds.push((await assertNoError(order, 'order')).id)

  await assertNoError(await admin.from('audit_logs').insert({
    user_id: fixtures.users.customer.id,
    action: 'rls_test',
    resource_type: 'test',
    metadata: {},
  }), 'audit log')
}

beforeAll(async () => {
  await createFixtures()
}, 30000)

afterAll(async () => {
  await admin.from('audit_logs').delete().eq('action', 'rls_test')
  await admin.from('orders').delete().in('id', fixtures.orderIds)
  await admin.from('cart_items').delete().in('cart_id', fixtures.cartIds)
  await admin.from('carts').delete().in('id', fixtures.cartIds)
  await admin.from('addresses').delete().in('id', fixtures.addressIds)
  if (fixtures.variantId) await admin.from('inventory').delete().eq('variant_id', fixtures.variantId)
  if (fixtures.productId) await admin.from('product_variants').delete().eq('id', fixtures.variantId)
  if (fixtures.productId) await admin.from('products').delete().eq('id', fixtures.productId)
  if (fixtures.brandId) await admin.from('brands').delete().eq('id', fixtures.brandId)
  if (fixtures.categoryId) await admin.from('categories').delete().eq('id', fixtures.categoryId)
  for (const value of Object.values(fixtures.users)) await admin.auth.admin.deleteUser(value.id)
}, 30000)

describe('Profiles RLS', () => {
  it('allows a customer to read only its own profile', async () => {
    const { data } = await fixtures.users.customer.client.from('profiles').select('id')
    expect(data).toEqual([{ id: fixtures.users.customer.id }])
  })

  it('hides another customer profile', async () => {
    const { data } = await fixtures.users.customer.client.from('profiles')
      .select('id').eq('id', fixtures.users.otherCustomer.id)
    expect(data).toEqual([])
  })

  it('allows admin and super_admin to read all profiles', async () => {
    const adminResult = await fixtures.users.adminUser.client.from('profiles').select('id')
    const superResult = await fixtures.users.superAdmin.client.from('profiles').select('id')
    expect((adminResult.data || []).map((row) => row.id)).toContain(fixtures.users.customer.id)
    expect((superResult.data || []).map((row) => row.id)).toContain(fixtures.users.customer.id)
  })
})

describe('Addresses, carts and orders RLS', () => {
  it('restricts addresses to their owner', async () => {
    const own = await fixtures.users.customer.client.from('addresses').select('id')
    const foreign = await fixtures.users.customer.client.from('addresses')
      .select('id').eq('id', fixtures.addressIds[1])
    expect(own.data).toEqual([{ id: fixtures.addressIds[0] }])
    expect(foreign.data).toEqual([])
  })

  it('restricts carts to their owner', async () => {
    const own = await fixtures.users.customer.client.from('carts').select('id')
    const foreign = await fixtures.users.customer.client.from('carts')
      .select('id').eq('id', fixtures.cartIds[1])
    expect(own.data).toEqual([{ id: fixtures.cartIds[0] }])
    expect(foreign.data).toEqual([])
  })

  it('restricts orders to their owner while admins can read them', async () => {
    const customer = await fixtures.users.otherCustomer.client.from('orders')
      .select('id').eq('id', fixtures.orderIds[0])
    const adminResult = await fixtures.users.adminUser.client.from('orders')
      .select('id').eq('id', fixtures.orderIds[0])
    const superResult = await fixtures.users.superAdmin.client.from('orders')
      .select('id').eq('id', fixtures.orderIds[0])
    expect(customer.data).toEqual([])
    expect(adminResult.data).toEqual([{ id: fixtures.orderIds[0] }])
    expect(superResult.data).toEqual([{ id: fixtures.orderIds[0] }])
  })
})

describe('Products and inventory RLS', () => {
  it('allows public product reads', async () => {
    const publicClient = createClient(API_URL, signLocalJwt('anon'))
    const result = await publicClient.from('products').select('id').eq('id', fixtures.productId)
    if (result.error) throw new Error(`anon product read: ${result.error.message}`)
    expect(result.data).toEqual([{ id: fixtures.productId }])
  })

  it('rejects customer product creation and allows stock staff', async () => {
    const payload = {
      category_id: fixtures.categoryId,
      brand_id: fixtures.brandId,
      name: 'RLS Draft Product',
      slug: `rls-draft-${Date.now()}`,
      status: 'draft',
    }
    const denied = await fixtures.users.customer.client.from('products').insert(payload)
    const allowed = await fixtures.users.stockManager.client.from('products')
      .insert({ ...payload, slug: `${payload.slug}-staff` }).select('id').single()
    expect(denied.error?.code).toBe('42501')
    expect(allowed.error).toBeNull()
    if (allowed.data?.id) await admin.from('products').delete().eq('id', allowed.data.id)
  })

  it('denies inventory reads to customers and allows stock staff and admins', async () => {
    const customer = await fixtures.users.customer.client.from('inventory')
      .select('variant_id').eq('variant_id', fixtures.variantId)
    const stock = await fixtures.users.stockManager.client.from('inventory')
      .select('variant_id').eq('variant_id', fixtures.variantId)
    const adminResult = await fixtures.users.adminUser.client.from('inventory')
      .select('variant_id').eq('variant_id', fixtures.variantId)
    expect(customer.data).toEqual([])
    expect(stock.data).toEqual([{ variant_id: fixtures.variantId }])
    expect(adminResult.data).toEqual([{ variant_id: fixtures.variantId }])
  })
})

describe('Audit logs RLS', () => {
  it('allows only super_admin to read audit logs', async () => {
    const customer = await fixtures.users.customer.client.from('audit_logs').select('id')
    const stock = await fixtures.users.stockManager.client.from('audit_logs').select('id')
    const superAdmin = await fixtures.users.superAdmin.client.from('audit_logs')
      .select('id').eq('action', 'rls_test')
    expect(customer.data).toEqual([])
    expect(stock.data).toEqual([])
    expect(superAdmin.data).toHaveLength(1)
  })
})
