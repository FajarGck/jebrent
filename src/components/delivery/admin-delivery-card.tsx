'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminCompleteDelivery } from '@/actions/delivery';
import { DeliveryStatusBadge } from './delivery-status';
import { formatDate } from '@/lib/utils';
import {
  Car,
  Calendar,
  MapPin,
  Phone,
  User,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { DeliveryWithDetails } from '@/types/database';

type AdminDeliveryCardProps = {
  delivery: DeliveryWithDetails;
};

export default function AdminDeliveryCard({ delivery }: AdminDeliveryCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const booking = delivery.bookings;
  const vehicle = booking?.vehicles;
  const renter = booking?.profiles;
  const driver = delivery.profiles;

  function handleMarkDelivered() {
    setError(null);
    startTransition(async () => {
      const result = await adminCompleteDelivery(delivery.id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header */}
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
              <User className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                Penyewa: <strong className="text-foreground">{renter.full_name}</strong>
                {renter.phone && ` • ${renter.phone}`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted">
            <User className="h-3.5 w-3.5 shrink-0 text-success" />
            <span>
              Driver:{' '}
              {driver ? (
                <strong className="text-foreground">
                  {driver.full_name}
                  {driver.phone && ` (${driver.phone})`}
                </strong>
              ) : (
                <span className="text-subtle font-italic">Belum ditugaskan</span>
              )}
            </span>
          </div>

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

        {/* Bukti pengantaran (jika sudah diupload) */}
        {delivery.proof_image_url && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted">Bukti Pengantaran</p>
            <img
              src={delivery.proof_image_url}
              alt="Bukti pengantaran"
              className="max-h-36 w-full rounded-xl border border-border object-contain bg-white"
            />
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {/* Actions */}
      <div className="border-t border-border pt-4">
        {delivery.delivery_status !== 'delivered' && delivery.delivery_status !== 'completed' ? (
          <button
            onClick={handleMarkDelivered}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-success px-4 py-2.5 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Tandai Sudah Diantar
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-success/5 border border-success/20 px-3 py-2 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Pengantaran selesai
            {delivery.completed_at && (
              <span className="text-success/70">
                • {new Date(delivery.completed_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
