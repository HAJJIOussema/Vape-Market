import { useRef, useState } from 'react'
import { resolveImageUrl } from '../../services/imageService.js'
import {
  ACCEPTED_IMAGE_TYPES, checkImageFile, deleteProductImage, replaceProductImage,
  saveProductImageOrder, setProductImageVariant, uploadProductImage,
} from '../../services/productImageService.js'

/**
 * Photos of a product. For a saved product every action is applied at once;
 * for a new product the chosen files are kept in `pendingFiles` and uploaded
 * by the editor right after the product is created.
 */
function ProductPhotos({ productId, productName = '', images, onImagesChange, variants = [], pendingFiles, onPendingChange }) {
  const addInput = useRef(null)
  const replaceInput = useRef(null)
  const replaceTarget = useRef(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const saved = Boolean(productId)
  const namedVariants = variants.filter((variant) => variant.id)

  async function act(label, task) {
    setBusy(label)
    setError('')
    try {
      await task()
    } catch (taskError) {
      setError(taskError.message || 'Opération impossible.')
    } finally {
      setBusy('')
    }
  }

  async function addFiles(fileList) {
    const files = [...(fileList || [])]
    if (!files.length) return
    const checks = await Promise.all(files.map(checkImageFile))
    const invalid = checks.filter(Boolean)
    const valid = files.filter((_, index) => !checks[index])
    setError(invalid.join(' '))
    if (!valid.length) return
    if (!saved) {
      onPendingChange([...pendingFiles, ...valid.map((file) => ({ file, preview: URL.createObjectURL(file) }))])
      return
    }
    act('Envoi des photos…', async () => {
      const added = []
      for (const [index, file] of valid.entries()) {
        setBusy(`Envoi de la photo ${index + 1} / ${valid.length}…`)
        added.push(await uploadProductImage(productId, file, { sortOrder: images.length + index, altText: productName }))
      }
      onImagesChange([...images, ...added])
    })
  }

  function makeMain(index) {
    const next = [images[index], ...images.filter((_, other) => other !== index)]
    act('Enregistrement…', async () => {
      await saveProductImageOrder(next)
      onImagesChange(next.map((image, position) => ({ ...image, sort_order: position })))
    })
  }

  function remove(image) {
    if (!window.confirm('Supprimer cette photo ?')) return
    act('Suppression…', async () => {
      await deleteProductImage(image)
      onImagesChange(images.filter((other) => other.id !== image.id))
    })
  }

  function replace(file) {
    const image = replaceTarget.current
    if (!image || !file) return
    act('Remplacement…', async () => {
      const updated = await replaceProductImage(image, file)
      onImagesChange(images.map((other) => (other.id === image.id ? updated : other)))
    })
  }

  function linkVariant(image, variantId) {
    act('Enregistrement…', async () => {
      const updated = await setProductImageVariant(image.id, variantId)
      onImagesChange(images.map((other) => (other.id === image.id ? updated : other)))
    })
  }

  function removePending(index) {
    URL.revokeObjectURL(pendingFiles[index].preview)
    onPendingChange(pendingFiles.filter((_, other) => other !== index))
  }

  const tiles = saved
    ? images.map((image) => ({ key: image.id, src: resolveImageUrl(image.storage_path), image }))
    : pendingFiles.map((pending, index) => ({ key: pending.preview, src: pending.preview, pendingIndex: index }))

  return (
    <div
      className="photo-manager"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files) }}
    >
      <div className="photo-grid">
        {tiles.map((tile, index) => (
          <figure className="photo-tile" key={tile.key}>
            <img src={tile.src} alt="" loading="lazy" />
            {index === 0 && <span className="photo-badge">Principale</span>}
            <figcaption>
              {tile.image ? (
                <>
                  {index > 0 && <button type="button" onClick={() => makeMain(index)} disabled={Boolean(busy)}>Principale</button>}
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => { replaceTarget.current = tile.image; replaceInput.current?.click() }}
                  >
                    Remplacer
                  </button>
                  <button type="button" className="danger-text" onClick={() => remove(tile.image)} disabled={Boolean(busy)}>Supprimer</button>
                  {namedVariants.length > 1 && (
                    <select
                      aria-label="Photo affichée pour"
                      value={tile.image.variant_id || ''}
                      disabled={Boolean(busy)}
                      onChange={(event) => linkVariant(tile.image, event.target.value)}
                    >
                      <option value="">Toutes les variantes</option>
                      {namedVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
                    </select>
                  )}
                </>
              ) : (
                <button type="button" className="danger-text" onClick={() => removePending(tile.pendingIndex)}>Retirer</button>
              )}
            </figcaption>
          </figure>
        ))}

        <button type="button" className="photo-add" onClick={() => addInput.current?.click()} disabled={Boolean(busy)}>
          <span aria-hidden="true">＋</span>
          Ajouter des photos
          <small>ou glissez-les ici · JPG, PNG, WebP · 5 Mo max</small>
        </button>
      </div>

      <input
        ref={addInput}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        hidden
        onChange={(event) => { addFiles(event.target.files); event.target.value = '' }}
      />
      <input
        ref={replaceInput}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        hidden
        onChange={(event) => { replace(event.target.files?.[0]); event.target.value = '' }}
      />

      <p className="photo-hint">
        {saved
          ? 'Les modifications de photos sont enregistrées immédiatement. La première photo est l’image principale.'
          : 'Les photos seront envoyées à l’enregistrement du produit.'}
      </p>
      {busy && <p className="form-message" role="status">{busy}</p>}
      {error && <p className="form-message is-error" role="alert">{error}</p>}
    </div>
  )
}

export default ProductPhotos
