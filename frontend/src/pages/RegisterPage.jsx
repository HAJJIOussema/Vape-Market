import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/authService.js'
import { AuthForm } from './LoginPage.jsx'
import { useAuth } from '../context/useAuth.js'

function RegisterPage() {
  const navigate = useNavigate()
  const { user, loading, configured, configError } = useAuth()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate('/account', { replace: true })
  }, [loading, user, navigate])

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setInfo('')
    try {
      const { error: requestError, data } = await register(form)
      if (requestError) {
        setError(requestError.message)
        return
      }
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError('Un compte existe déjà avec cette adresse email.')
        return
      }
      if (data?.session) return
      setInfo('Compte créé. Vérifiez votre adresse email pour confirmer l’inscription, puis connectez-vous.')
    } catch (requestError) {
      setError(requestError.message || 'Impossible de créer le compte.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthForm
      title="Créer un compte"
      submitLabel="Créer mon compte"
      form={form}
      setForm={setForm}
      error={error || (!configured ? configError : '')}
      submitting={submitting || loading}
      onSubmit={submit}
      register
      disabled={!configured}
    >
      {info && <p role="status">{info}</p>}
      <p>Déjà inscrit ? <Link to="/login">Se connecter</Link></p>
    </AuthForm>
  )
}

export default RegisterPage
