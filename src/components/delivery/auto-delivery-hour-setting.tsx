'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateAutoDeliveryHour } from '@/actions/delivery';
import { Clock, Loader2, Check } from 'lucide-react';

type AutoDeliveryHourSettingProps = {
  currentHour: number;
};

export default function AutoDeliveryHourSetting({ currentHour }: AutoDeliveryHourSettingProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hour, setHour] = useState(currentHour);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSave() {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const res = await updateAutoDeliveryHour(hour);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Jam Pengantaran Otomatis</h3>
          <p className="text-xs text-muted">Jadwal pengantaran otomatis akan dibuat pada jam yang ditentukan</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={hour}
          onChange={(e) => setHour(parseInt(e.target.value, 10))}
          disabled={isPending}
          className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:border-primary focus:outline-none"
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <option key={i} value={i}>
              Pukul {i.toString().padStart(2, '0')}:00 WIB
            </option>
          ))}
        </select>

        <button
          onClick={handleSave}
          disabled={isPending || hour === currentHour}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-fg shadow-md transition-all hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : success ? (
            <Check className="h-3.5 w-3.5 text-success-fg" />
          ) : (
            'Simpan'
          )}
          {isPending ? 'Menyimpan...' : success ? 'Tersimpan' : 'Simpan'}
        </button>
      </div>
      {error && <p className="text-xs text-danger mt-1 sm:mt-0">{error}</p>}
    </div>
  );
}
