const express = require('express')
const { adminSupabase } = require('../config/supabase')

const router = express.Router()

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'vape-market-api',
  })
})

/**
 * GET /debug/stock?variant_id=<uuid>&variant_id=<uuid>
 *
 * Diagnostic temporaire — vérifie que les variant_id envoyés par le panier
 * existent dans product_variants et inventory, et affiche le stock disponible.
 * À SUPPRIMER avant la mise en production.
 *
 * Exemples :
 *   /debug/stock?variant_id=aaa-bbb-ccc
 *   /debug/stock?variant_id=aaa&variant_id=bbb
 */
router.get('/debug/stock', async (req, res) => {
  const raw = req.query.variant_id
  const variantIds = raw
    ? (Array.isArray(raw) ? raw : [raw]).filter(Boolean)
    : []

  if (variantIds.length === 0) {
    return res.status(400).json({
      error: 'Fournissez au moins un ?variant_id=<uuid>',
      usage: '/debug/stock?variant_id=<uuid>&variant_id=<uuid>',
    })
  }

  const results = []

  for (const variantId of variantIds) {
    const entry = { variant_id: variantId }

    // 1. product_variants
    const { data: variant, error: variantErr } = await adminSupabase
      .from('product_variants')
      .select('id, sku, name, status, product_id')
      .eq('id', variantId)
      .maybeSingle()

    if (variantErr) {
      entry.variant_error = variantErr.message
    } else if (!variant) {
      entry.variant_found = false
      entry.verdict = '❌ INTROUVABLE dans product_variants'
    } else {
      entry.variant_found = true
      entry.sku = variant.sku
      entry.variant_name = variant.name
      entry.variant_status = variant.status
      entry.product_id = variant.product_id

      // 2. produit
      const { data: product } = await adminSupabase
        .from('products')
        .select('id, name, status')
        .eq('id', variant.product_id)
        .maybeSingle()

      entry.product_found = Boolean(product)
      entry.product_name = product?.name
      entry.product_status = product?.status

      // 3. inventory
      const { data: inv, error: invErr } = await adminSupabase
        .from('inventory')
        .select('variant_id, on_hand, reserved')
        .eq('variant_id', variantId)
        .maybeSingle()

      if (invErr) {
        entry.inventory_error = invErr.message
      } else if (!inv) {
        entry.inventory_found = false
        entry.verdict = '❌ INTROUVABLE dans inventory'
      } else {
        entry.inventory_found = true
        entry.on_hand = inv.on_hand
        entry.reserved = inv.reserved
        entry.available = inv.on_hand - inv.reserved

        if (variant.status !== 'active') {
          entry.verdict = `❌ variant status=${variant.status} (pas active)`
        } else if (product?.status !== 'active') {
          entry.verdict = `❌ produit status=${product?.status} (pas active)`
        } else if (entry.available <= 0) {
          entry.verdict = '❌ STOCK INSUFFISANT (available <= 0)'
        } else {
          entry.verdict = `✅ OK — disponible: ${entry.available}`
        }
      }
    }

    results.push(entry)
  }

  return res.json({ debug: 'stock-check', results })
})

/**
 * POST /debug/stock-join
 * Body: { "items": [{ "variant_id": "<uuid>", "quantity": 1 }] }
 *
 * Reproduit EXACTEMENT la requête SQL de create_order() sans lock ni transaction.
 * Montre variant_id, on_hand, reserved, available, quantité demandée, et le verdict.
 */
router.post('/debug/stock-join', async (req, res) => {
  const items = req.body?.items
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Body requis : { "items": [{ "variant_id": "<uuid>", "quantity": 1 }] }' })
  }

  const results = []

  for (const item of items) {
    const vid = item.variant_id
    const qty = Number(item.quantity)
    const entry = {
      variant_id_recu: vid,
      typeof_variant_id: typeof vid,
      longueur_variant_id: String(vid).length,
      quantity_demandee: qty,
    }

    // Requête SQL identique à celle de create_order() (sans FOR UPDATE)
    const { data: rows, error: sqlErr } = await adminSupabase.rpc('debug_stock_join', {
      p_variant_id: vid,
    }).select()

    // Fallback si la RPC debug n'existe pas — jointure via PostgREST
    const { data: joinRow, error: joinErr } = await adminSupabase
      .from('product_variants')
      .select(`
        id,
        sku,
        name,
        status,
        price_tnd,
        products!inner ( id, name, status ),
        inventory!inner ( variant_id, on_hand, reserved )
      `)
      .eq('id', vid)
      .eq('status', 'active')
      .eq('products.status', 'active')
      .maybeSingle()

    if (joinErr) {
      entry.join_error = joinErr.message
      entry.verdict = '❌ ERREUR JOINTURE'
    } else if (!joinRow) {
      entry.join_found = false

      // Décomposer pour trouver exactement quelle condition échoue
      const { data: v } = await adminSupabase
        .from('product_variants').select('id, status, product_id').eq('id', vid).maybeSingle()
      entry.variant_exists = Boolean(v)
      entry.variant_status = v?.status ?? 'INTROUVABLE'

      if (v) {
        const { data: p } = await adminSupabase
          .from('products').select('id, name, status').eq('id', v.product_id).maybeSingle()
        entry.product_exists = Boolean(p)
        entry.product_name = p?.name
        entry.product_status = p?.status ?? 'INTROUVABLE'

        const { data: inv } = await adminSupabase
          .from('inventory').select('variant_id, on_hand, reserved').eq('variant_id', vid).maybeSingle()
        entry.inventory_exists = Boolean(inv)
        entry.on_hand = inv?.on_hand
        entry.reserved = inv?.reserved
        entry.available = inv ? inv.on_hand - inv.reserved : null

        if (v.status !== 'active') entry.verdict = `❌ variant.status="${v.status}" — pas active`
        else if (!p || p.status !== 'active') entry.verdict = `❌ product.status="${p?.status}" — pas active`
        else if (!inv) entry.verdict = '❌ Aucune ligne inventory pour ce variant_id'
        else entry.verdict = '❌ CAUSE INCONNUE — toutes les conditions semblent OK'
      } else {
        entry.verdict = `❌ variant_id "${vid}" INTROUVABLE — localStorage périmé ?`
      }
    } else {
      const inv = joinRow.inventory
      const available = inv.on_hand - inv.reserved
      const ok = available >= qty
      entry.join_found = true
      entry.sku = joinRow.sku
      entry.variant_name = joinRow.name
      entry.variant_status = joinRow.status
      entry.product_name = joinRow.products?.name
      entry.product_status = joinRow.products?.status
      entry.on_hand = inv.on_hand
      entry.reserved = inv.reserved
      entry.available = available
      entry.verdict = ok
        ? `✅ OK — available=${available} >= qty=${qty}`
        : `❌ STOCK INSUFFISANT — available=${available} < qty=${qty}`
    }

    results.push(entry)
  }

  return res.json({ debug: 'stock-join', results })
})

module.exports = router
