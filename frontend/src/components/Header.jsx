import SearchBar from './SearchBar.jsx'

function Header({ currentPage, onNavigate }) {
  return <header className="site-header"><div className="header-inner">
    <button className="brand header-action" onClick={() => onNavigate('home')}>VAPE MARKET</button>
    <SearchBar />
    <nav className="nav" aria-label="Navigation principale">
      <button onClick={() => onNavigate('products')} aria-current={currentPage === 'products' ? 'page' : undefined}>Produits</button>
      <button onClick={() => onNavigate('categories')}>Catégories</button>
      <button onClick={() => onNavigate('account')}>Compte</button>
      <button onClick={() => onNavigate('cart')}>Panier (0)</button>
    </nav>
  </div></header>
}

export default Header