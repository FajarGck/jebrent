import { LayoutDashboard, Car, CheckCircle, AlertTriangle, CalendarCheck } from 'lucide-react';
import { getOwnerVehicleCount, getOwnerVehicleCountByStatus } from '@/lib/db/vehicles';
import { getBookingsByOwner } from '@/lib/db/bookings';
import { requireDashboardAccess } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import OwnerRevenueChart from '@/components/dashboard/owner-revenue-chart';

export default async function OwnerDashboardPage() {
  const { user, displayName } = await requireDashboardAccess('owner');
  const supabase = await createClient();

  const [total, available, rented, allBookings] = await Promise.all([
    getOwnerVehicleCount(user.id),
    getOwnerVehicleCountByStatus(user.id, 'available'),
    getOwnerVehicleCountByStatus(user.id, 'rented'),
    getBookingsByOwner(user.id),
  ]);

  const activeBookings = allBookings.filter((b) =>
    ['confirmed', 'paid', 'in_delivery', 'active'].includes(b.status)
  );

  const stats = [
    { label: 'Kendaraan Saya', value: total.toString(), icon: Car, color: 'text-primary' },
    { label: 'Tersedia', value: available.toString(), icon: CheckCircle, color: 'text-success' },
    { label: 'Sedang Disewa', value: rented.toString(), icon: AlertTriangle, color: 'text-warning' },
    { label: 'Pesanan Aktif', value: activeBookings.length.toString(), icon: CalendarCheck, color: 'text-accent' },
  ];

  // Query confirmed payments for owner's vehicles
  const { data: rawPayments } = await (supabase
    .from('payments')
    .select(`
      id,
      amount,
      status,
      payment_type,
      paid_at,
      created_at,
      bookings!inner (
        id,
        vehicle_id,
        vehicles!inner (
          id,
          brand,
          model,
          owner_id
        )
      )
    `) as any)
    .eq('status', 'confirmed')
    .eq('bookings.vehicles.owner_id', user.id);

  const formattedPayments = (rawPayments ?? []).map((p: any) => ({
    id: p.id,
    amount: Number(p.amount),
    payment_type: p.payment_type || 'dp',
    paid_at: p.paid_at || p.created_at,
    created_at: p.created_at,
    vehicleName: `${p.bookings?.vehicles?.brand} ${p.bookings?.vehicles?.model}`,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 no-print">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <LayoutDashboard className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dashboard Pemilik</h1>
          <p className="text-sm text-muted">Selamat datang, {displayName}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 no-print">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg bg-card-muted p-2 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted">{stat.label}</p>
            </div>
            <p className="mt-3 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-4 no-print">
        <Link
          href="/dashboard/owner/bookings"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover"
        >
          <CalendarCheck className="h-4 w-4" />
          Pantau Pesanan Masuk
        </Link>
        <Link
          href="/dashboard/owner/vehicles"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-card-muted"
        >
          <Car className="h-4 w-4" />
          Lihat Armada Saya
        </Link>
      </div>

      {/* Financial Line Chart Report */}
      <OwnerRevenueChart payments={formattedPayments} />
    </div>
  );
}
