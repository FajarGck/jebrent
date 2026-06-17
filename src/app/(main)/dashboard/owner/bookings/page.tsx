import { requireDashboardAccess } from '@/lib/auth-server';
import { getOwnerBookings } from '@/actions/bookings';
import { getBookingsByOwner } from '@/lib/db/bookings';
import { BookingStatusBadge } from '@/components/bookings/booking-status';
import OwnerBookingAction from '@/components/bookings/owner-booking-action';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CalendarCheck,
  Car,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { BookingStatus, BookingWithVehicle } from '@/types/database';

export const metadata: Metadata = {
  title: 'Pesanan Masuk — Dashboard Pemilik | Jebrent',
};

const STATUS_FILTERS: { label: string; value: BookingStatus | 'all' }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Menunggu Konfirmasi', value: 'pending' },
  { label: 'Dikonfirmasi', value: 'confirmed' },
  { label: 'Dibayar', value: 'paid' },
  { label: 'Aktif', value: 'active' },
  { label: 'Selesai', value: 'completed' },
  { label: 'Dibatalkan', value: 'cancelled' },
];

// ==============================================================
// Summary Card
// ==============================================================
function SummaryCard({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-card-muted p-2 ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm text-muted">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

// ==============================================================
// Booking Row
// ==============================================================
function BookingRow({ booking }: { booking: BookingWithVehicle }) {
  const vehicle = booking.vehicles;
  const primaryImage =
    vehicle?.vehicle_images?.find((img) => img.is_primary) ??
    vehicle?.vehicle_images?.[0];

  const days = Math.max(
    1,
    Math.ceil(
      (new Date(booking.end_date).getTime() -
        new Date(booking.start_date).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const renter = booking.profiles;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      {/* Thumbnail */}
      <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl">
        {primaryImage ? (
          <img
            src={primaryImage.image_url}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-card-muted">
            <Car className="h-6 w-6 text-subtle" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">
            {vehicle.brand} {vehicle.model}
          </p>
          <BookingStatusBadge status={booking.status} size="sm" />
          {booking.status === 'pending' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
              <Clock className="h-3 w-3" />
              Butuh Konfirmasi
            </span>
          )}
        </div>
        <p className="text-xs text-muted">
          Penyewa: <span className="font-medium text-foreground">{renter?.full_name ?? '—'}</span>
        </p>
        <p className="text-xs text-muted">
          {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
          <span className="ml-1.5 rounded-full bg-card-muted px-2 py-0.5">
            {days} hari
          </span>
        </p>
      </div>

      {/* Harga */}
      <div className="shrink-0 text-right">
        <p className="text-xs text-muted">Total</p>
        <p className="font-bold text-primary">{formatCurrency(booking.total_price)}</p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <OwnerBookingAction bookingId={booking.id} status={booking.status} />
        <Link
          href={`/bookings/${booking.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-primary"
        >
          Lihat detail
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ==============================================================
// Page
// ==============================================================
export default async function OwnerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { user } = await requireDashboardAccess('owner');
  const { status: statusParam } = await searchParams;
  const activeFilter = (statusParam ?? 'all') as BookingStatus | 'all';

  // Ambil semua booking untuk kendaraan milik owner ini
  const allBookings = await getBookingsByOwner(user.id);

  // Filter lokal
  const filtered =
    activeFilter === 'all'
      ? allBookings
      : allBookings.filter((b) => b.status === activeFilter);

  // Stats
  const pendingCount = allBookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = allBookings.filter((b) =>
    ['confirmed', 'paid', 'in_delivery', 'active'].includes(b.status)
  ).length;
  const completedCount = allBookings.filter((b) => b.status === 'completed').length;
  const cancelledCount = allBookings.filter((b) => b.status === 'cancelled').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/owner"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Pesanan Masuk</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola booking untuk semua kendaraan Anda
        </p>
      </div>

      {/* Alert: ada pending */}
      {pendingCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">
              {pendingCount} Booking Menunggu Konfirmasi Anda
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Konfirmasi atau tolak booking agar penyewa bisa melanjutkan pembayaran.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Clock}
          label="Menunggu"
          value={pendingCount}
          colorClass="text-warning"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Aktif"
          value={confirmedCount}
          colorClass="text-primary"
        />
        <SummaryCard
          icon={CalendarCheck}
          label="Selesai"
          value={completedCount}
          colorClass="text-success"
        />
        <SummaryCard
          icon={XCircle}
          label="Dibatalkan"
          value={cancelledCount}
          colorClass="text-danger"
        />
      </div>

      {/* Filter Tabs */}
      {allBookings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ label, value }) => {
            const count =
              value === 'all'
                ? allBookings.length
                : allBookings.filter((b) => b.status === value).length;
            if (value !== 'all' && count === 0) return null;

            return (
              <Link
                key={value}
                href={
                  value === 'all'
                    ? '/dashboard/owner/bookings'
                    : `/dashboard/owner/bookings?status=${value}`
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted hover:border-border-hover hover:text-foreground'
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    activeFilter === value ? 'bg-primary/20' : 'bg-card-muted'
                  }`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <CalendarCheck className="mx-auto h-12 w-12 text-subtle" />
          <h2 className="mt-4 text-lg font-semibold">
            {activeFilter === 'all' ? 'Belum Ada Pesanan' : 'Tidak Ada Pesanan dengan Status Ini'}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {activeFilter === 'all'
              ? 'Pesanan akan muncul di sini setelah ada penyewa yang booking kendaraan Anda.'
              : 'Coba filter status yang lain.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
