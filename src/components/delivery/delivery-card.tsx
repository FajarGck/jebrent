'use client';
// src/components/delivery/delivery-card.tsx
// Card info pengantaran untuk driver dashboard — Dev A ONLY

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateDeliveryStatus } from '@/actions/delivery';
import { DeliveryStatusBadge } from './delivery-status';
import { formatDate } from '@/lib/utils';
import {
  Car,
  Calendar,
  MapPin,
  Phone,
  Loader2,
  Navigation,
  CheckCircle2,
} from 'lucide-react';
import type { DeliveryWithDetails } from '@/types/database';

type DeliveryCardProps = {
  delivery: DeliveryWithDetails;
};

export default function DeliveryCard({ delivery }: DeliveryCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const booking = delivery.bookings;
  const vehicle = booking?.vehicles;
  const renter = booking?.profiles;

  async function handleUpdateStatus(newStatus: 'on_the_way' | 'delivered' | 'completed') {
    setError(null);
    startTransition(async () => {
      const result = await updateDeliveryStatus({
        deliveryId: delivery.id,
        status: newStatus,
      });
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Header: kendaraan + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">
              {vehicle?.brand} {vehicle?.model}
            </p>
            <p className="text-xs text-muted">{vehicle?.plate_number}</p>
          </div>
        </div>
        <DeliveryStatusBadge status={delivery.delivery_status} size="sm" />
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            Jadwal:{' '}
            <strong className="text-foreground">
              {new Date(delivery.departure_time).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </strong>
          </span>
        </div>

        {booking?.delivery_address && (
          <div className="flex items-start gap-2 text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{booking.delivery_address}</span>
          </div>
        )}

        {renter && (
          <div className="flex items-center gap-2 text-muted">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>
              {renter.full_name}
              {renter.phone && ` • ${renter.phone}`}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-muted">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            Sewa: {formatDate(booking?.start_date ?? '')} —{' '}
            {formatDate(booking?.end_date ?? '')}
          </span>
        </div>
      </div>

      {delivery.notes && (
        <p className="rounded-xl bg-card-muted px-3 py-2 text-xs text-muted">
          📝 {delivery.notes}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {delivery.delivery_status === 'assigned' && (
          <button
            onClick={() => handleUpdateStatus('on_the_way')}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Navigation className="h-3.5 w-3.5" />
            )}
            Mulai Pengantaran
          </button>
        )}

        {delivery.delivery_status === 'on_the_way' && (
          <button
            onClick={() => handleUpdateStatus('delivered')}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-success px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Tandai Terkirim
          </button>
        )}

        {delivery.delivery_status === 'delivered' && (
          <button
            onClick={() => handleUpdateStatus('completed')}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-xs font-semibold text-success transition-all hover:bg-success/20 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Selesaikan Tugas
          </button>
        )}
      </div>
    </div>
  );
}
