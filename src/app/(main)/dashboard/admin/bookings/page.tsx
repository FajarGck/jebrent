import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { resolveUserRole } from '@/lib/auth';
import { BookingStatusBadge } from '@/components/bookings/booking-status';
import OwnerBookingAction from '@/components/bookings/owner-booking-action';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CalendarCheck, Car, Clock, ChevronRight, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import type { BookingStatus } from '@/types/database';

export const metadata: Metadata = {
  title: 'Kelola Pemesanan — Admin Jebrent',
  description: 'Manajemen semua transaksi pemesanan rental',
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

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') redirect('/dashboard');

  const { status: filterStatus } = await searchParams;

  // Query all bookings in the database
  const { data: rawBookings } = await (supabase
    .from('bookings')
    .select(`
      *,
      vehicles (
        brand,
        model,
        plate_number,
        vehicle_images (
          image_url,
          is_primary
        )
      ),
      profiles (
        full_name
      )
    `) as any)
    .order('created_at', { ascending: false });

  const list = (rawBookings as any[]) ?? [];
  const filtered = filterStatus && filterStatus !== 'all' ? list.filter((b) => b.status === filterStatus) : list;

  const activeTab = filterStatus || 'all';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/admin" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary mb-3">
          <ArrowLeft className="h-4 w-4" />
          Dashboard Admin
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kelola Pemesanan</h1>
            <p className="text-sm text-muted">{list.filter((b) => b.status === 'pending').length} pesanan baru menunggu konfirmasi</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {STATUS_FILTERS.map((tab) => (
          <Link
            key={tab.value}
            href={`/dashboard/admin/bookings${tab.value !== 'all' ? `?status=${tab.value}` : ''}`}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.value ? 'bg-primary text-primary-fg' : 'text-muted hover:text-foreground hover:bg-card-muted'
            }`}
          >
            {tab.label}
            {list.filter((b) => tab.value === 'all' ? true : b.status === tab.value).length > 0 && (
              <span className="ml-1.5 rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[9px]">
                {list.filter((b) => tab.value === 'all' ? true : b.status === tab.value).length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Bookings List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted">
          <CalendarCheck className="mx-auto h-10 w-10 text-subtle mb-3" />
          <p className="text-sm">Tidak ada transaksi pemesanan dalam kategori ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const vehicle = booking.vehicles;
            const primaryImage = vehicle?.vehicle_images?.find((img: any) => img.is_primary) ?? vehicle?.vehicle_images?.[0];
            const days = Math.max(1, Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24)));
            const renter = booking.profiles;

            return (
              <div key={booking.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center justify-between shadow-sm">
                <div className="flex gap-4 items-center">
                  {/* Thumbnail */}
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-card-muted">
                    {primaryImage ? (
                      <img src={primaryImage.image_url} alt={`${vehicle.brand} ${vehicle.model}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Car className="h-4 w-4 text-subtle" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm">
                        {vehicle.brand} {vehicle.model}
                      </p>
                      <BookingStatusBadge status={booking.status} size="sm" />
                      {booking.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning animate-pulse">
                          <Clock className="h-3 w-3" />
                          Butuh Konfirmasi
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      Penyewa: <span className="font-medium text-foreground">{renter?.full_name ?? '—'}</span> • Plat: <span className="font-semibold text-foreground">{vehicle.plate_number}</span>
                    </p>
                    <p className="text-[10px] text-muted">
                      Sewa: {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
                      <span className="ml-1.5 rounded-full bg-card-muted px-2 py-0.5">{days} hari</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[9px] uppercase tracking-wider text-muted font-bold">Total Harga</p>
                    <p className="font-bold text-primary text-sm">{formatCurrency(booking.total_price)}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <OwnerBookingAction bookingId={booking.id} status={booking.status} />
                    <Link href={`/bookings/${booking.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-card-muted transition-colors">
                      Detail
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
