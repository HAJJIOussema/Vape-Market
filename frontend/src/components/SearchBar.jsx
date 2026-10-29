import { useState } from 'react'

function SearchBar() {
  const [query, setQuery] = useState('')
  return <form className="search-bar" onSubmit={(event) => event.preventDefault()}>
    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un produit" aria-label="Rechercher un produit" />
    <button type="submit">Rechercher</button>
  </form>
}

export default SearchBar