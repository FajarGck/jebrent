'use client';
// src/components/bookings/owner-booking-action.tsx
// Tombol konfirmasi/tolak booking untuk owner — Dev A ONLY
// Ini Client Component agar bisa pakai useTransition

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmBooking, cancelBooking } from '@/actions/bookings';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import type { BookingStatus } from '@/types/database';

type Props = {
  bookingId: string;
  status: BookingStatus;
};

export default function OwnerBookingAction({ bookingId, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<'confirm' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'pending') return null;

  async function handle(action: 'confirm' | 'cancel') {
    setError(null);
    setActiveAction(action);
    startTransition(async () => {
      const result = action === 'confirm'
        ? await confirmBooking(bookingId)
        : await cancelBooking(bookingId);

      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
      setActiveAction(null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => handle('confirm')}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary-hover disabled:opacity-50"
        >
          {activeAction === 'confirm' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Konfirmasi
        </button>
        <button
          onClick={() => handle('cancel')}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs font-semibold text-danger transition-all hover:bg-danger/10 disabled:opacity-50"
        >
          {activeAction === 'cancel' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          Tolak
        </button>
      </div>
    </div>
  );
}
