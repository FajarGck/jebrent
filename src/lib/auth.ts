import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database, UserRole } from '@/types/database';

const VALID_ROLES: UserRole[] = ['admin', 'owner', 'renter', 'driver'];

const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  owner: '/dashboard/owner',
  renter: '/dashboard/renter',
  driver: '/dashboard/driver',
};

export function isValidRole(role: string | null | undefined): role is UserRole {
  return !!role && VALID_ROLES.includes(role as UserRole);
}

export function roleFromUserMetadata(user: User | null | undefined): UserRole | null {
  return isValidRole(user?.user_metadata?.role as string | undefined) ? (user!.user_metadata.role as UserRole) : null;
}

export function getDisplayName(user: User, profile?: { full_name?: string | null } | null): string {
  return profile?.full_name || (user.user_metadata?.full_name as string | undefined) || user.email?.split('@')[0] || 'User';
}

export async function resolveUserRole(supabase: SupabaseClient<Database>, user: User): Promise<UserRole> {
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single<{ role: UserRole }>();

  if (profile && isValidRole(profile.role)) {
    return profile.role;
  }

  return roleFromUserMetadata(user) ?? 'renter';
}

export function getDashboardPath(role?: string | null): string {
  if (role && role in ROLE_DASHBOARD_PATHS) {
    return ROLE_DASHBOARD_PATHS[role as UserRole];
  }
  return ROLE_DASHBOARD_PATHS.renter;
}

export function isGenericDashboardPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return path === '/dashboard' || path === '/dashboard/';
}
