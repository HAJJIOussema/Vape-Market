import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

const { adminSupabase } = require('../../src/config/supabase')
const inventoryService = require('../../src/services/inventory.service')
const UnauthorizedError = require('../../src/errors/UnauthorizedError')
const ValidationError = require('../../src/errors/ValidationError')

const userId = '11111111-1111-4111-8111-111111111111'
const variantId = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  vi.spyOn(inventoryService, 'requireRole').mockResolvedValue('admin')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('InventoryService.adjustInventory', () => {
  it('sends the adjustment through the caller-scoped Supabase client', async () => {
    const adminRpc = vi.spyOn(adminSupabase, 'rpc').mockImplementation(() => {
      throw new Error('The service role client must not run adjust_inventory')
    })
    const rpc = vi.fn().mockResolvedValue({
      data: { variant_id: variantId, on_hand: 15, reserved: 2 },
      error: null,
    })

    const result = await inventoryService.adjustInventory(
      userId,
      variantId,
      { delta: 5, reason: '  Réapprovisionnement  ' },
      { rpc },
    )

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('adjust_inventory', {
      p_variant_id: variantId,
      p_delta: 5,
      p_reason: 'Réapprovisionnement',
    })
    expect(adminRpc).not.toHaveBeenCalled()
    expect(result).toMatchObject({ on_hand: 15, reserved: 2 })
  })

  it('requires the caller-scoped client instead of the service role', async () => {
    await expect(inventoryService.adjustInventory(
      userId, variantId, { delta: 1, reason: 'Inventaire' },
    )).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('maps an RPC business rejection to a validation error', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'Invalid inventory adjustment' },
    })

    await expect(inventoryService.adjustInventory(
      userId, variantId, { delta: 1, reason: 'Inventaire' }, { rpc },
    )).rejects.toBeInstanceOf(ValidationError)
  })
})
