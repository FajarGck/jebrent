import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDashboardPath, getDisplayName, resolveUserRole, roleFromUserMetadata } from '@/lib/auth';
import type { Profile, UserRole } from '@/types/database';
import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type SyncResult = { ok: true } | { ok: false; error: string };

/** Keep profiles.role in sync with registration metadata so RLS (get_user_role) matches the app. */
export async function syncProfileFromAuth(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<SyncResult> {
  const metadataRole = roleFromUserMetadata(user);
  if (!metadataRole) return { ok: true };

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single<{ role: UserRole; full_name: string }>();

  if (fetchError && fetchError.code !== 'PGRST116') {
    return { ok: false, error: fetchError.message };
  }

  const fullName = getDisplayName(user, profile ?? null);

  if (!profile) {
    const newProfile: Database['public']['Tables']['profiles']['Insert'] = {
      id: user.id,
      full_name: fullName,
      role: metadataRole,
      phone: null,
      emergency_phone: null,
      nik: null,
      avatar_url: null,
      is_available: true,
    };
    const { error: insertError } = await (supabase.from('profiles') as any).insert(newProfile);
    if (insertError) return { ok: false, error: insertError.message };
    return { ok: true };
  }

  if (profile.role === 'renter' && metadataRole === 'owner') {
    const roleUpdate: Database['public']['Tables']['profiles']['Update'] = { role: 'owner' };
    const { error: updateError } = await (supabase.from('profiles') as any).update(roleUpdate).eq('id', user.id);
    if (updateError) return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

export async function requireVehicleManager(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const sync = await syncProfileFromAuth(supabase, user);
  if (!sync.ok) {
    throw new Error(`Gagal sinkronisasi profil: ${sync.error}`);
  }

  const role = await resolveUserRole(supabase, user);
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('Hanya pemilik yang dapat mengelola kendaraan');
  }

  const { data: dbProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: UserRole }>();

  const dbRole = dbProfile?.role ?? roleFromUserMetadata(user);
  if (dbRole !== 'owner' && dbRole !== 'admin' && role !== 'owner' && role !== 'admin') {
    throw new Error('Role pemilik belum aktif. Silakan logout, login ulang, atau hubungi admin.');
  }

  return user;
}

export async function requireDashboardAccess(allowedRole: UserRole): Promise<{
  user: User;
  profile: Profile | null;
  role: UserRole;
  displayName: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await syncProfileFromAuth(supabase, user);
  const role = await resolveUserRole(supabase, user);
  if (role !== allowedRole && role !== 'admin') {
    redirect(getDashboardPath(role));
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  return {
    user,
    profile: profile as Profile | null,
    role,
    displayName: getDisplayName(user, profile),
  };
}
