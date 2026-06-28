'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { returnVehicle } from '@/actions/bookings';
import { formatCurrency } from '@/lib/utils';
import { Car, Clock, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import PaymentForm from '../payments/payment-form';

type RenterActiveRentalProps = {
  activeBookings: any[];
};

export default function RenterActiveRental({ activeBookings }: RenterActiveRentalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Filter bookings in 'active' or 'returning' state
  const targetBookings = activeBookings.filter((b) => ['active', 'returning'].includes(b.status));

  if (targetBookings.length === 0) return null;

  async function handleReturn(bookingId: string) {
    setError(null);
    startTransition(async () => {
      const res = await returnVehicle(bookingId);
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-bold">Armada Sedang Digunakan</h2>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {targetBookings.map((b) => {
          const endDate = new Date(b.end_date);
          const now = new Date();
          const isLate = now > endDate;

          // Calculate late hours
          const diffMs = Math.max(0, now.getTime() - endDate.getTime());
          const lateHours = Math.ceil(diffMs / (1000 * 60 * 60));
          const fineAmount = lateHours * 20000; // 20k/hour denda

          // Find fine payment status
          const payments = Array.isArray(b.payments) ? b.payments : (b.payments ? [b.payments] : []);
          const finePayment = payments.find((p: any) => p.payment_type === 'fine');

          return (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-bold text-sm">{b.vehicles?.brand} {b.vehicles?.model}</h3>
                      <p className="text-xs text-muted font-mono">{b.vehicles?.plate_number}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    b.status === 'active' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                  }`}>
                    {b.status === 'active' ? 'Pemakaian' : 'Pengembalian'}
                  </span>
                </div>

                <div className="text-xs text-muted space-y-1">
                  <p>Tanggal Pengembalian: <span className="font-semibold text-foreground">{new Date(b.end_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span></p>
                </div>

                {isLate && (
                  <div className="p-3 rounded-xl border border-danger/30 bg-danger/5 text-danger space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>Terlambat Mengembalikan ({lateHours} Jam)</span>
                    </div>
                    <p className="text-[11px] opacity-90">
                      Anda dikenakan denda keterlambatan sebesar Rp 20.000 / jam.<br />
                      Total denda: <span className="font-bold">{formatCurrency(fineAmount)}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                {b.status === 'active' && (
                  <button
                    onClick={() => handleReturn(b.id)}
                    disabled={isPending}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-fg shadow-md transition-all hover:bg-primary-hover disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                    Ajukan Pengembalian Kendaraan
                  </button>
                )}

                {b.status === 'returning' && isLate && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted font-medium">Unggah bukti transfer pembayaran denda:</p>
                    {finePayment ? (
                      <div className="p-2.5 rounded-xl text-xs bg-card-muted border border-border flex items-center justify-between">
                        <span>Status Bayar Denda:</span>
                        <span className={`font-bold uppercase text-[10px] ${
                          finePayment.status === 'pending_confirmation' ? 'text-warning' : 'text-danger'
                        }`}>
                          {finePayment.status === 'pending_confirmation' ? 'Menunggu Konfirmasi' : 'Ditolak / Belum Bayar'}
                        </span>
                      </div>
                    ) : (
                      <PaymentForm bookingId={b.id} totalPrice={fineAmount} paymentType="fine" />
                    )}
                  </div>
                )}

                {b.status === 'returning' && !isLate && (
                  <div className="p-3 rounded-xl bg-card-muted text-xs text-center border border-border">
                    <p className="font-medium text-muted">Menunggu konfirmasi pengembalian dari Admin.</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="text-xs text-danger mt-2 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
