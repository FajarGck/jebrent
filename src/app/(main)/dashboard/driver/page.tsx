import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LayoutDashboard, Truck, Clock } from 'lucide-react';
import type { Profile } from '@/types/database';

export default async function DriverDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const profile = data as Profile | null;
  if (!profile || profile.role !== 'driver') redirect('/dashboard');

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard Pengantar</h1>
            <p className="text-sm text-muted">Selamat datang, {profile.full_name}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-card-muted p-2 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">Tugas Hari Ini</p>
          </div>
          <p className="mt-3 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-card-muted p-2 text-success">
              <Truck className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">Total Pengantaran</p>
          </div>
          <p className="mt-3 text-3xl font-bold">0</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
        <Truck className="mx-auto h-12 w-12 text-subtle" />
        <h3 className="mt-4 text-lg font-semibold">Belum Ada Tugas</h3>
        <p className="mt-2 text-sm text-muted">Tugas pengantaran akan muncul di sini saat ada pesanan baru.</p>
      </div>
    </>
  );
}
