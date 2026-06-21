import { notFound, redirect } from 'next/navigation';
import { getVehicleById } from '@/lib/db/vehicles';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { Car, ArrowLeft, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import BookingForm from '@/components/bookings/booking-form';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) return { title: 'Kendaraan Tidak Ditemukan' };
  return {
    title: `Booking ${vehicle.brand} ${vehicle.model} — Jebrent`,
    description: `Sewa ${vehicle.brand} ${vehicle.model} mulai dari ${formatCurrency(vehicle.daily_rate)} per hari`,
  };
}

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Auth check: harus login untuk booking
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/vehicles/${id}/booking`);
  }

  // Ambil data kendaraan
  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();
  if (vehicle.status !== 'available') {
    redirect(`/vehicles/${id}`);
  }

  const primaryImage = vehicle.vehicle_images?.find((img) => img.is_primary) ?? vehicle.vehicle_images?.[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href={`/vehicles/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke detail kendaraan
        </Link>
      </div>

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Buat Booking</h1>
        <p className="mt-1 text-sm text-muted">Lengkapi informasi di bawah untuk memesan kendaraan</p>
      </div>

      {/* Vehicle Summary Card */}
      <div className="mb-8 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {primaryImage ? (
          <img
            src={primaryImage.image_url}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="h-20 w-28 flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-28 flex-shrink-0 items-center justify-center rounded-xl bg-card-muted">
            <Car className="h-8 w-8 text-subtle" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">
            {vehicle.brand} {vehicle.model}
          </h2>
          <p className="text-sm text-muted">
            {vehicle.year} • {vehicle.color} • {vehicle.plate_number}
          </p>
          {/* Tarif singkat */}
          <div className="mt-2 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3.5 w-3.5" />
              Per 12 jam:{' '}
              <strong className="text-foreground">{formatCurrency(vehicle.half_day_rate)}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Calendar className="h-3.5 w-3.5" />
              Per hari:{' '}
              <strong className="text-primary">{formatCurrency(vehicle.daily_rate)}</strong>
            </span>
            {vehicle.weekly_rate && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Calendar className="h-3.5 w-3.5" />
                Per minggu:{' '}
                <strong className="text-foreground">{formatCurrency(vehicle.weekly_rate)}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <BookingForm vehicle={vehicle} />
    </div>
  );
}
