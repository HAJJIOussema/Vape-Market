import { useState } from 'react'

function ImageWithFallback({ src, alt, className, fallbackClassName, fallbackLabel }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div className={fallbackClassName} aria-label={fallbackLabel} role="img">◈</div>
  }

  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />
}

export default ImageWithFallback
