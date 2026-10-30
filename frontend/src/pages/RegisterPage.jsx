import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/authService.js'
import { AuthForm } from './LoginPage.jsx'

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const { error: requestError, data } = await register(form)
    if (requestError) setError(requestError.message)
    else if (data.session) navigate('/account', { replace: true })
    else setError('Compte créé. Vérifiez votre adresse email avant de vous connecter.')
    setSubmitting(false)
  }

  return <AuthForm title="Créer un compte" submitLabel="Créer mon compte" form={form} setForm={setForm} error={error} submitting={submitting} onSubmit={submit} register>
    <p>Déjà inscrit ? <Link to="/login">Se connecter</Link></p>
  </AuthForm>
}

export default RegisterPage
