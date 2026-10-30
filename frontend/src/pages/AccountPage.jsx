import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import {
  createAddress, deleteAddress, getAddresses, getProfile, updateProfile,
} from '../services/accountService.js'

const emptyAddress = {
  address_type: 'home', label: '', recipient_name: '', phone: '',
  governorate: '', city: '', address_line: '', postal_code: '', is_default: false,
}

function AccountPage({ section = 'profile' }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [form, setForm] = useState(emptyAddress)
  const [fullName, setFullName] = useState('')
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getProfile(), getAddresses()])
      .then(([profileResponse, addressResponse]) => {
        const nextProfile = profileResponse.data || profileResponse
        setProfile(nextProfile)
        setFullName(nextProfile.full_name || user.user_metadata?.full_name || '')
        setAddresses(addressResponse.data || addressResponse || [])
        setStatus('ready')
      })
      .catch((requestError) => {
        setError(requestError.message || 'Impossible de charger votre compte.')
        setStatus('error')
      })
  }, [user])

  async function saveProfile(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const response = await updateProfile({ full_name: fullName })
    if (response?.success === false) setError(response.error?.message || 'Échec de la mise à jour.')
    else setMessage('Profil mis à jour.')
  }

  async function addAddress(event) {
    event.preventDefault()
    setError('')
    const response = await createAddress({ ...form, postal_code: form.postal_code || undefined })
    if (response?.success === false) {
      setError(response.error?.message || 'Échec de la création de l’adresse.')
      return
    }
    setAddresses([...addresses, response.data || response])
    setForm(emptyAddress)
    setMessage('Adresse ajoutée.')
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

  if (status === 'loading') return <p>Chargement de votre compte...</p>
  if (status === 'error') return <p role="alert">{error}</p>

  return (
    <section>
      <h1>Mon compte</h1>
      <nav className="account-nav">
        <Link to="/account">Profil</Link>
        <Link to="/account/addresses">Adresses</Link>
        <Link to="/account/orders">Commandes</Link>
      </nav>
      {section === 'addresses' ? (
        <div>
          <h2>Mes adresses</h2>
          {addresses.map((address) => (
            <article className="address-card" key={address.id}>
              <strong>{address.label}</strong>
              <p>{address.recipient_name} — {address.phone}</p>
              <p>{address.address_line}, {address.city}, {address.governorate} {address.postal_code || ''}</p>
              <button type="button" onClick={() => removeAddress(address.id)}>Supprimer</button>
            </article>
          ))}
          <h2>Ajouter une adresse</h2>
          <form className="account-form" onSubmit={addAddress}>
            {[
              ['label', 'Libellé'], ['recipient_name', 'Destinataire'], ['phone', 'Téléphone'],
              ['governorate', 'Gouvernorat'], ['city', 'Ville'], ['address_line', 'Adresse'],
              ['postal_code', 'Code postal'],
            ].map(([field, label]) => (
              <label key={field}>{label}
                <input required={field !== 'postal_code'} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
              </label>
            ))}
            <label><input type="checkbox" checked={form.is_default} onChange={(event) => setForm({ ...form, is_default: event.target.checked })} /> Adresse par défaut</label>
            <button className="button">Ajouter l’adresse</button>
          </form>
        </div>
      ) : (
        <form className="account-form" onSubmit={saveProfile}>
          <p>{profile?.email || user.email}</p>
          <label>Nom complet<input value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
          <button className="button">Enregistrer</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}

export default AccountPage
