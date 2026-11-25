import { currentUserId, pick, run, supabase } from './db.js'

const ADDRESS_FIELDS = ['label', 'recipient_name', 'phone', 'governorate', 'city', 'address_line', 'postal_code', 'is_default']

async function requireUserId() {
  const userId = await currentUserId()
  if (!userId) throw Object.assign(new Error('Veuillez vous connecter.'), { status: 401 })
  return userId
}

function wait(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}

/** The profile row is created by a trigger at sign-up: retry briefly. */
export async function getProfile() {
  const userId = await requireUserId()
  for (const delay of [0, 300, 700]) {
    if (delay) await wait(delay)
    const profile = await run(
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      'Impossible de charger le profil.',
    )
    if (profile) return profile
  }
  throw Object.assign(new Error('Profil introuvable.'), { status: 404 })
}

// Role changes are blocked in the database (profiles_role_protection).
export async function updateProfile(payload) {
  const userId = await requireUserId()
  const data = await run(
    supabase.from('profiles').update(pick(payload, ['full_name', 'phone'])).eq('id', userId).select().single(),
    'Impossible de mettre à jour le profil.',
  )
  return { data }
}

export async function getAddresses() {
  await requireUserId()
  const data = await run(
    supabase.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at'),
    'Impossible de charger les adresses.',
  )
  return { data }
}

export async function createAddress(payload) {
  const userId = await requireUserId()
  const data = await run(
    supabase.from('addresses').insert({ ...pick(payload, ADDRESS_FIELDS), profile_id: userId }).select().single(),
    'Impossible d’enregistrer l’adresse.',
  )
  return { data }
}

export async function updateAddress(id, payload) {
  await requireUserId()
  const data = await run(
    supabase.from('addresses').update(pick(payload, ADDRESS_FIELDS)).eq('id', id).select().single(),
    'Impossible de modifier l’adresse.',
  )
  return { data }
}

export async function deleteAddress(id) {
  await requireUserId()
  await run(supabase.from('addresses').delete().eq('id', id), 'Impossible de supprimer l’adresse.')
  return null
}

export async function getOrders() {
  const userId = await requireUserId()
  const data = await run(
    supabase.from('orders').select('*, order_items(*)').eq('profile_id', userId)
      .order('created_at', { ascending: false }).limit(100),
    'Impossible de charger vos commandes.',
  )
  return { data }
}
