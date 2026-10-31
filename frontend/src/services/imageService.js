const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const storageBucket = import.meta.env.VITE_STORAGE_BUCKET || 'product-images'

export function resolveImageUrl(imagePath) {
  if (!imagePath) return ''
  if (/^(https?:|data:|blob:)/i.test(imagePath)) return imagePath

  if (imageBaseUrl) {
    return `${imageBaseUrl.replace(/\/$/, '')}/${imagePath.replace(/^\//, '')}`
  }

  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${storageBucket}/${imagePath.replace(/^\//, '')}`
  }

  return imagePath
}
