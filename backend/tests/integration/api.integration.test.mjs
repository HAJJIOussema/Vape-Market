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
const brandService = require('../../src/services/brand.service')
const categoryService = require('../../src/services/category.service')
const productService = require('../../src/services/product.service')
const cartService = require('../../src/services/cart.service')
const orderService = require('../../src/services/order.service')
const adminService = require('../../src/services/admin.service')
const inventoryService = require('../../src/services/inventory.service')
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
      .send({ email: 'customer@example.com', password: 'secret123' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ success: true, data: { user: { id: userId } } })
  })

  it('serializes an authentication business error', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue(
      new (require('../../src/errors/UnauthorizedError'))('Invalid credentials.'),
    )

    const response = await request(app).post('/api/auth/login')
      .send({ email: 'customer@example.com', password: 'wrongpass' })

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

  it('denies a customer access to administrative categories', async () => {
    const response = await request(app).get('/api/admin/categories').set(authHeader())

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })

  it('lists categories with product counts for an admin', async () => {
    currentRole = 'admin'
    vi.spyOn(categoryService, 'listAdminCategories').mockResolvedValue([
      { id: 'category-1', name: 'Liquides', slug: 'liquides', product_count: 3 },
    ])

    const response = await request(app).get('/api/admin/categories').set(authHeader())

    expect(response.status).toBe(200)
    expect(response.body.data[0].product_count).toBe(3)
    expect(categoryService.listAdminCategories).toHaveBeenCalledWith({})
  })

  it('creates a category from a validated payload', async () => {
    currentRole = 'admin'
    vi.spyOn(categoryService, 'createCategory').mockImplementation(async (input) => ({
      id: 'category-2', ...input,
    }))

    const response = await request(app).post('/api/admin/categories')
      .set(authHeader())
      .send({ name: 'Pods', slug: 'pods', image_path: 'demo/categories/pods.jpg' })

    expect(response.status).toBe(201)
    expect(response.body.data.slug).toBe('pods')
    expect(categoryService.createCategory).toHaveBeenCalledWith({
      name: 'Pods',
      slug: 'pods',
      image_path: 'demo/categories/pods.jpg',
      is_active: true,
      sort_order: 0,
    })
  })

  it('rejects an invalid category slug before the service', async () => {
    currentRole = 'admin'

    const response = await request(app).post('/api/admin/categories')
      .set(authHeader())
      .send({ name: 'Pods', slug: 'Pods Invalides' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('updates a category', async () => {
    currentRole = 'admin'
    vi.spyOn(categoryService, 'updateCategory').mockResolvedValue({
      id: 'category-2', name: 'Pods', slug: 'pods', product_count: 0,
    })

    const response = await request(app).patch('/api/admin/categories/category-2')
      .set(authHeader())
      .send({ name: 'Pods' })

    expect(response.status).toBe(200)
    expect(response.body.data.name).toBe('Pods')
    expect(categoryService.updateCategory).toHaveBeenCalledWith('category-2', { name: 'Pods' })
  })

  it('deletes a category', async () => {
    currentRole = 'admin'
    vi.spyOn(categoryService, 'deleteCategory').mockResolvedValue(undefined)

    const response = await request(app).delete('/api/admin/categories/category-2')
      .set(authHeader())

    expect(response.status).toBe(204)
    expect(categoryService.deleteCategory).toHaveBeenCalledWith('category-2')
  })

  it('lists brands with product counts for an admin', async () => {
    currentRole = 'admin'
    vi.spyOn(brandService, 'listAdminBrands').mockResolvedValue([
      { id: 'brand-1', name: 'Vaporesso', slug: 'vaporesso', product_count: 4 },
    ])

    const response = await request(app).get('/api/admin/brands').set(authHeader())

    expect(response.status).toBe(200)
    expect(response.body.data[0].product_count).toBe(4)
    expect(brandService.listAdminBrands).toHaveBeenCalledWith({})
  })

  it('creates a brand from a validated payload', async () => {
    currentRole = 'admin'
    vi.spyOn(brandService, 'createBrand').mockImplementation(async (input) => ({
      id: 'brand-2', ...input,
    }))

    const response = await request(app).post('/api/admin/brands')
      .set(authHeader())
      .send({ name: 'Vaporesso', slug: 'vaporesso', image_path: 'demo/brands/vaporesso.png' })

    expect(response.status).toBe(201)
    expect(response.body.data.slug).toBe('vaporesso')
    expect(brandService.createBrand).toHaveBeenCalledWith({
      name: 'Vaporesso',
      slug: 'vaporesso',
      image_path: 'demo/brands/vaporesso.png',
      is_active: true,
    })
  })

  it('updates a brand without resetting unspecified fields', async () => {
    currentRole = 'admin'
    vi.spyOn(brandService, 'updateBrand').mockResolvedValue({
      id: 'brand-2', name: 'Vaporesso Pro', slug: 'vaporesso', product_count: 0,
    })

    const response = await request(app).patch('/api/admin/brands/brand-2')
      .set(authHeader())
      .send({ name: 'Vaporesso Pro' })

    expect(response.status).toBe(200)
    expect(response.body.data.name).toBe('Vaporesso Pro')
    expect(brandService.updateBrand).toHaveBeenCalledWith('brand-2', { name: 'Vaporesso Pro' })
  })

  it('deletes a brand', async () => {
    currentRole = 'admin'
    vi.spyOn(brandService, 'deleteBrand').mockResolvedValue(undefined)

    const response = await request(app).delete('/api/admin/brands/brand-2')
      .set(authHeader())

    expect(response.status).toBe(204)
    expect(brandService.deleteBrand).toHaveBeenCalledWith('brand-2')
  })

  it('lists inventory with availability for an admin', async () => {
    currentRole = 'admin'
    vi.spyOn(inventoryService, 'listInventory').mockResolvedValue({
      data: [{
        variant_id: variantId,
        on_hand: 12,
        reserved: 2,
        available: 10,
        product_variants: {
          sku: 'SKU-1', name: '3 mg', products: { name: 'Liquide mangue' },
        },
      }],
      meta: { page: 1, page_size: 20, total: 1 },
    })

    const response = await request(app).get('/api/admin/inventory').set(authHeader())

    expect(response.status).toBe(200)
    expect(response.body.data[0]).toMatchObject({ on_hand: 12, reserved: 2, available: 10 })
    expect(inventoryService.listInventory).toHaveBeenCalledWith(userId, {})
  })

  it('adjusts inventory and records a movement', async () => {
    currentRole = 'admin'
    vi.spyOn(inventoryService, 'adjustInventory').mockResolvedValue({
      variant_id: variantId, on_hand: 15, reserved: 2,
    })

    const response = await request(app).post(`/api/admin/inventory/${variantId}/adjust`)
      .set(authHeader())
      .send({ delta: 5, reason: 'Réapprovisionnement' })

    expect(response.status).toBe(200)
    expect(response.body.data.on_hand).toBe(15)
    expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
      userId, variantId, { delta: 5, reason: 'Réapprovisionnement' }, expect.any(Object),
    )
    const userClient = inventoryService.adjustInventory.mock.calls[0][3]
    expect(userClient).not.toBe(adminSupabase)
    expect(typeof userClient.rpc).toBe('function')
  })

  it('rejects a zero stock adjustment before the service', async () => {
    currentRole = 'admin'

    const response = await request(app).post(`/api/admin/inventory/${variantId}/adjust`)
      .set(authHeader())
      .send({ delta: 0, reason: 'Inventaire' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a stock adjustment without a reason', async () => {
    currentRole = 'admin'

    const response = await request(app).post(`/api/admin/inventory/${variantId}/adjust`)
      .set(authHeader())
      .send({ delta: 1, reason: '   ' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('lists inventory movements for an admin', async () => {
    currentRole = 'admin'
    vi.spyOn(inventoryService, 'listMovements').mockResolvedValue({
      data: [{
        id: 'movement-1',
        variant_id: variantId,
        movement_type: 'adjustment',
        quantity_change: 5,
        reason: 'Réapprovisionnement',
        created_at: '2026-10-31T10:00:00.000Z',
      }],
      meta: { page: 1, page_size: 20, total: 1 },
    })

    const response = await request(app).get('/api/admin/inventory/movements').set(authHeader())

    expect(response.status).toBe(200)
    expect(response.body.data[0].quantity_change).toBe(5)
    expect(inventoryService.listMovements).toHaveBeenCalledWith(userId, {})
  })

  it('denies a customer access to administrative users', async () => {
    const response = await request(app).get('/api/admin/users').set(authHeader())

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })

  it('denies a stock manager access to administrative users', async () => {
    currentRole = 'stock_manager'

    const response = await request(app).get('/api/admin/users').set(authHeader())

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })

  it('lists users with order counts for an admin', async () => {
    currentRole = 'admin'
    vi.spyOn(adminService, 'listUsers').mockResolvedValue({
      data: [{
        id: userId,
        full_name: 'Oussema Hajji',
        phone: '+21626110815',
        role: 'admin',
        created_at: '2026-10-31T10:00:00.000Z',
        order_count: 12,
      }],
      meta: { page: 1, page_size: 20, total: 1 },
    })

    const response = await request(app)
      .get('/api/admin/users?q=Oussema&sort=full_name')
      .set(authHeader())

    expect(response.status).toBe(200)
    expect(response.body.data[0]).toMatchObject({
      full_name: 'Oussema Hajji', phone: '+21626110815', role: 'admin', order_count: 12,
    })
    expect(adminService.listUsers).toHaveBeenCalledWith(userId, { q: 'Oussema', sort: 'full_name' })
  })

  it('returns one user with order history and total ordered amount', async () => {
    currentRole = 'admin'
    vi.spyOn(adminService, 'getUserById').mockResolvedValue({
      id: userId,
      full_name: 'Oussema Hajji',
      phone: '+21626110815',
      role: 'admin',
      created_at: '2026-10-31T10:00:00.000Z',
      order_count: 2,
      total_ordered_tnd: 42.5,
      orders: [
        {
          id: 'order-1', order_number: 'VM-1', status: 'confirmed', total_tnd: 42.5, created_at: '2026-10-31T10:00:00.000Z',
        },
      ],
    })

    const response = await request(app).get(`/api/admin/users/${userId}`).set(authHeader())

    expect(response.status).toBe(200)
    expect(response.body.data.total_ordered_tnd).toBe(42.5)
    expect(response.body.data.orders).toHaveLength(1)
    expect(adminService.getUserById).toHaveBeenCalledWith(userId, userId)
  })

  it('returns 404 for an unknown user', async () => {
    currentRole = 'admin'
    const unknownUserId = '33333333-3333-4333-8333-333333333333'
    vi.spyOn(adminService, 'getUserById').mockRejectedValue(new NotFoundError('User'))

    const response = await request(app).get(`/api/admin/users/${unknownUserId}`).set(authHeader())

    expect(response.status).toBe(404)
    expect(adminService.getUserById).toHaveBeenCalledWith(userId, unknownUserId)
  })
})
