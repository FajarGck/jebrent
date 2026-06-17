'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDashboardPath, isGenericDashboardPath, resolveUserRole } from '@/lib/auth';
import { syncProfileFromAuth } from '@/lib/auth-server';
import type { UserRole } from '@/types/database';

export type AuthResult = {
  error?: string;
  success?: boolean;
  role?: UserRole;
};

export async function register(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;
  const role = (formData.get('role') as UserRole) || 'renter';
  const phone = formData.get('phone') as string | null;

  if (!email || !password || !fullName) {
    return { error: 'Email, password, dan nama lengkap wajib diisi' };
  }

  if (password.length < 6) {
    return { error: 'Password minimal 6 karakter' };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role, phone },
    },
  });

  if (error) return { error: error.message };

  return { success: true };
}

export async function login(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const customRedirect = (formData.get('redirect') as string) || null;

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi' };
  }

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: 'Login gagal, coba lagi' };

  await syncProfileFromAuth(supabase, data.user);
  const role = await resolveUserRole(supabase, data.user);
  const destination =
    customRedirect && !isGenericDashboardPath(customRedirect) ? customRedirect : getDashboardPath(role);

  redirect(destination);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
