// ============================================================
// DEV A: Booking Page for a specific vehicle
// Route: /vehicles/[id]/booking
//
// This page should contain:
// 1. Vehicle summary (name, photo, daily rate)
// 2. Booking form (date picker, delivery address, notes)
// 3. Price calculation (daily_rate × days)
// 4. Submit button that calls createBooking() from actions/bookings.ts
//
// Use types: Booking, BookingWithVehicle from @/types/database
// Use action: createBooking from @/actions/bookings
// Use data: getVehicleById from @/lib/db/vehicles
// ============================================================

import { notFound } from 'next/navigation';
import { getVehicleById } from '@/lib/db/vehicles';
import { formatCurrency } from '@/lib/utils';
import { Car, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) return { title: 'Kendaraan Tidak Ditemukan' };
  return { title: `Booking ${vehicle.brand} ${vehicle.model} — Jebrent` };
}

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();
  if (vehicle.status !== 'available') notFound();

  const primaryImage = vehicle.vehicle_images?.find((img) => img.is_primary) ?? vehicle.vehicle_images?.[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href={`/vehicles/${id}`} className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke detail kendaraan
        </Link>
      </div>

      {/* Vehicle summary card */}
      <div className="mb-8 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {primaryImage ? (
          <img
            src={primaryImage.image_url}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="h-20 w-28 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-28 items-center justify-center rounded-xl bg-card-muted">
            <Car className="h-8 w-8 text-subtle" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">{vehicle.brand} {vehicle.model}</h1>
          <p className="text-sm text-muted">{vehicle.year} • {vehicle.color} • {vehicle.plate_number}</p>
          <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(vehicle.daily_rate)}/hari</p>
        </div>
      </div>

      {/* DEV A: Replace this with <BookingForm vehicle={vehicle} /> */}
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <Car className="mx-auto h-12 w-12 text-subtle" />
        <h2 className="mt-4 text-lg font-semibold">Form Booking</h2>
        <p className="mt-2 text-sm text-muted">
          Dev A: Implementasi booking form di sini.
          <br />
          Gunakan <code className="rounded bg-card-muted px-1.5 py-0.5 text-xs">BookingForm</code> component dari{' '}
          <code className="rounded bg-card-muted px-1.5 py-0.5 text-xs">@/components/bookings/booking-form.tsx</code>
        </p>
      </div>
    </div>
  );
}
