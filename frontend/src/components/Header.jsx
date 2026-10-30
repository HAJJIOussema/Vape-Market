import SearchBar from './SearchBar.jsx'
import { useCart } from '../context/useCart.js'
import { useAuth } from '../context/useAuth.js'
import { logout } from '../services/authService.js'

function Header({ currentPage, onNavigate, searchQuery, onSearch }) {
  const { itemCount } = useCart()
  const { user } = useAuth()
  async function handleLogout() {
    await logout()
    onNavigate('home')
  }
  return <header className="site-header"><div className="header-inner">
    <button className="brand header-action" onClick={() => onNavigate('home')}>VAPE MARKET</button>
    <SearchBar value={searchQuery} onChange={onSearch} />
    <nav className="nav" aria-label="Navigation principale">
      <button onClick={() => onNavigate('products')} aria-current={currentPage === 'products' ? 'page' : undefined}>Produits</button>
      <button onClick={() => onNavigate('categories')}>Catégories</button>
      <button onClick={() => onNavigate(user ? 'account' : 'login')}>Compte</button>
      {user && <button onClick={handleLogout}>Déconnexion</button>}
      <button onClick={() => onNavigate('cart')}>Panier ({itemCount})</button>
    </nav>
  </div></header>
}

export default Header