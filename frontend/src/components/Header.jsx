import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import BrandLogo from './BrandLogo.jsx'
import SearchBar from './SearchBar.jsx'
import { useCart } from '../context/useCart.js'
import { useAuth } from '../context/useAuth.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import { logout } from '../services/authService.js'

function Header({ currentPage, onNavigate, searchQuery, onSearch }) {
  const { itemCount } = useCart()
  const { user } = useAuth()
  const { language, setLanguage, t } = useLanguage()
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
    { page: 'products', label: t('navProducts') },
    { page: 'marques', label: t('navBrands') },
    { page: user ? 'account' : 'login', label: t('navAccount') },
  ]

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" type="button" onClick={() => navigateTo('home')} aria-label="VAPE MARKET — Accueil">
          <BrandLogo />
        </button>

        <div className="header-search">
          <SearchBar value={searchQuery} onChange={onSearch} />
        </div>

        <label className="language-switcher">
          <span aria-hidden="true">🌍</span>
          <span className="language-label">{t('language')}</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            aria-label={t('language')}
          >
            <option value="fr">{t('french')}</option>
            <option value="en">{t('english')}</option>
            <option value="ar">{t('arabic')}</option>
          </select>
        </label>

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
          <a className="nav-link" href="/#apropos">{t('navAbout')}</a>
          <a className="nav-link" href="/#contact">{t('navContact')}</a>
          {user && (
            <button type="button" className="nav-link nav-link-muted" onClick={handleLogout}>
              {t('navLogout')}
            </button>
          )}
          <button type="button" className="nav-cart" onClick={() => navigateTo('cart')} aria-label={`Panier, ${itemCount} article(s)`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.5 8.5h11l1 11h-13l1-11Z" />
              <path d="M9 8.5V6.75a3 3 0 0 1 6 0V8.5" />
            </svg>
            <span>{t('navCart')}</span>
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
            <button
              type="button"
              className="mobile-nav-brand"
              onClick={() => navigateTo('home')}
              aria-label="VAPE MARKET — Accueil"
            >
              <BrandLogo />
            </button>
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
            <a className="nav-link" href="/#apropos" onClick={() => setMenuOpen(false)}>{t('navAbout')}</a>
            <a className="nav-link" href="/#contact" onClick={() => setMenuOpen(false)}>{t('navContact')}</a>
            <button type="button" className="nav-link nav-link-muted" onClick={() => navigateTo('cart')}>
              {t('navCart')} ({itemCount})
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
