import request from 'supertest'
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const { adminSupabase } = require('../../src/config/supabase')
const app = require('../../src/app')
const authService = require('../../src/services/auth.service')
const userService = require('../../src/services/user.service')
const addressService = require('../../src/services/address.service')
const categoryService = require('../../src/services/category.service')
const productService = require('../../src/services/product.service')
const cartService = require('../../src/services/cart.service')
const orderService = require('../../src/services/order.service')
const adminService = require('../../src/services/admin.service')
const NotFoundError = require('../../src/errors/NotFoundError')

const userId = '11111111-1111-4111-8111-111111111111'
const variantId = '22222222-2222-4222-8222-222222222222'
let currentRole = 'customer'

function authHeader() {
  return { Authorization: 'Bearer test-access-token' }
}

function createRoleQuery() {
  return {
    select() { return this },
    eq() { return this },
    async maybeSingle() {
      return { data: currentRole ? { role: currentRole } : null, error: null }
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  currentRole = 'customer'
  adminSupabase.auth.getUser = vi.fn().mockResolvedValue({
    data: { user: { id: userId, email: 'customer@example.com' } },
    error: null,
  })
  adminSupabase.from = vi.fn(() => createRoleQuery())
})

describe('Auth', () => {
  it('returns a successful signup response', async () => {
    vi.spyOn(authService, 'signUp').mockResolvedValue({ user: { id: userId } })

    const response = await request(app).post('/api/auth/signup')
      .send({ email: 'customer@example.com', password: 'secret' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ success: true, data: { user: { id: userId } } })
  })

  it('serializes an authentication business error', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue(
      new (require('../../src/errors/UnauthorizedError'))('Invalid credentials.'),
    )

    const response = await request(app).post('/api/auth/login')
      .send({ email: 'customer@example.com', password: 'wrong' })

    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })
})

describe('Profile and addresses', () => {
  it('rejects an unauthenticated profile request', async () => {
    const response = await request(app).get('/api/profile')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('passes the JWT-scoped client to the profile service', async () => {
    vi.spyOn(userService, 'getProfile').mockResolvedValue({ id: userId })

    const response = await request(app).get('/api/profile').set(authHeader())

    expect(response.status).toBe(200)
    expect(userService.getProfile).toHaveBeenCalledWith(userId, expect.objectContaining({
      from: expect.any(Function),
    }))
  })

  it('returns 400 for an invalid address payload', async () => {
    const response = await request(app).post('/api/addresses')
      .set(authHeader())
      .send({ label: 'Home', phone: '123' })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when RLS-scoped address access finds no owned address', async () => {
    vi.spyOn(addressService, 'getAddress').mockRejectedValue(new NotFoundError('Address'))

    const response = await request(app).get('/api/addresses/33333333-3333-4333-8333-333333333333')
      .set(authHeader())

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })
})

describe('Products and categories', () => {
  it('lists public products successfully', async () => {
    vi.spyOn(productService, 'listProducts').mockResolvedValue({
      data: [{ id: 'product-1', stock_status: 'in_stock' }],
      meta: { page: 1, page_size: 20, total: 1 },
    })

    const response = await request(app).get('/api/products?in_stock=true')

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
    expect(productService.listProducts).toHaveBeenCalledWith({ in_stock: true })
  })

  it('returns a category successfully', async () => {
    vi.spyOn(categoryService, 'getCategoryById').mockResolvedValue({ id: 'category-1' })

    const response = await request(app).get('/api/categories/category-1')

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe('category-1')
  })
})

describe('Cart and orders', () => {
  it('adds a valid cart item and preserves the authenticated client', async () => {
    vi.spyOn(cartService, 'addItem').mockResolvedValue({ variant_id: variantId, quantity: 2 })

    const response = await request(app).post('/api/cart/items')
      .set(authHeader())
      .send({ variant_id: variantId, quantity: 2 })

    expect(response.status).toBe(201)
    expect(cartService.addItem).toHaveBeenCalledWith(
      userId, { variant_id: variantId, quantity: 2 }, expect.objectContaining({ rpc: expect.any(Function) }),
    )
  })

  it('rejects an invalid cart quantity before the service', async () => {
    const response = await request(app).post('/api/cart/items')
      .set(authHeader())
      .send({ variant_id: variantId, quantity: 0 })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(cartService.addItem).not.toHaveBeenCalled()
  })

  it('creates an order through the authenticated service boundary', async () => {
    vi.spyOn(orderService, 'createOrder').mockResolvedValue({ id: 'order-1', status: 'pending' })

    const response = await request(app).post('/api/orders')
      .set(authHeader())
      .set('Idempotency-Key', 'order-key-1')
      .send({
        items: [{ variant_id: variantId, quantity: 1 }],
        customer_email: 'customer@example.com',
        customer_phone: '+21620123456',
        shipping_address: {
          recipient_name: 'Customer',
          phone: '+21620123456',
          governorate: 'Tunis',
          city: 'Tunis',
          address_line: '1 Rue Test',
          postal_code: '1000',
        },
      })

    expect(response.status).toBe(201)
    expect(response.body.data.status).toBe('pending')
    expect(orderService.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      profileId: userId,
      idempotencyKey: 'order-key-1',
      userSupabase: expect.objectContaining({ rpc: expect.any(Function) }),
    }))
  })
})

describe('Admin permissions', () => {
  it('denies a customer before reaching the admin controller', async () => {
    const response = await request(app).get('/api/admin/orders').set(authHeader())

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })

  it('allows an admin to list orders', async () => {
    currentRole = 'admin'
    vi.spyOn(adminService, 'listOrders').mockResolvedValue({
      data: [{ id: 'order-1' }],
      meta: { page: 1, page_size: 20, total: 1 },
    })

    const response = await request(app).get('/api/admin/orders').set(authHeader())

    expect(response.status).toBe(200)
    expect(response.body.data[0].id).toBe('order-1')
    expect(adminService.listOrders).toHaveBeenCalledWith(userId, {})
  })

  it('restricts audit logs to super administrators', async () => {
    currentRole = 'admin'

    const response = await request(app).get('/api/admin/audit-logs').set(authHeader())

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })
})
