const AppError = require('../errors/AppError')
const { adminSupabase: supabase } = require('../config/supabase')
const ForbiddenError = require('../errors/ForbiddenError')
const UnauthorizedError = require('../errors/UnauthorizedError')
const { parsePagination, buildPaginationMeta } = require('../utils/pagination')

/**
 * Immutable audit-log boundary.
 * Audit writes must be generated server-side and never accept a client role.
 */
class AuditService {
  /**
   * @returns {Promise<never>} Stub awaiting request-context integration.
   */
  async record() { throw new AppError('Audit service is not implemented.', 'NOT_IMPLEMENTED', 501) }

  /**
   * @returns {Promise<never>} Stub awaiting administration controller implementation.
   */
  async listLogs(profileId, filters = {}) {
    if (!profileId) throw new UnauthorizedError()
    const profile = await supabase.from('profiles').select('role').eq('id', profileId).maybeSingle()
    if (profile.error) throw AppError.fromSupabase(profile.error, 'Unable to verify permissions.')
    if (!profile.data || profile.data.role !== 'super_admin') throw new ForbiddenError()
    const pagination = parsePagination(filters)
    let query = supabase.from('audit_logs').select('*', { count: 'exact' })
    if (filters.action) query = query.eq('action', filters.action)
    query = query.order('created_at', { ascending: false }).range(pagination.from, pagination.to)
    const { data, count, error } = await query
    if (error) throw AppError.fromSupabase(error, 'Unable to list audit logs.')
    return { data: data || [], meta: buildPaginationMeta(pagination.page, pagination.pageSize, count || 0) }
  }
}

module.exports = new AuditService()
