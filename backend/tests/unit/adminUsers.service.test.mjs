import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const { adminSupabase } = require('../../src/config/supabase')
const adminService = require('../../src/services/admin.service')

const adminId = '11111111-1111-4111-8111-111111111111'
const targetId = '22222222-2222-4222-8222-222222222222'

function makeQuery(result) {
  const query = {
    select: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    eq: vi.fn(() => query),
    range: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({
      data: result.data?.[0] ?? null,
      error: result.error ?? null,
    })),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return query
}

beforeEach(() => {
  vi.spyOn(adminService, 'requireRole').mockResolvedValue('admin')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AdminService.listUsers', () => {
  it('maps the embedded order count and searches name and phone', async () => {
    const query = makeQuery({
      data: [{
        id: targetId,
        full_name: 'Oussema Hajji',
        phone: '+21626110815',
        role: 'admin',
        created_at: '2026-10-31T10:00:00.000Z',
        orders: [{ count: 3 }],
      }],
      count: 1,
      error: null,
    })
    const from = vi.spyOn(adminSupabase, 'from').mockReturnValue(query)

    const result = await adminService.listUsers(adminId, { q: 'Oussema', sort: 'full_name' })

    expect(from).toHaveBeenCalledWith('profiles')
    expect(query.or).toHaveBeenCalledWith(
      'full_name.ilike.%Oussema%,phone.ilike.%Oussema%',
    )
    expect(query.order).toHaveBeenCalledWith('full_name', { ascending: true })
    expect(query.range).toHaveBeenCalledWith(0, 19)
    expect(result.data[0]).toMatchObject({ id: targetId, role: 'admin', order_count: 3 })
    expect(result.data[0].orders).toBeUndefined()
    expect(result.meta).toMatchObject({ page: 1, page_size: 20, total: 1 })
  })
})

describe('AdminService.getUserById', () => {
  it('aggregates the order count and total ordered amount', async () => {
    const profileQuery = makeQuery({
      data: [{
        id: targetId,
        full_name: 'Oussema Hajji',
        phone: '+21626110815',
        role: 'customer',
        created_at: '2026-10-31T10:00:00.000Z',
      }],
      error: null,
    })
    const ordersQuery = makeQuery({
      data: [
        { id: 'order-1', order_number: 'VM-1', total_tnd: 10.5 },
        { id: 'order-2', order_number: 'VM-2', total_tnd: '32.000' },
      ],
      error: null,
    })
    const addressesQuery = makeQuery({
      data: [
        { id: 'address-1', label: 'Maison', city: 'Tunis', is_default: true },
      ],
      error: null,
    })
    vi.spyOn(adminSupabase, 'from').mockImplementation(
      (table) => (table === 'profiles' ? profileQuery : table === 'orders' ? ordersQuery : addressesQuery),
    )

    const result = await adminService.getUserById(adminId, targetId)

    expect(result).toMatchObject({ id: targetId, order_count: 2, total_ordered_tnd: 42.5 })
    expect(result.orders).toHaveLength(2)
    expect(result.addresses).toHaveLength(1)
    expect(ordersQuery.eq).toHaveBeenCalledWith('profile_id', targetId)
    expect(addressesQuery.eq).toHaveBeenCalledWith('profile_id', targetId)
  })
})
