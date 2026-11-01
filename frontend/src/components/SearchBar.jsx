function SearchBar({ value = '', onChange }) {
  return (
    <form className="search-bar" role="search" onSubmit={(event) => event.preventDefault()}>
      <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Rechercher un produit, une marque…"
        aria-label="Rechercher un produit, une marque ou une catégorie"
      />
      {value && (
        <button
          className="search-clear"
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 7 10 10M17 7 7 17" />
          </svg>
        </button>
      )}
      <button className="search-submit" type="submit" aria-label="Rechercher">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  )
}

export default SearchBar
