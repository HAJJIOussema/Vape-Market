import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../services/authService.js'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const { error: requestError } = await login(form)
    if (requestError) setError(requestError.message)
    else navigate(location.state?.from || '/account', { replace: true })
    setSubmitting(false)
  }

  return <AuthForm title="Connexion" submitLabel="Se connecter" form={form} setForm={setForm} error={error} submitting={submitting} onSubmit={submit}>
    <p>Pas encore de compte ? <Link to="/register">Créer un compte</Link></p>
  </AuthForm>
}

function AuthForm({ title, submitLabel, form, setForm, error, submitting, onSubmit, children, register = false }) {
  return <section className="auth-page"><h1>{title}</h1><form onSubmit={onSubmit}>
    {register && <label>Nom complet<input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>}
    <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
    <label>Mot de passe<input type="password" required minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
    {error && <p role="alert">{error}</p>}
    <button className="button" disabled={submitting}>{submitting ? 'Chargement...' : submitLabel}</button>
  </form>{children}</section>
}

export { AuthForm }
export default LoginPage
