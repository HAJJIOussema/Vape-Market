import { Link } from 'react-router-dom'
import { useCart } from '../context/useCart.js'

function CartPage() {
  const { items, updateItem, removeItem, itemCount } = useCart()
  const total = items.reduce((sum, item) => sum + item.variant.price_tnd * item.quantity, 0)

  if (items.length === 0) {
    return (
      <section>
        <h1>Votre panier</h1>
        <p>Votre panier est vide.</p>
        <Link className="button" to="/products">Voir les produits</Link>
      </section>
    )
  }

  return (
    <section>
      <div className="section-heading">
        <h1>Votre panier</h1>
        <span>{itemCount} article(s)</span>
      </div>
      <div className="cart-list">
        {items.map((item) => (
          <article className="cart-item" key={item.variant_id}>
            <div>
              <h2>{item.product.name}</h2>
              <p>{item.variant.name} — {item.variant.price_tnd} TND</p>
            </div>
            <label>
              Quantité
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(event) => updateItem(item.variant_id, event.target.value)}
              />
            </label>
            <strong>{(item.variant.price_tnd * item.quantity).toFixed(3)} TND</strong>
            <button type="button" onClick={() => removeItem(item.variant_id)}>Supprimer</button>
          </article>
        ))}
      </div>
      <p className="cart-total">Total : <strong>{total.toFixed(3)} TND</strong></p>
      <Link className="button" to="/products">Continuer mes achats</Link>
    </section>
  )
}

export default CartPage
