'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDashboardPath, isGenericDashboardPath, resolveUserRole } from '@/lib/auth';
import { syncProfileFromAuth } from '@/lib/auth-server';
import type { UserRole } from '@/types/database';
import { revalidatePath } from 'next/cache';

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

export async function createUserByAdminAction(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') return { error: 'Hanya admin yang dapat mendaftarkan pengguna baru' };

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;
  const targetRole = formData.get('role') as string;

  if (!email || !password || !fullName || !targetRole) {
    return { error: 'Semua field wajib diisi' };
  }

  if (password.length < 6) {
    return { error: 'Password minimal 6 karakter' };
  }

  const { data: newUserId, error } = await (supabase.rpc as any)('create_user_by_admin', {
    p_email: email,
    p_password: password,
    p_full_name: fullName,
    p_role: targetRole,
  });

  if (error) return { error: `Gagal mendaftarkan pengguna: ${error.message}` };

  const phone = formData.get('phone') as string | null;
  if (phone && newUserId) {
    const { error: phoneErr } = await (supabase.from('profiles') as any)
      .update({ phone: phone })
      .eq('id', newUserId);
    if (phoneErr) console.error("Gagal update phone untuk user baru:", phoneErr.message);
  }

  return { success: true };
}

export async function updateProfileAction(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const fullName = formData.get('full_name') as string;
  const phone = formData.get('phone') as string | null;
  const emergencyPhone = formData.get('emergency_phone') as string | null;
  const nik = formData.get('nik') as string | null;

  if (!fullName) {
    return { error: 'Nama lengkap wajib diisi' };
  }

  const updates: any = {
    full_name: fullName,
    phone: phone || null,
    emergency_phone: emergencyPhone || null,
    updated_at: new Date().toISOString(),
  };

  // NIK is only for renter or other roles if they supply it
  if (nik !== null) {
    updates.nik = nik || null;
    if (nik && nik.length !== 16) {
      return { error: 'NIK harus terdiri dari 16 digit angka' };
    }
  }

  // Handle KTP file upload if role is renter
  const ktpFile = formData.get('ktp_file') as File | null;
  if (ktpFile && ktpFile.size > 0) {
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_PROOF_SIZE = 5 * 1024 * 1024;

    if (!ALLOWED_IMAGE_TYPES.includes(ktpFile.type)) {
      return { error: 'Format file KTP harus JPG, PNG, atau WebP' };
    }
    if (ktpFile.size > MAX_PROOF_SIZE) {
      return { error: 'Ukuran file KTP maksimal 5MB' };
    }

    const ext = ktpFile.name.split('.').pop();
    const path = `${user.id}/ktp_${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('ktp-documents')
      .upload(path, ktpFile, { contentType: ktpFile.type, upsert: true });

    if (uploadErr) {
      return { error: `Gagal upload KTP: ${uploadErr.message}` };
    }

    const { data: urlData } = supabase.storage.from('ktp-documents').getPublicUrl(path);
    updates.ktp_url = urlData.publicUrl;
    updates.verification_status = 'pending';
  }

  const { error: updateErr } = await (supabase
    .from('profiles') as any)
    .update(updates)
    .eq('id', user.id);

  if (updateErr) {
    return { error: `Gagal memperbarui profil: ${updateErr.message}` };
  }

  // Sync auth user metadata
  await supabase.auth.updateUser({
    data: { full_name: fullName, phone }
  });

  revalidatePath('/dashboard/profile');
  return { success: true };
}

export async function verifyUserKtpAction(
  userId: string,
  status: 'verified' | 'rejected'
): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') return { error: 'Hanya admin yang dapat memverifikasi KTP' };

  const { error } = await (supabase.from('profiles') as any)
    .update({ verification_status: status, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    return { error: `Gagal mengubah status verifikasi KTP: ${error.message}` };
  }

  revalidatePath('/dashboard/admin/users');
  return { success: true };
}

export async function editUserByAdminAction(
  userId: string,
  fullName: string,
  phone: string | null
): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') return { error: 'Hanya admin yang dapat mengedit pengguna' };

  if (!fullName) return { error: 'Nama lengkap wajib diisi' };

  const { error } = await (supabase.from('profiles') as any)
    .update({
      full_name: fullName,
      phone: phone || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) return { error: `Gagal mengupdate profil: ${error.message}` };

  revalidatePath('/dashboard/admin/users');
  return { success: true };
}

export async function deleteUserByAdminAction(userId: string): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') return { error: 'Hanya admin yang dapat menghapus pengguna' };

  const { error } = await (supabase.rpc as any)('delete_user_by_admin', {
    p_user_id: userId
  });

  if (error) return { error: `Gagal menghapus pengguna: ${error.message}` };

  revalidatePath('/dashboard/admin/users');
  return { success: true };
}
