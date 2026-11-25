import { useState } from 'react'

function ImageWithFallback({ src, alt, className, fallbackClassName, fallbackLabel, loading }) {
  // Remember which src failed so a new src (e.g. another flavour) is retried.
  const [failedSrc, setFailedSrc] = useState(null)

  if (!src || failedSrc === src) {
    return <div className={fallbackClassName} aria-label={fallbackLabel} role="img">◈</div>
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  )
}

export default ImageWithFallback
