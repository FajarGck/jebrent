import { LayoutDashboard, Car, CheckCircle, AlertTriangle } from 'lucide-react';
import { getOwnerVehicleCount, getOwnerVehicleCountByStatus } from '@/lib/db/vehicles';
import { requireDashboardAccess } from '@/lib/auth-server';
import Link from 'next/link';

export default async function OwnerDashboardPage() {
  const { user, displayName } = await requireDashboardAccess('owner');

  const [total, available, rented] = await Promise.all([
    getOwnerVehicleCount(user.id),
    getOwnerVehicleCountByStatus(user.id, 'available'),
    getOwnerVehicleCountByStatus(user.id, 'rented'),
  ]);

  const stats = [
    { label: 'Kendaraan Saya', value: total.toString(), icon: Car, color: 'text-primary' },
    { label: 'Tersedia', value: available.toString(), icon: CheckCircle, color: 'text-success' },
    { label: 'Sedang Disewa', value: rented.toString(), icon: AlertTriangle, color: 'text-warning' },
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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href="/dashboard/owner/vehicles"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-card-muted"
        >
          <Car className="h-4 w-4" />
          Kelola Kendaraan
        </Link>
        <Link
          href="/dashboard/owner/vehicles/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-xl"
        >
          Tambah Kendaraan Baru
        </Link>
      </div>
    </>
  );
}
