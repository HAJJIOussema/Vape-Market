import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="not-found-page">
      <span className="not-found-code">404</span>
      <h1>Page introuvable</h1>
      <p>La page que vous cherchez n’existe pas ou a été déplacée.</p>
      <Link className="button" to="/">Retour à l’accueil</Link>
    </section>
  )
}

export default NotFoundPage
