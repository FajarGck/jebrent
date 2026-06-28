import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveUserRole } from '@/lib/auth';
import AdminUserManager from '@/components/dashboard/admin-user-manager';
import type { Profile } from '@/types/database';
import { Users } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manajemen Pengguna — Admin Jebrent',
  description: 'Manajemen hak akses pemilik dan admin baru',
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') redirect('/dashboard');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Kelola Pengguna</h1>
          <p className="text-sm text-muted">Manajemen pemilik (owner), admin baru, dan pemantauan penyewa</p>
        </div>
      </div>

      <AdminUserManager profiles={(profiles as Profile[]) ?? []} />
    </div>
  );
}
