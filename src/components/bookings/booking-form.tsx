'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBooking, calculatePriceBreakdown } from '@/actions/bookings';
import { formatCurrency, calculateRentalDays } from '@/lib/utils';
import { DEPOSIT_PERCENTAGE } from '@/lib/constants';
import MapPicker from './map-picker';
import {
  Calendar,
  MapPin,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Info,
} from 'lucide-react';
import type { VehicleWithImages } from '@/lib/db/vehicles';
import type { PriceBreakdown } from '@/types/booking';

type BookingFormProps = {
  vehicle: VehicleWithImages;
};

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function tomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function PriceSummary({
  breakdown,
  loading,
}: {
  breakdown: PriceBreakdown | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card-muted p-5 animate-pulse">
        <div className="h-4 w-32 rounded bg-border mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-border" />
          <div className="h-3 w-3/4 rounded bg-border" />
          <div className="h-5 w-full rounded bg-border mt-3" />
        </div>
      </div>
    );
  }

  if (!breakdown) {
    return (
      <div className="rounded-2xl border border-border bg-card-muted p-5 text-center">
        <Calendar className="mx-auto h-8 w-8 text-subtle mb-2" />
        <p className="text-sm text-muted">Pilih tanggal untuk melihat kalkulasi harga</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">Rincian Harga</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">
            {formatCurrency(breakdown.durationType === 'weekly' ? breakdown.dailyRate : breakdown.dailyRate)} × {breakdown.numberOfDays} hari
          </span>
          <span className="font-medium">{formatCurrency(breakdown.subtotal)}</span>
        </div>

        {breakdown.durationType === 'weekly' && (
          <div className="flex justify-between text-success">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Diskon rate mingguan
            </span>
            <span className="font-medium text-xs bg-success/10 px-2 py-0.5 rounded-full">Aktif</span>
          </div>
        )}

        <div className="border-t border-border pt-2 flex justify-between">
          <span className="text-muted">Deposit (DP {Math.round(DEPOSIT_PERCENTAGE * 100)}%)</span>
          <span className="font-semibold text-warning">{formatCurrency(breakdown.depositAmount)}</span>
        </div>
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-semibold">Total</span>
        <span className="text-xl font-bold text-primary">{formatCurrency(breakdown.totalPrice)}</span>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        Deposit {formatCurrency(breakdown.depositAmount)} dibayar di awal. Sisa {formatCurrency(breakdown.totalPrice - breakdown.depositAmount)} dibayar sebelum kendaraan diantar.
      </p>
    </div>
  );
}

export default function BookingForm({ vehicle }: BookingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [usageRadius, setUsageRadius] = useState<number>(15);
  const [notes, setNotes] = useState('');
  const [withDelivery, setWithDelivery] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) {
      setBreakdown(null);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      setBreakdown(null);
      return;
    }

    setPriceLoading(true);
    const timeout = setTimeout(async () => {
      const result = await calculatePriceBreakdown(vehicle.id, startDate, endDate);
      if (result.data) setBreakdown(result.data);
      setPriceLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [startDate, endDate, vehicle.id]);

  function handleStartDateChange(val: string) {
    setStartDate(val);
    if (endDate && endDate <= val) {
      const next = new Date(val);
      next.setDate(next.getDate() + 1);
      setEndDate(next.toISOString().split('T')[0]);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!startDate || !endDate) {
      setError('Tanggal mulai dan selesai wajib diisi');
      return;
    }
    if (withDelivery && !deliveryAddress.trim()) {
      setError('Alamat pengantaran wajib diisi jika memilih layanan antar');
      return;
    }

    startTransition(async () => {
      const result = await createBooking({
        vehicleId: vehicle.id,
        startDate,
        endDate,
        durationType: breakdown?.durationType ?? 'daily',
        deliveryAddress: withDelivery ? deliveryAddress.trim() : null,
        deliveryLatitude: withDelivery ? deliveryLat : null,
        deliveryLongitude: withDelivery ? deliveryLng : null,
        usageRadius: withDelivery ? usageRadius : null,
        notes: notes.trim() || null,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/bookings/${result.bookingId}`);
      }, 1500);
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h2 className="mt-4 text-xl font-bold">Pemesanan Berhasil Dibuat!</h2>
        <p className="mt-2 text-sm text-muted">
          Menunggu konfirmasi dari pemilik kendaraan. Anda akan diarahkan ke halaman detail pemesanan...
        </p>
        <div className="mt-4 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const days = startDate && endDate ? calculateRentalDays(startDate, endDate) : 0;
  const endDateMin = startDate
    ? (() => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })()
    : tomorrowString();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold">Tanggal Sewa</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="start_date" className="mb-1.5 block text-sm font-medium">
                  Tanggal Mulai <span className="text-danger">*</span>
                </label>
                <input
                  id="start_date"
                  type="date"
                  required
                  min={todayString()}
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="end_date" className="mb-1.5 block text-sm font-medium">
                  Tanggal Selesai <span className="text-danger">*</span>
                </label>
                <input
                  id="end_date"
                  type="date"
                  required
                  min={endDateMin}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {days > 0 && (
              <p className="mt-3 text-sm text-muted">
                Durasi: <span className="font-semibold text-foreground">{days} hari</span>
                {days >= 7 && vehicle.weekly_rate && (
                  <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    Rate mingguan berlaku
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold">Layanan Pengantaran</h2>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={withDelivery}
                onClick={() => setWithDelivery(!withDelivery)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  withDelivery ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                    withDelivery ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm font-medium">
                {withDelivery ? 'Antar ke alamat saya' : 'Ambil sendiri di lokasi'}
              </span>
            </div>

            {withDelivery && (
              <MapPicker
                onLocationChange={(data) => {
                  setDeliveryAddress(data.address);
                  setDeliveryLat(data.lat);
                  setDeliveryLng(data.lng);
                  setUsageRadius(data.radius);
                }}
              />
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold">Catatan Tambahan</h2>
              <span className="text-xs text-muted">(Opsional)</span>
            </div>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Mohon kendaraan dicuci sebelum diantar, butuh kursi bayi, dll."
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          <PriceSummary breakdown={breakdown} loading={priceLoading} />

          <button
            type="submit"
            disabled={isPending || !startDate || !endDate || (withDelivery && !deliveryAddress.trim())}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                Buat Pemesanan
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="rounded-xl bg-card-muted p-4 text-xs text-muted space-y-1.5">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              Pemesanan akan menunggu konfirmasi pemilik
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              Pembayaran dilakukan setelah dikonfirmasi
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              Bisa dibatalkan selama status masih pending
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
