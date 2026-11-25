import { run, supabase } from './db.js'

export async function getCategories() {
  const data = await run(
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order').order('name'),
    'Impossible de charger les catégories.',
  )
  return { data }
}
