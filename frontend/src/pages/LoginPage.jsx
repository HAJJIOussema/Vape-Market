import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../services/authService.js'
import { useAuth } from '../context/useAuth.js'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, configured, configError } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const redirectTo = location.state?.from || '/account'

  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true })
  }, [loading, user, navigate, redirectTo])

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const { error: requestError, data } = await login(form)
      if (requestError) {
        setError(requestError.message)
        return
      }
      if (!data?.session) {
        setError('Connexion incomplète. Vérifiez votre adresse email si une confirmation est requise.')
      }
    } catch (requestError) {
      setError(requestError.message || 'Impossible de se connecter.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthForm
      title="Connexion"
      submitLabel="Se connecter"
      form={form}
      setForm={setForm}
      error={error || (!configured ? configError : '')}
      submitting={submitting || loading}
      onSubmit={submit}
      disabled={!configured}
    >
      <p>Pas encore de compte ? <Link to="/register">Créer un compte</Link></p>
    </AuthForm>
  )
}

function AuthForm({
  title, submitLabel, form, setForm, error, submitting, onSubmit, children, register = false, disabled = false,
}) {
  const reduceMotion = useReducedMotion()

  return (
    <section className="auth-page">
      <motion.div
        className="auth-card"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <aside className="auth-visual">
          <Link className="auth-brand" to="/">
            <span className="brand-mark" aria-hidden="true">V</span>
            <span className="brand-text">VAPE <span>MARKET</span></span>
          </Link>
          <div className="auth-visual-copy">
            <span className="eyebrow">Votre espace personnel</span>
            <h2>Une expérience d’achat qui vous ressemble.</h2>
            <p>Retrouvez vos informations, vos adresses et l’historique de vos commandes en un seul endroit.</p>
          </div>
          <ul className="auth-features">
            <li>
              <span aria-hidden="true">01</span>
              Suivi de commande simplifié
            </li>
            <li>
              <span aria-hidden="true">02</span>
              Informations de livraison centralisées
            </li>
            <li>
              <span aria-hidden="true">03</span>
              Accès rapide à votre historique
            </li>
          </ul>
          <span className="auth-visual-glow" aria-hidden="true" />
        </aside>

        <div className="auth-content">
          <span className="eyebrow eyebrow-dark">{register ? 'Nouveau compte' : 'Bon retour'}</span>
          <h1>{title}</h1>
          <p className="auth-subtitle">
            {register
              ? 'Créez votre compte en quelques secondes pour profiter d’une expérience personnalisée.'
              : 'Connectez-vous pour retrouver votre compte et poursuivre votre parcours.'}
          </p>

          <form className="account-form auth-form" onSubmit={onSubmit}>
            {register && (
              <label>
                Nom complet
                <input
                  required
                  autoComplete="name"
                  placeholder="Votre nom"
                  value={form.full_name}
                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="vous@exemple.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                required
                minLength="8"
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder="8 caractères minimum"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>
            {error && <p className="form-message is-error" role="alert">{error}</p>}
            <button className="button button-block" disabled={submitting || disabled}>
              {submitting ? 'Chargement…' : submitLabel}
            </button>
          </form>
          <div className="auth-switch">{children}</div>
        </div>
      </motion.div>
    </section>
  )
}

export { AuthForm }
export default LoginPage
