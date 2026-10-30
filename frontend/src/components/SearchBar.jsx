function SearchBar({ value = '', onChange }) {
  return <form className="search-bar" onSubmit={(event) => event.preventDefault()}>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Rechercher un produit, une marque ou une catégorie"
      aria-label="Rechercher un produit, une marque ou une catégorie"
    />
    <button type="submit">Rechercher</button>
  </form>
}

export default SearchBar