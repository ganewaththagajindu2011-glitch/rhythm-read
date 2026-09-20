import { supabaseAdmin } from '@/lib/supabase-admin';

export type PublisherStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';

export type PublisherProfile = {
  id: string;
  userId?: string;
  email: string;
  displayName: string;
  bio: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  website: string;
  payoutEmail: string;
  status: PublisherStatus;
  createdAt: string;
  updatedAt: string;
};

function rowToPublisher(row: any): PublisherProfile {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    email: row.email,
    displayName: row.display_name,
    bio: row.bio ?? '',
    phone: row.phone ?? '',
    country: row.country ?? '',
    city: row.city ?? '',
    address: row.address ?? '',
    website: row.website ?? '',
    payoutEmail: row.payout_email ?? row.email,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const publisherSelect = `
  id,user_id,display_name,bio,phone,country,city,address,website,payout_email,status,created_at,updated_at,
  users!publisher_profiles_user_id_fkey(email)
`;

function normalizeRow(row: any) {
  const user = Array.isArray(row.users) ? row.users[0] : row.users;
  return { ...row, email: user?.email ?? row.email ?? '' };
}

export async function getPublisherByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('publisher_profiles')
    .select(publisherSelect)
    .eq('users.email', email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToPublisher(normalizeRow(data)) : null;
}

export async function listPublishers() {
  const { data, error } = await supabaseAdmin
    .from('publisher_profiles')
    .select(publisherSelect)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToPublisher(normalizeRow(row)));
}

async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,email')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createPublisher(input: Omit<PublisherProfile, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
  const user = await getUserByEmail(input.email);
  if (!user) throw new Error('USER_NOT_FOUND');

  const { data, error } = await supabaseAdmin
    .from('publisher_profiles')
    .upsert(
      {
        user_id: user.id,
        display_name: input.displayName,
        bio: input.bio,
        phone: input.phone,
        country: input.country,
        city: input.city,
        address: input.address,
        website: input.website,
        payout_email: input.payoutEmail,
      },
      { onConflict: 'user_id' },
    )
    .select(publisherSelect)
    .single();
  if (error) throw new Error(error.message);
  return rowToPublisher(normalizeRow(data));
}

export async function updatePublisher(email: string, patch: Partial<PublisherProfile>) {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.displayName !== undefined) update.display_name = patch.displayName;
  if (patch.bio !== undefined) update.bio = patch.bio;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (patch.country !== undefined) update.country = patch.country;
  if (patch.city !== undefined) update.city = patch.city;
  if (patch.address !== undefined) update.address = patch.address;
  if (patch.website !== undefined) update.website = patch.website;
  if (patch.payoutEmail !== undefined) update.payout_email = patch.payoutEmail;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await supabaseAdmin
    .from('publisher_profiles')
    .update(update)
    .eq('user_id', user.id)
    .select(publisherSelect)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToPublisher(normalizeRow(data)) : null;
}

export async function getPublisherById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('publisher_profiles')
    .select(publisherSelect)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToPublisher(normalizeRow(data)) : null;
}
