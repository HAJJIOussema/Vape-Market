const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const storageBucket = import.meta.env.VITE_STORAGE_BUCKET || 'product-images'

/**
 * Turn an image reference into a URL the browser can load.
 * - absolute URLs (Cloudinary secure_url, http, data, blob) are kept;
 * - paths starting with "/" are files served from frontend/public (e.g. /flavors/…);
 * - anything else is a Supabase Storage object path in the product bucket.
 * Paths are trimmed (some DB rows have trailing whitespace) and each segment
 * is URL-encoded (some legacy paths contain spaces or accents).
 */
export function resolveImageUrl(imagePath) {
  const path = String(imagePath || '').trim()
  if (!path) return ''
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  if (path.startsWith('//')) return `https:${path}`
  if (path.startsWith('/')) return encodePath(path)

  const objectPath = encodePath(path.replace(/^\.?\//, ''))
  if (imageBaseUrl) return `${imageBaseUrl.replace(/\/$/, '')}/${objectPath}`
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${storageBucket}/${objectPath}`
  }
  return `/${objectPath}`
}

function encodePath(path) {
  return path
    .split('/')
    .map((segment) => {
      try {
        // Avoid double-encoding segments that are already encoded.
        return encodeURIComponent(decodeURIComponent(segment))
      } catch {
        return encodeURIComponent(segment)
      }
    })
    .join('/')
}
