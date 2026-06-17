import { LayoutDashboard, Car, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { requireDashboardAccess } from '@/lib/auth-server';

export default async function RenterDashboardPage() {
  const { displayName } = await requireDashboardAccess('renter');

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard Penyewa</h1>
            <p className="text-sm text-muted">Selamat datang, {displayName}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-card-muted p-2 text-primary">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">Total Booking</p>
          </div>
          <p className="mt-3 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-card-muted p-2 text-success">
              <Car className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">Booking Aktif</p>
          </div>
          <p className="mt-3 text-3xl font-bold">0</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Car className="mx-auto h-12 w-12 text-subtle" />
          <h3 className="mt-4 text-lg font-semibold">Cari Kendaraan</h3>
          <p className="mt-2 text-sm text-muted">Temukan kendaraan yang sesuai kebutuhan Anda.</p>
          <Link
            href="/vehicles"
            className="mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
          >
            Lihat Kendaraan
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <CalendarCheck className="mx-auto h-12 w-12 text-subtle" />
          <h3 className="mt-4 text-lg font-semibold">Riwayat Booking</h3>
          <p className="mt-2 text-sm text-muted">Belum ada booking. Mulai sewa kendaraan sekarang!</p>
        </div>
      </div>
    </>
  );
}
