import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDriverDeliveries } from '@/actions/delivery';
import DeliveryCard from '@/components/delivery/delivery-card';
import { LayoutDashboard, Truck, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Profile } from '@/types/database';

export default async function DriverDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const profile = data as Profile | null;
  if (!profile || profile.role !== 'driver') redirect('/dashboard');

  // Ambil semua delivery untuk driver ini
  const deliveries = await getDriverDeliveries();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDeliveries = deliveries.filter(
    (d) => d.departure_time.startsWith(todayStr)
  );
  const activeDeliveries = deliveries.filter(
    (d) => d.delivery_status === 'assigned' || d.delivery_status === 'on_the_way'
  );
  const completedDeliveries = deliveries.filter(
    (d) => d.delivery_status === 'completed'
  );

  return (
    <>
      {/* Header */}
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

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">Tugas Hari Ini</p>
          </div>
          <p className="mt-3 text-3xl font-bold">{todayDeliveries.length}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">Tugas Aktif</p>
          </div>
          <p className="mt-3 text-3xl font-bold">{activeDeliveries.length}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">Total Selesai</p>
          </div>
          <p className="mt-3 text-3xl font-bold">{completedDeliveries.length}</p>
        </div>
      </div>

      {/* Active Deliveries */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tugas Aktif</h2>
          <Link
            href="/dashboard/driver/deliveries"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Lihat semua
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {activeDeliveries.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Truck className="mx-auto h-10 w-10 text-subtle" />
            <h3 className="mt-3 font-semibold">Tidak Ada Tugas Aktif</h3>
            <p className="mt-1 text-sm text-muted">
              Tugas pengantaran akan muncul di sini saat ada pesanan baru.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeDeliveries.slice(0, 4).map((delivery) => (
              <DeliveryCard key={delivery.id} delivery={delivery} />
            ))}
          </div>
        )}
      </div>

      {/* Today's Schedule */}
      {todayDeliveries.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Jadwal Hari Ini</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {todayDeliveries.map((delivery) => (
              <DeliveryCard key={delivery.id} delivery={delivery} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
