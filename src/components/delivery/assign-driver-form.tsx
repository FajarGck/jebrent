'use client';
// src/components/delivery/assign-driver-form.tsx
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignDriver } from '@/actions/delivery';
import { Truck, Loader2, Calendar, AlertCircle } from 'lucide-react';

type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
};

type Props = {
  bookingId: string;
  drivers: Driver[];
};

export default function AssignDriverForm({ bookingId, drivers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const [driverId, setDriverId] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [notes, setNotes] = useState('');

  // Default time = besok jam 10 pagi
  const getMinTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId || !departureTime) {
      setError('Driver dan Waktu Keberangkatan harus diisi');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await assignDriver({
        bookingId,
        driverId,
        departureTime: new Date(departureTime).toISOString(),
        notes: notes || null,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.refresh(); // Akan merefresh booking-detail untuk update status dan state UI
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-border bg-card-muted p-4">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Truck className="h-4 w-4 text-primary" />
        Tugaskan Driver Pengantaran
      </h3>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Pilih Driver */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Pilih Driver <span className="text-danger">*</span>
          </label>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            required
          >
            <option value="" disabled>Pilih driver...</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} {d.phone ? `(${d.phone})` : ''}
              </option>
            ))}
          </select>
          {drivers.length === 0 && (
            <p className="mt-1 text-xs text-warning">Belum ada driver terdaftar di sistem.</p>
          )}
        </div>

        {/* Waktu Berangkat */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Waktu Keberangkatan <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="datetime-local"
              value={departureTime}
              min={getMinTime()}
              onChange={(e) => setDepartureTime(e.target.value)}
              disabled={isPending}
              required
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Catatan untuk Driver */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Catatan untuk Driver (Opsional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            placeholder="Contoh: Tolong hubungi penyewa sebelum jalan."
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={2}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending || drivers.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg shadow-md shadow-primary/20 transition-all hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Truck className="h-4 w-4" />
          )}
          Tugaskan
        </button>
      </div>
    </form>
  );
}
