import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import {
  createAddress, deleteAddress, getAddresses, getProfile, updateProfile,
} from '../services/accountService.js'

const emptyAddress = {
  address_type: 'home', label: '', recipient_name: '', phone: '',
  governorate: '', city: '', address_line: '', postal_code: '', is_default: false,
}

function navClassName({ isActive }) {
  return isActive ? 'is-active' : ''
}

function AccountPage({ section = 'profile' }) {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [form, setForm] = useState(emptyAddress)
  const [fullName, setFullName] = useState('')
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return undefined
    if (!user) return undefined

    let active = true
    setStatus('loading')
    setError('')

    Promise.all([getProfile(), getAddresses()])
      .then(([nextProfile, addressResponse]) => {
        if (!active) return
        setProfile(nextProfile)
        setFullName(nextProfile.full_name || user.user_metadata?.full_name || '')
        setAddresses(addressResponse.data || addressResponse || [])
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Impossible de charger votre compte.')
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [user, authLoading])

  async function saveProfile(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const response = await updateProfile({ full_name: fullName })
      const nextProfile = response?.data || response
      setProfile(nextProfile)
      setMessage('Profil mis à jour.')
    } catch (requestError) {
      setError(requestError.message || 'Échec de la mise à jour.')
    }
  }

  async function addAddress(event) {
    event.preventDefault()
    setError('')
    try {
      const response = await createAddress({ ...form, postal_code: form.postal_code || undefined })
      setAddresses([...addresses, response.data || response])
      setForm(emptyAddress)
      setMessage('Adresse ajoutée.')
    } catch (requestError) {
      setError(requestError.message || 'Échec de la création de l’adresse.')
    }
  }

  async function removeAddress(id) {
    setError('')
    try {
      await deleteAddress(id)
      setAddresses(addresses.filter((address) => address.id !== id))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  if (authLoading || status === 'loading') return <LoadingSpinner />
  if (status === 'error') return <p className="notice notice-error" role="alert">{error}</p>

  const displayName = fullName || profile?.full_name || user?.email || 'Mon compte'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <section className="account-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Mon espace</span>
          <h1>Mon compte</h1>
          <p>Gérez vos informations, vos adresses et vos commandes.</p>
        </div>
        <div className="account-identity">
          <span className="account-avatar" aria-hidden="true">{initials || 'V'}</span>
          <div>
            <strong>{displayName}</strong>
            <span>{user.email}</span>
          </div>
        </div>
      </div>

      <nav className="account-nav" aria-label="Navigation du compte">
        <NavLink to="/account" end className={navClassName}>Profil</NavLink>
        <NavLink to="/account/addresses" className={navClassName}>Adresses</NavLink>
        <NavLink to="/account/orders" className={navClassName}>Commandes</NavLink>
        {['admin', 'super_admin'].includes(profile?.role) && <NavLink to="/admin">Administration</NavLink>}
      </nav>

      {section === 'addresses' ? (
        <div className="account-panel">
          <div className="account-panel-heading">
            <div>
              <span className="eyebrow eyebrow-dark">Livraison</span>
              <h2>Mes adresses</h2>
            </div>
            <span className="count-pill">{addresses.length}</span>
          </div>

          {addresses.length === 0 ? (
            <p className="notice">Aucune adresse enregistrée pour le moment.</p>
          ) : (
            <div className="address-list">
              {addresses.map((address) => (
                <article className="address-card" key={address.id}>
                  <div className="address-card-head">
                    <strong>{address.label}</strong>
                    {address.is_default && <span className="mini-badge">Par défaut</span>}
                  </div>
                  <p>{address.recipient_name} — {address.phone}</p>
                  <p>{address.address_line}, {address.city}, {address.governorate} {address.postal_code || ''}</p>
                  <button type="button" onClick={() => removeAddress(address.id)}>Supprimer</button>
                </article>
              ))}
            </div>
          )}

          <div className="account-subsection">
            <h3>Ajouter une adresse</h3>
            <form className="account-form account-form-grid" onSubmit={addAddress}>
              {[
                ['label', 'Libellé'], ['recipient_name', 'Destinataire'], ['phone', 'Téléphone'],
                ['governorate', 'Gouvernorat'], ['city', 'Ville'], ['address_line', 'Adresse'],
                ['postal_code', 'Code postal'],
              ].map(([field, label]) => (
                <label key={field}>{label}
                  <input required={field !== 'postal_code'} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
                </label>
              ))}
              <label className="checkbox-field">
                <input type="checkbox" checked={form.is_default} onChange={(event) => setForm({ ...form, is_default: event.target.checked })} />
                Adresse par défaut
              </label>
              <button className="button">Ajouter l’adresse</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="account-panel account-profile-panel">
          <div className="account-panel-heading">
            <div>
              <span className="eyebrow eyebrow-dark">Informations</span>
              <h2>Profil</h2>
            </div>
          </div>
          <form className="account-form" onSubmit={saveProfile}>
            <p className="account-email">{user.email}</p>
            <label>Nom complet<input value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
            <button className="button">Enregistrer</button>
          </form>
        </div>
      )}

      {message && <p className="form-message is-success" role="status">{message}</p>}
      {error && <p className="form-message is-error" role="alert">{error}</p>}
    </section>
  )
}

export default AccountPage
