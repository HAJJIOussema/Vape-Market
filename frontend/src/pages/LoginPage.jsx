import { useEffect, useState } from 'react'
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
  return (
    <section className="auth-page">
      <h1>{title}</h1>
      <form onSubmit={onSubmit}>
        {register && (
          <label>
            Nom complet
            <input
              required
              autoComplete="name"
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
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="button" disabled={submitting || disabled}>
          {submitting ? 'Chargement...' : submitLabel}
        </button>
      </form>
      {children}
    </section>
  )
}

export { AuthForm }
export default LoginPage
