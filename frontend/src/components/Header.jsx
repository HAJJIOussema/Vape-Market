import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SearchBar from './SearchBar.jsx'
import { useCart } from '../context/useCart.js'
import { useAuth } from '../context/useAuth.js'
import { logout } from '../services/authService.js'

function Header({ currentPage, onNavigate, searchQuery, onSearch }) {
  const { itemCount } = useCart()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  function navigateTo(page) {
    setMenuOpen(false)
    onNavigate(page)
  }

  async function handleLogout() {
    try {
      const { error } = await logout()
      if (error) console.error('Unable to log out.', error)
    } catch (error) {
      console.error('Unable to log out.', error)
    } finally {
      setMenuOpen(false)
      onNavigate('home')
    }
  }

  const navigation = [
    { page: 'products', label: 'Produits' },
    { page: 'categories', label: 'Catégories' },
    { page: user ? 'account' : 'login', label: 'Compte' },
  ]

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" type="button" onClick={() => navigateTo('home')} aria-label="VAPE MARKET — Accueil">
          <img className="brand-logo" src="/logo-officiel.png" alt="VAPE MARKET" width="48" height="48" />
          <span className="brand-text">VAPE <span>MARKET</span></span>
        </button>

        <div className="header-search">
          <SearchBar value={searchQuery} onChange={onSearch} />
        </div>

        <nav className="nav" aria-label="Navigation principale">
          {navigation.map((item) => (
            <button
              key={item.page}
              type="button"
              className={`nav-link${currentPage === item.page ? ' is-active' : ''}`}
              aria-current={currentPage === item.page ? 'page' : undefined}
              onClick={() => navigateTo(item.page)}
            >
              {item.label}
            </button>
          ))}
          {user && (
            <button type="button" className="nav-link nav-link-muted" onClick={handleLogout}>
              Déconnexion
            </button>
          )}
          <button type="button" className="nav-cart" onClick={() => navigateTo('cart')} aria-label={`Panier, ${itemCount} article(s)`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.5 8.5h11l1 11h-13l1-11Z" />
              <path d="M9 8.5V6.75a3 3 0 0 1 6 0V8.5" />
            </svg>
            <span>Panier</span>
            <span className="cart-badge">{itemCount}</span>
          </button>
        </nav>

        <button
          className={`menu-toggle${menuOpen ? ' is-open' : ''}`}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          <span />
          <span />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="mobile-navigation"
            className="mobile-nav"
            aria-label="Navigation mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {navigation.map((item) => (
              <button
                key={item.page}
                type="button"
                className={`nav-link${currentPage === item.page ? ' is-active' : ''}`}
                onClick={() => navigateTo(item.page)}
              >
                {item.label}
              </button>
            ))}
            <button type="button" className="nav-link nav-link-muted" onClick={() => navigateTo('cart')}>
              Panier ({itemCount})
            </button>
            {user && (
              <button type="button" className="nav-link nav-link-muted" onClick={handleLogout}>
                Déconnexion
              </button>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Header
