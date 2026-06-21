import { LayoutDashboard, Car, CalendarCheck, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { requireDashboardAccess } from '@/lib/auth-server';
import { getMyBookings } from '@/actions/bookings';
import BookingCard from '@/components/bookings/booking-card';

export default async function RenterDashboardPage() {
  const { user, displayName } = await requireDashboardAccess('renter');

  const allBookings = await getMyBookings();

  const activeBookings = allBookings.filter((b) =>
    ['pending', 'confirmed', 'paid', 'in_delivery', 'active', 'returning'].includes(b.status)
  );
  const completedBookings = allBookings.filter((b) => b.status === 'completed');
  const pendingBookings = allBookings.filter((b) => b.status === 'pending');
  const recentBookings = allBookings.slice(0, 3); // 3 terbaru

  return (
    <>
      {/* Header */}
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

      {/* Alert: ada booking pending yang menunggu konfirmasi owner */}
      {pendingBookings.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <Clock className="h-5 w-5 shrink-0 text-warning mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {pendingBookings.length} Booking Menunggu Konfirmasi Pemilik
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Booking Anda sedang ditinjau oleh pemilik kendaraan. Anda akan dinotifikasi setelah dikonfirmasi.
            </p>
          </div>
          <Link
            href="/bookings?status=pending"
            className="shrink-0 text-xs text-primary hover:underline"
          >
            Lihat →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-card-muted p-2 text-primary">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">Total Booking</p>
          </div>
          <p className="mt-3 text-3xl font-bold">{allBookings.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-card-muted p-2 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">Booking Aktif</p>
          </div>
          <p className="mt-3 text-3xl font-bold">{activeBookings.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-card-muted p-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted">Selesai</p>
          </div>
          <p className="mt-3 text-3xl font-bold">{completedBookings.length}</p>
        </div>
      </div>

      {/* Booking terbaru */}
      {recentBookings.length > 0 ? (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Booking Terbaru</h2>
            <Link
              href="/bookings"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Lihat semua
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      ) : (
        /* Empty state */
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
      )}
    </>
  );
}
