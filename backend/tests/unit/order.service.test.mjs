import {
  afterEach, describe, expect, it, vi,
} from 'vitest'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const { adminSupabase } = require('../../src/config/supabase')
const orderService = require('../../src/services/order.service')
const productService = require('../../src/services/product.service')
const NotFoundError = require('../../src/errors/NotFoundError')
const ValidationError = require('../../src/errors/ValidationError')

const variantId = '22222222-2222-4222-8222-222222222222'
const profileId = '11111111-1111-4111-8111-111111111111'
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

function orderInput(overrides = {}) {
  return {
    idempotencyKey: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    items: [{ variant_id: variantId, quantity: 2 }],
    customer_email: ' Guest@Example.test ',
    customer_phone: '20123456',
    shipping_address: { recipient_name: 'Invité', phone: '20123456', address_line: '1 rue Test' },
    shipping_cost_tnd: 99,
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('OrderService.createOrder (guest)', () => {
  it('creates a guest order with the service role and returns a one-time token', async () => {
    let sentParams
    vi.spyOn(adminSupabase, 'rpc').mockImplementation(async (name, params) => {
      sentParams = params
      return {
        data: {
          id: 'order-1',
          order_number: 'VM-AAAAAAAAAAAA',
          status: 'pending',
          profile_id: null,
          guest_access_token_hash: params.p_guest_access_token_hash,
          guest_token_expires_at: params.p_guest_token_expires_at,
        },
        error: null,
      }
    })

    const order = await orderService.createOrder(orderInput())

    expect(adminSupabase.rpc).toHaveBeenCalledWith('create_guest_order', expect.any(Object))
    expect(sentParams.p_shipping_cost_tnd).toBe(0)
    expect(sentParams.p_customer_email).toBe('guest@example.test')
    expect(sentParams.p_guest_access_token_hash).toBe(sha256(order.guest_access_token))
    expect(new Date(sentParams.p_guest_token_expires_at).getTime()).toBeGreaterThan(Date.now())
    expect(order.guest_access_token).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(order).not.toHaveProperty('guest_access_token_hash')
    expect(order).not.toHaveProperty('guest_token_expires_at')
  })

  it('returns no token when the request replays an existing guest order', async () => {
    vi.spyOn(adminSupabase, 'rpc').mockResolvedValue({
      data: { id: 'order-1', status: 'pending', guest_access_token_hash: sha256('first-token') },
      error: null,
    })

    const order = await orderService.createOrder(orderInput())

    expect(order.id).toBe('order-1')
    expect(order.guest_access_token).toBeNull()
  })

  it('uses the caller-scoped client for authenticated customers', async () => {
    const adminRpc = vi.spyOn(adminSupabase, 'rpc')
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'order-2', status: 'pending' }, error: null })

    const order = await orderService.createOrder(orderInput({ profileId, userSupabase: { rpc, from: vi.fn() } }))

    expect(rpc).toHaveBeenCalledWith('create_order', expect.objectContaining({
      p_profile_id: profileId,
      p_shipping_cost_tnd: 0,
    }))
    expect(adminRpc).not.toHaveBeenCalled()
    expect(order).not.toHaveProperty('guest_access_token')
  })

  it('rejects a missing or too short idempotency key', async () => {
    await expect(orderService.createOrder(orderInput({ idempotencyKey: 'short' })))
      .rejects.toBeInstanceOf(ValidationError)
  })

  it.each([
    ['Stock insuffisant — Produit : Puff | Demandé : 5 | Disponible : 1', 409, 'INSUFFICIENT_STOCK'],
    ['Produit introuvable ou inactif : variant_id=x', 409, 'PRODUCT_UNAVAILABLE'],
    ['Idempotency key was reused with a different request', 409, 'IDEMPOTENCY_CONFLICT'],
    ['Invalid order quantity', 400, 'VALIDATION_ERROR'],
    ['some internal failure', 500, 'DATABASE_ERROR'],
  ])('maps "%s" to HTTP %i', async (message, statusCode, code) => {
    vi.spyOn(adminSupabase, 'rpc').mockResolvedValue({ data: null, error: { message, code: 'P0001' } })

    const failure = await orderService.createOrder(orderInput()).catch((error) => error)

    expect(failure.statusCode).toBe(statusCode)
    expect(failure.code).toBe(code)
    if (statusCode === 500) expect(failure.message).not.toContain('internal failure')
  })
})

describe('OrderService.getGuestOrder', () => {
  function mockOrderRow(row) {
    const query = {
      select() { return this },
      eq() { return this },
      is() { return this },
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    }
    vi.spyOn(adminSupabase, 'from').mockReturnValue(query)
  }

  const validRow = {
    id: 'order-1',
    order_number: 'VM-AAAAAAAAAAAA',
    profile_id: null,
    guest_access_token_hash: sha256('the-guest-access-token-value'),
    guest_token_expires_at: new Date(Date.now() + 60_000).toISOString(),
    guest_access_revoked_at: null,
    order_items: [],
  }

  it('returns the order for the right token without secrets', async () => {
    mockOrderRow(validRow)
    const order = await orderService.getGuestOrder({
      order_number: 'VM-AAAAAAAAAAAA', access_token: 'the-guest-access-token-value',
    })
    expect(order.id).toBe('order-1')
    expect(order).not.toHaveProperty('guest_access_token_hash')
    expect(order).not.toHaveProperty('profile_id')
  })

  it.each([
    ['a wrong token', validRow, 'another-guest-access-token'],
    ['an expired token', { ...validRow, guest_token_expires_at: new Date(Date.now() - 1000).toISOString() }, 'the-guest-access-token-value'],
    ['a revoked token', { ...validRow, guest_access_revoked_at: new Date().toISOString() }, 'the-guest-access-token-value'],
    ['an unknown order', null, 'the-guest-access-token-value'],
  ])('returns 404 for %s', async (label, row, token) => {
    mockOrderRow(row)
    await expect(orderService.getGuestOrder({ order_number: 'VM-AAAAAAAAAAAA', access_token: token }))
      .rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('ProductService.toPublicProduct images', () => {
  it('orders product images first, falls back to secure_url and trims paths', () => {
    const product = productService.toPublicProduct({
      product_images: [
        { id: 'v', variant_id: 'variant-1', storage_path: 'products/v.jpg', sort_order: 0 },
        { id: 'b', variant_id: null, storage_path: ' products/b.jpg ', sort_order: 2 },
        { id: 'a', variant_id: null, storage_path: null, secure_url: 'https://cdn.example/a.jpg', sort_order: 1 },
        { id: 'empty', variant_id: null, storage_path: '  ', sort_order: 0 },
      ],
      product_variants: [],
    })

    expect(product.image_paths).toEqual([
      'https://cdn.example/a.jpg',
      'products/b.jpg',
      'products/v.jpg',
    ])
    expect(product.product_images.map((image) => image.id)).toEqual(['a', 'b', 'v'])
  })
})
