import ProductGrid from '../components/ProductGrid.jsx'

const featuredProducts = [
  { id: 1, name: 'Produit découverte', category: 'Sélection', price: '29.90' },
  { id: 2, name: 'Collection essentielle', category: 'Nouveautés', price: '39.90' },
  { id: 3, name: 'Pack quotidien', category: 'Packs', price: '49.90' },
]

function HomePage({ onNavigate }) {
  return <><section className="hero"><h1>Découvrez notre sélection.</h1><p>Une boutique claire et pratique pour trouver vos produits préférés.</p><button className="button" onClick={() => onNavigate('products')}>Voir les produits</button></section>
    <section><div className="section-heading"><h2>Produits populaires</h2><button className="header-action" onClick={() => onNavigate('products')}>Tout voir</button></div><ProductGrid products={featuredProducts} /></section>
  </>
}

export default HomePage
