import { notFound } from 'next/navigation';
import { getVehicleById } from '@/lib/db/vehicles';
import { formatCurrency } from '@/lib/utils';
import { VEHICLE_TYPE_LABELS, VEHICLE_STATUS_LABELS } from '@/lib/constants';
import { Car, Calendar, Gauge, Palette, Hash, User, Clock, Star } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { VehicleDetailGallery } from '@/components/vehicles/vehicle-detail-galery';
import { createClient } from '@/lib/supabase/server';
import { resolveUserRole } from '@/lib/auth';
import { ReviewList } from '@/components/reviews/review-list';
import { getReviewsByVehicle } from '@/lib/db/reviews';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) return { title: 'Kendaraan Tidak Ditemukan' };
  return { title: `${vehicle.brand} ${vehicle.model}` };
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-success/10 text-success',
  rented: 'bg-warning/10 text-warning',
  maintenance: 'bg-danger/10 text-danger',
  inactive: 'bg-card-muted text-subtle',
};

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user ? await resolveUserRole(supabase, user) : null;

  const images =
    vehicle.vehicle_images?.sort((a, b) => {
      if (a.is_primary) return -1;
      if (b.is_primary) return 1;
      return a.sort_order - b.sort_order;
    }) ?? [];

  const specs = [
    { icon: Hash, label: 'Plat Nomor', value: vehicle.plate_number },
    { icon: Car, label: 'Tipe', value: VEHICLE_TYPE_LABELS[vehicle.type] },
    { icon: Calendar, label: 'Tahun', value: vehicle.year.toString() },
    { icon: Palette, label: 'Warna', value: vehicle.color },
    { icon: Gauge, label: 'Kilometer', value: `${vehicle.mileage.toLocaleString('id-ID')} km` },
  ];

  const reviews = await getReviewsByVehicle(id);
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/vehicles" className="text-sm text-muted transition-colors hover:text-primary">
          ← Kembali ke daftar
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* === LEFT COLUMN === */}
        <div className="space-y-6">
          {images.length > 0 ? (
            <VehicleDetailGallery images={images} vehicleName={`${vehicle.brand} ${vehicle.model}`} />
          ) : (
            <div className="flex aspect-16/10 items-center justify-center rounded-2xl border border-border bg-card-muted">
              <Car className="h-16 w-16 text-subtle" />
            </div>
          )}

          {vehicle.description && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-3 text-lg font-semibold">Deskripsi</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{vehicle.description}</p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Spesifikasi</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {specs.map((spec) => (
                <div key={spec.label} className="flex items-center gap-3">
                  <div className="rounded-lg bg-card-muted p-2 text-muted">
                    <spec.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted">{spec.label}</p>
                    <p className="text-sm font-medium">{spec.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================
           *  REVIEW SECTION — Dev B's territory
           *  ============================================================ */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-warning fill-warning" />
              <h2 className="text-lg font-semibold">Ulasan</h2>
              {avgRating && (
                <span className="text-sm text-muted">
                  ({avgRating} / 5.0 dari {reviews.length} ulasan)
                </span>
              )}
            </div>
            <ReviewList reviews={reviews} />
          </div>
        </div>

        {/* === RIGHT COLUMN === */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  {vehicle.brand} {vehicle.model}
                </h1>
                <p className="mt-1 text-sm text-muted">
                  {vehicle.year} • {vehicle.color}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[vehicle.status]}`}>{VEHICLE_STATUS_LABELS[vehicle.status]}</span>
            </div>

            <div className="mt-6 space-y-3 rounded-xl bg-card-muted p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Clock className="h-4 w-4" />
                  Per 12 Jam
                </div>
                <span className="font-bold">{formatCurrency(vehicle.half_day_rate)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Calendar className="h-4 w-4" />
                  Per Hari
                </div>
                <span className="text-xl font-bold text-primary">{formatCurrency(vehicle.daily_rate)}</span>
              </div>
              {vehicle.weekly_rate && (
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Calendar className="h-4 w-4" />
                    Per Minggu
                  </div>
                  <span className="font-bold">{formatCurrency(vehicle.weekly_rate)}</span>
                </div>
              )}
            </div>

            {/* ============================================================
             *  BOOKING BUTTON — Dev A's territory
             *  Links to /vehicles/[id]/booking where Dev A builds the form
             *  ============================================================ */}
            {vehicle.status === 'available' && role !== 'owner' && role !== 'admin' && (
              <Link
                href={`/vehicles/${vehicle.id}/booking`}
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-xl"
              >
                Sewa Kendaraan Ini
              </Link>
            )}
          </div>

          {vehicle.profiles && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-3 text-sm font-semibold text-muted">Pemilik</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <p className="font-medium">{vehicle.profiles.full_name}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
