import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyBookings } from '@/actions/bookings';
import BookingCard from '@/components/bookings/booking-card';
import { ClipboardList, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { BookingStatus } from '@/types/database';

export const metadata: Metadata = {
  title: 'Riwayat Booking — Jebrent',
  description: 'Daftar semua riwayat booking kendaraan Anda',
};

const STATUS_FILTERS: { label: string; value: BookingStatus | 'all' }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Dikonfirmasi', value: 'confirmed' },
  { label: 'Dibayar', value: 'paid' },
  { label: 'Diantar', value: 'in_delivery' },
  { label: 'Aktif', value: 'active' },
  { label: 'Selesai', value: 'completed' },
  { label: 'Dibatalkan', value: 'cancelled' },
];

export default async function RenterBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/renter/bookings');

  const { status: statusParam } = await searchParams;
  const activeFilter = (statusParam ?? 'all') as BookingStatus | 'all';

  // Ambil semua booking milik user yang login
  const allBookings = await getMyBookings();

  // Filter di client
  const filtered =
    activeFilter === 'all'
      ? allBookings
      : allBookings.filter((b) => b.status === activeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Booking</h1>
          <p className="mt-1 text-sm text-muted">
            {allBookings.length === 0
              ? 'Belum ada booking'
              : `${allBookings.length} booking`}
          </p>
        </div>
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-xl"
        >
          <Plus className="h-4 w-4" />
          Sewa Kendaraan
        </Link>
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
                href={value === 'all' ? '/dashboard/renter/bookings' : `/dashboard/renter/bookings?status=${value}`}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted hover:border-border-hover hover:text-foreground'
                }`}
              >
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                  activeFilter === value ? 'bg-primary/20' : 'bg-card-muted'
                }`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Booking List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-subtle" />
          <h2 className="mt-4 text-lg font-semibold">
            {activeFilter === 'all' ? 'Belum Ada Booking' : `Tidak Ada Booking "${STATUS_FILTERS.find(f => f.value === activeFilter)?.label}"`}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {activeFilter === 'all'
              ? 'Mulai sewa kendaraan pertama Anda sekarang.'
              : 'Coba filter status yang lain.'}
          </p>
          {activeFilter === 'all' && (
            <Link
              href="/vehicles"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Lihat Kendaraan
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
