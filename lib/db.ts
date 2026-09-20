import { supabaseAdmin } from '@/lib/supabase-admin';

export async function dbAvailable() {
  const { error } = await supabaseAdmin.from('categories').select('id').limit(1);
  return !error;
}

export async function ensureDatabase() {
  // Supabase schema is managed from the dashboard SQL editor.
  // This function intentionally avoids destructive schema changes.
  return dbAvailable();
}
