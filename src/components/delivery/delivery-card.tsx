'use client';

import { useTransition, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateDeliveryStatus, completeDelivery } from '@/actions/delivery';
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
  Upload,
  X,
} from 'lucide-react';
import type { DeliveryWithDetails } from '@/types/database';

type DeliveryCardProps = {
  delivery: DeliveryWithDetails;
};

export default function DeliveryCard({ delivery }: DeliveryCardProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const booking = delivery.bookings;
  const vehicle = booking?.vehicles;
  const renter = booking?.profiles;

  function handleFile(f: File) {
    setError(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setError('Format file harus JPG, PNG, atau WebP');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5MB');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function removeFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  }

  function handleStartDelivery() {
    setError(null);
    startTransition(async () => {
      const result = await updateDeliveryStatus({
        deliveryId: delivery.id,
        status: 'on_the_way',
      });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleMarkDelivered() {
    if (!file) {
      setError('Upload foto bukti pengantaran terlebih dahulu');
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('delivery_id', delivery.id);
      if (vehicle?.id) formData.append('vehicle_id', vehicle.id);
      formData.append('proof_file', file);
      const result = await completeDelivery(formData);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
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

      {/* Bukti pengantaran (sudah diupload) */}
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

      {/* Actions */}
      <div className="space-y-3 border-t border-border pt-4">
        {delivery.delivery_status === 'assigned' && (
          <button
            onClick={handleStartDelivery}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
            Mulai Pengantaran
          </button>
        )}

        {delivery.delivery_status === 'on_the_way' && (
          <>
            {/* Upload foto bukti */}
            {!file ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                onClick={() => inputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <Upload className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs font-medium">Upload bukti pengantaran</p>
                  <p className="text-[10px] text-muted">JPG, PNG, WebP • Maks 5MB</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="relative">
                <img src={preview!} alt="Preview" className="max-h-36 w-full rounded-xl border border-border object-contain bg-white" />
                <button type="button" onClick={removeFile} className="absolute right-2 top-2 rounded-lg bg-white/90 p-1 text-danger shadow-sm hover:bg-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              onClick={handleMarkDelivered}
              disabled={isPending || !file}
              className="inline-flex items-center gap-1.5 rounded-xl bg-success px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Tandai Terkirim
            </button>
          </>
        )}

        {delivery.delivery_status === 'delivered' && (
          <div className="flex items-center gap-2 rounded-xl bg-success/5 border border-success/20 px-3 py-2 text-xs text-success">
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

