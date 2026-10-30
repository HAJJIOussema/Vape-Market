const { adminSupabase } = require('../config/supabase')
const logger = require('../config/logger')

function getAuditEvent(req, res) {
  const path = req.originalUrl.split('?')[0]
  const method = req.method
  const match = (pattern) => pattern.test(path)

  if (match(/^\/api\/v1\/auth\/login$/) || match(/^\/api\/auth\/login$/)) {
    return { action: 'login', resourceType: 'auth' }
  }
  if (match(/^\/api\/v1\/auth\/logout$/) || match(/^\/api\/auth\/logout$/)) {
    return { action: 'logout', resourceType: 'auth' }
  }
  if (method === 'POST' && match(/^\/api(?:\/v1)?\/products\/?$/)) {
    return { action: 'product_created', resourceType: 'products' }
  }
  if (method === 'PATCH' && match(/^\/api(?:\/v1)?\/products\/[^/]+$/)) {
    return { action: 'product_updated', resourceType: 'products' }
  }
  if (method === 'DELETE' && match(/^\/api(?:\/v1)?\/products\/[^/]+$/)) {
    return { action: 'product_deleted', resourceType: 'products' }
  }
  if (method === 'POST' && match(/^\/api(?:\/v1)?\/orders\/?$/)) {
    return { action: 'order_created', resourceType: 'orders' }
  }
  if (method === 'POST' && match(/^\/api(?:\/v1)?\/orders\/[^/]+\/cancel$/)) {
    return { action: 'order_cancelled', resourceType: 'orders' }
  }
  if (method === 'PATCH' && match(/^\/api(?:\/v1)?\/profile\/?$/)) {
    return { action: 'profile_updated', resourceType: 'profiles' }
  }
  if (method === 'POST' && match(/^\/api(?:\/v1)?\/admin\/inventory\/[^/]+\/adjust$/)) {
    return { action: 'stock_adjusted', resourceType: 'inventory' }
  }
  return null
}

/**
 * Persist security-relevant HTTP actions after a response completes.
 * Request bodies and credentials are deliberately excluded from metadata.
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @param {import('express').NextFunction} next Express next function.
 * @returns {void}
 */
function auditLogger(req, res, next) {
  const event = getAuditEvent(req, res)
  if (event) {
    res.once('finish', () => {
      if (res.statusCode >= 500) return
      const userId = req.user && (req.user.id || req.user.sub)
      const auditTable = adminSupabase.from('audit_logs')
      if (!auditTable || typeof auditTable.insert !== 'function') {
        logger.warn({ requestId: req.requestId }, 'Audit persistence client is unavailable')
        return
      }
      auditTable.insert({
        user_id: userId || null,
        request_id: req.requestId,
        ip_address: req.ip || null,
        user_agent: req.get('User-Agent') || null,
        action: event.action,
        resource_type: event.resourceType,
        resource_id: req.params && (req.params.productId || req.params.orderId || req.params.variantId) || null,
        metadata: { method: req.method, status_code: res.statusCode },
      }).then(({ error }) => {
        if (error) logger.error({ err: error, requestId: req.requestId }, 'Audit persistence failed')
      }).catch((error) => {
        logger.error({ err: error, requestId: req.requestId }, 'Audit persistence failed')
      })
    })
  }
  return next()
}

module.exports = auditLogger
