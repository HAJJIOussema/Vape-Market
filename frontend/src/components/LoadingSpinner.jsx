function LoadingSpinner() {
  return (
    <span className="loading-spinner" role="status" aria-label="Chargement">
      <span className="loading-spinner-ring" aria-hidden="true" />
      <span>Chargement…</span>
    </span>
  )
}

export default LoadingSpinner
