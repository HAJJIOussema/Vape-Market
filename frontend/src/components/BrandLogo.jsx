function BrandLogo({ className = '', showWordmark = true, children }) {
  const classes = className ? `brand-logo-mark ${className}` : 'brand-logo-mark'

  return (
    <span className={classes}>
      <img
        className="brand-icon"
        src="/logo-officiel.png"
        alt=""
        width="48"
        height="48"
        aria-hidden="true"
      />
      {showWordmark && (
        <span className="brand-logo-copy">
          <span className="brand-wordmark" aria-label="VAPE MARKET">
            <span className="brand-word-vape">VAPE</span>
            <span className="brand-word-market">MARKET</span>
          </span>
          {children}
        </span>
      )}
    </span>
  )
}

export default BrandLogo
