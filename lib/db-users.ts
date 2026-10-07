import { supabaseAdmin } from '@/lib/supabase-admin';

export async function upsertUser(input: { email: string; name?: string | null; image?: string | null }) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        email: input.email,
        name: input.name ?? null,
        image: input.image ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    )
    .select('id,email,name,image,role')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,email,name,image,role')
    .eq('email', email)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
