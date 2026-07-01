'use client';

import Link from 'next/link';
import { Car, Calendar, MapPin, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BookingStatusBadge } from './booking-status';
import type { BookingWithVehicle } from '@/types/database';

type BookingCardProps = {
  booking: BookingWithVehicle;
};

export default function BookingCard({ booking }: BookingCardProps) {
  const vehicle = booking.vehicles;
  const primaryImage = vehicle?.vehicle_images?.find((img) => img.is_primary) ?? vehicle?.vehicle_images?.[0];

  const days = Math.max(1, Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-border-hover hover:shadow-md sm:flex-row"
    >
      <div className="relative h-36 w-full shrink-0 sm:h-auto sm:w-36">
        {primaryImage ? (
          <img src={primaryImage.image_url} alt={`${vehicle.brand} ${vehicle.model}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-card-muted">
            <Car className="h-10 w-10 text-subtle" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold leading-tight">
                {vehicle.brand} {vehicle.model}
              </p>
              <p className="mt-0.5 text-xs text-muted">{vehicle.plate_number}</p>
            </div>
            <BookingStatusBadge status={booking.status} size="sm" />
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>
              {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
            </span>
            <span className="rounded-full bg-card-muted px-2 py-0.5 text-xs">{days} hari</span>
          </div>

          {booking.delivery_address && (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{booking.delivery_address}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Total</p>
            <p className="font-bold text-primary">{formatCurrency(booking.total_price)}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-subtle transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
