import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LayoutDashboard, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Profile } from '@/types/database';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const profile = data as Profile | null;
  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard Admin</h1>
            <p className="text-sm text-muted">Selamat datang, {profile.full_name}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Pengguna', value: '—' },
          { label: 'Total Kendaraan', value: '—' },
          { label: 'Pemesanan Aktif', value: '—' },
          { label: 'Pendapatan', value: '—' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/dashboard/owner"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-xl"
        >
          Dashboard Owner
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
