// Product photos: files in Supabase Storage (bucket "product-images") plus a
// public.product_images row per photo. Upload, replace and delete are allowed
// for stock managers / admins only, by the storage and table RLS policies.
import { run, supabase } from './db.js'
import { storageBucket } from './imageService.js'
import { createIdempotencyKey } from './orderService.js'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }
// Files uploaded from the admin live under this prefix; older paths
// (public folder, legacy imports) are never deleted from storage.
const UPLOAD_PREFIX = 'products/'

/** French error message for a file that cannot be uploaded, or '' when it is fine. */
export function imageFileError(file) {
  if (!file) return 'Aucun fichier sélectionné.'
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return `« ${file.name} » n’est pas une image JPG, PNG, WebP, GIF ou AVIF.`
  if (file.size > MAX_IMAGE_BYTES) return `« ${file.name} » dépasse 5 Mo.`
  return ''
}

/**
 * imageFileError plus a real decode: a renamed text file passes the type
 * check (the browser trusts the extension) but cannot be decoded.
 */
export async function checkImageFile(file) {
  const error = imageFileError(file)
  if (error) return error
  if (typeof createImageBitmap !== 'function') return ''
  try {
    const bitmap = await createImageBitmap(file)
    bitmap.close?.()
    return ''
  } catch {
    return `« ${file.name} » n’est pas une image valide.`
  }
}

async function uploadFile(productId, file) {
  const error = await checkImageFile(file)
  if (error) throw new Error(error)
  const path = `${UPLOAD_PREFIX}${productId}/${createIdempotencyKey()}.${EXTENSIONS[file.type]}`
  await run(
    supabase.storage.from(storageBucket).upload(path, file, { contentType: file.type, cacheControl: '31536000' }),
    `Impossible d’envoyer « ${file.name} ».`,
  )
  return path
}

async function removeFile(path) {
  if (!String(path || '').startsWith(UPLOAD_PREFIX)) return
  // The row is already gone: a leftover file is harmless, so do not fail.
  await supabase.storage.from(storageBucket).remove([path]).catch(() => {})
}

export async function getProductImages(productId) {
  return run(
    supabase.from('product_images').select('*').eq('product_id', productId)
      .order('sort_order').order('created_at'),
    'Impossible de charger les photos.',
  )
}

/** Upload one photo and attach it to the product (optionally to one variant). */
export async function uploadProductImage(productId, file, { sortOrder = 0, variantId = null, altText = '' } = {}) {
  const path = await uploadFile(productId, file)
  try {
    return await run(
      supabase.from('product_images').insert({
        product_id: productId,
        variant_id: variantId,
        storage_path: path,
        alt_text: String(altText || '').trim() || 'Photo du produit',
        sort_order: sortOrder,
      }).select().single(),
      'Impossible d’enregistrer la photo.',
    )
  } catch (error) {
    await removeFile(path)
    throw error
  }
}

/** Swap the file of an existing photo, keeping its position and variant. */
export async function replaceProductImage(image, file) {
  const path = await uploadFile(image.product_id, file)
  try {
    const updated = await run(
      supabase.from('product_images').update({ storage_path: path }).eq('id', image.id).select().single(),
      'Impossible de remplacer la photo.',
    )
    await removeFile(image.storage_path)
    return updated
  } catch (error) {
    await removeFile(path)
    throw error
  }
}

export async function deleteProductImage(image) {
  await run(supabase.from('product_images').delete().eq('id', image.id), 'Impossible de supprimer la photo.')
  await removeFile(image.storage_path)
}

/** Save the display order: the first photo is the main one. */
export async function saveProductImageOrder(images) {
  await Promise.all(images.map((image, index) => (image.sort_order === index
    ? null
    : run(supabase.from('product_images').update({ sort_order: index }).eq('id', image.id), 'Impossible de réordonner les photos.'))))
}

/** Show a photo for one variant (flavour) only, or for the whole product (null). */
export async function setProductImageVariant(imageId, variantId) {
  return run(
    supabase.from('product_images').update({ variant_id: variantId || null }).eq('id', imageId).select().single(),
    'Impossible de modifier la photo.',
  )
}
