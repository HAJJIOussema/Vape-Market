import { Link } from 'react-router-dom'

const currentYear = new Date().getFullYear()

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-mark" aria-hidden="true">V</span>
          <div>
            <strong>VAPE MARKET</strong>
            <p>Une expérience simple pour vos achats au quotidien.</p>
          </div>
        </div>
        <div className="footer-links">
          <div>
            <span className="footer-heading">Boutique</span>
            <Link to="/products">Produits</Link>
            <Link to="/categories">Catégories</Link>
            <Link to="/cart">Panier</Link>
          </div>
          <div>
            <span className="footer-heading">Compte</span>
            <Link to="/account">Mon compte</Link>
            <Link to="/account/orders">Mes commandes</Link>
            <Link to="/login">Connexion</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {currentYear} VAPE MARKET</span>
        <span>Achat responsable · 18+</span>
      </div>
    </footer>
  )
}

export default Footer
