import { LayoutDashboard, Car, CheckCircle, AlertTriangle, CalendarCheck, Clock } from 'lucide-react';
import { getOwnerVehicleCount, getOwnerVehicleCountByStatus } from '@/lib/db/vehicles';
import { getBookingsByOwner } from '@/lib/db/bookings';
import { requireDashboardAccess } from '@/lib/auth-server';
import Link from 'next/link';

export default async function OwnerDashboardPage() {
  const { user, displayName } = await requireDashboardAccess('owner');

  const [total, available, rented, allBookings] = await Promise.all([
    getOwnerVehicleCount(user.id),
    getOwnerVehicleCountByStatus(user.id, 'available'),
    getOwnerVehicleCountByStatus(user.id, 'rented'),
    getBookingsByOwner(user.id),
  ]);

  const pendingBookings = allBookings.filter((b) => b.status === 'pending');
  const activeBookings = allBookings.filter((b) =>
    ['confirmed', 'paid', 'in_delivery', 'active'].includes(b.status)
  );

  const stats = [
    { label: 'Kendaraan Saya', value: total.toString(), icon: Car, color: 'text-primary' },
    { label: 'Tersedia', value: available.toString(), icon: CheckCircle, color: 'text-success' },
    { label: 'Sedang Disewa', value: rented.toString(), icon: AlertTriangle, color: 'text-warning' },
    { label: 'Pesanan Aktif', value: activeBookings.length.toString(), icon: CalendarCheck, color: 'text-accent' },
  ];

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard Pemilik</h1>
            <p className="text-sm text-muted">Selamat datang, {displayName}</p>
          </div>
        </div>
      </div>

      {/* Alert pending bookings */}
      {pendingBookings.length > 0 && (
        <Link
          href="/dashboard/owner/bookings?status=pending"
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4 transition-colors hover:bg-warning/10"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {pendingBookings.length} Booking Menunggu Konfirmasi
              </p>
              <p className="text-xs text-muted">Klik untuk lihat dan konfirmasi pesanan masuk</p>
            </div>
          </div>
          <CalendarCheck className="h-5 w-5 text-warning shrink-0" />
        </Link>
      )}

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href="/dashboard/owner/bookings"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-xl hover:-translate-y-0.5"
        >
          <CalendarCheck className="h-4 w-4" />
          Kelola Pesanan
          {pendingBookings.length > 0 && (
            <span className="rounded-full bg-warning px-1.5 py-0.5 text-xs font-bold text-white">
              {pendingBookings.length}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/owner/vehicles"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-card-muted"
        >
          <Car className="h-4 w-4" />
          Kelola Kendaraan
        </Link>
        <Link
          href="/dashboard/owner/vehicles/new"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-card-muted"
        >
          Tambah Kendaraan
        </Link>
      </div>
    </>
  );
}
