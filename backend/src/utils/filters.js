const ValidationError = require('../errors/ValidationError')

/**
 * Apply the supported free-text filter to a Supabase query.
 * @param {object} query Supabase query builder.
 * @param {string} value Search value.
 * @param {string[]} columns Whitelisted searchable columns.
 * @returns {object} Updated query builder.
 */
function applySearch(query, value, columns = ['name']) {
  if (value === undefined || value === null || value === '') return query
  if (typeof value !== 'string' || value.length > 120) {
    throw new ValidationError('Search filter is invalid.', { field: 'q' })
  }
  const pattern = `%${value.replace(/[%_]/g, '\\$&')}%`
  return query.or(columns.map((column) => `${column}.ilike.${pattern}`).join(','))
}

/**
 * Validate and apply a whitelisted sort expression.
 * @param {object} query Supabase query builder.
 * @param {string|undefined} value Sort expression.
 * @param {Record<string, string>} allowedFields API names to database columns.
 * @param {string} defaultField Default database column.
 * @returns {object} Updated query builder.
 */
function applySort(query, value, allowedFields, defaultField) {
  const expression = value || defaultField
  const descending = expression.startsWith('-')
  const field = descending ? expression.slice(1) : expression
  const column = allowedFields[field]
  if (!column || expression.includes(',')) {
    throw new ValidationError('Sort filter is invalid.', { field: 'sort' })
  }
  return query.order(column, { ascending: !descending })
}

module.exports = { applySearch, applySort }
