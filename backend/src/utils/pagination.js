const ValidationError = require('../errors/ValidationError')

/**
 * Normalize offset pagination parameters used by list services.
 * @param {{page?: number|string, page_size?: number|string, pageSize?: number|string}} [input]
 * @returns {{page: number, pageSize: number, from: number, to: number}}
 */
function parsePagination(input = {}) {
  const rawPage = input.page === undefined ? 1 : input.page
  const rawPageSize = input.page_size === undefined
    ? (input.pageSize === undefined ? 20 : input.pageSize)
    : input.page_size
  const page = Number(rawPage)
  const pageSize = Number(rawPageSize)

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ValidationError('Pagination values are invalid.', { fields: ['page', 'page_size'] })
  }

  return {
    page,
    pageSize,
    from: (page - 1) * pageSize,
    to: page * pageSize - 1,
  }
}

/**
 * Build the pagination metadata returned by collection services.
 * @param {number} page Current page.
 * @param {number} pageSize Page size.
 * @param {number} total Total rows.
 * @returns {{page: number, page_size: number, total: number, total_pages: number}}
 */
function buildPaginationMeta(page, pageSize, total) {
  return {
    page,
    page_size: pageSize,
    total,
    total_pages: total === 0 ? 0 : Math.ceil(total / pageSize),
  }
}

module.exports = { parsePagination, buildPaginationMeta }
