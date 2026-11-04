import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'

const currentYear = new Date().getFullYear()

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <BrandLogo className="footer-brand">
          <span className="footer-description">Une expérience simple pour vos achats au quotidien.</span>
        </BrandLogo>
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
