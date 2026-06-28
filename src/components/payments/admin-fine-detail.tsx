'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmPayment, rejectPayment } from '@/actions/payments';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Check, X, ShieldAlert, Loader2, User, Car, FileText, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

type AdminFineDetailProps = {
  payment: any;
};

export default function AdminFineDetail({ payment }: AdminFineDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const booking = payment.bookings || {};
  const vehicle = booking.vehicles || {};
  const renter = booking.profiles || {};

  async function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await confirmPayment(payment.id);
      if (res.error) {
        setError(res.error);
      } else {
        router.push('/dashboard/admin/fines?status=confirmed');
        router.refresh();
      }
    });
  }

  async function handleReject() {
    setError(null);
    startTransition(async () => {
      const res = await rejectPayment(payment.id);
      if (res.error) {
        setError(res.error);
      } else {
        router.push('/dashboard/admin/fines?status=unpaid');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link href="/dashboard/admin/fines" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary mb-3">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Denda
        </Link>
        <h1 className="text-2xl font-bold">Detail Denda Keterlambatan</h1>
        <p className="text-sm text-muted">ID Transaksi: <span className="font-mono uppercase">#{payment.id}</span></p>
      </div>

      {error && (
        <div className="flex items-start gap-1.5 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Side: Detail Info */}
        <div className="space-y-6">
          {/* Status & Amount */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted">Rincian Pembayaran</h3>
            <div className="flex justify-between items-center">
              <span className="text-xs">Status:</span>
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                payment.status === 'confirmed' ? 'bg-success/15 text-success' : payment.status === 'pending_confirmation' ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'
              }`}>
                {payment.status === 'confirmed' ? 'Terkonfirmasi' : payment.status === 'pending_confirmation' ? 'Menunggu Konfirmasi' : 'Ditolak / Belum Bayar'}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-3">
              <span className="text-xs">Metode Transfer:</span>
              <span className="text-xs font-bold capitalize">{payment.payment_method?.replace('_', ' ') || '—'}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-3">
              <span className="text-xs font-bold text-danger">Total Denda:</span>
              <span className="text-lg font-extrabold text-danger">{formatCurrency(payment.amount)}</span>
            </div>
          </div>

          {/* Renter Info */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted flex items-center gap-1"><User className="h-3.5 w-3.5" /> Data Penyewa</h3>
            <div className="text-xs space-y-2">
              <p>Nama: <span className="font-semibold text-foreground">{renter.full_name || '—'}</span></p>
              <p>Nomor Telepon: <span className="font-semibold text-foreground">{renter.phone || '—'}</span></p>
              <p>Nomor NIK: <span className="font-semibold text-foreground">{renter.nik || '—'}</span></p>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted flex items-center gap-1"><Car className="h-3.5 w-3.5" /> Data Kendaraan</h3>
            <div className="text-xs space-y-2">
              <p>Mobil: <span className="font-semibold text-foreground">{vehicle.brand} {vehicle.model}</span></p>
              <p>Nomor Plat: <span className="font-mono text-foreground font-semibold">{vehicle.plate_number}</span></p>
              <p>Batas Pengembalian Kontrak: <span className="font-semibold text-foreground">{formatDate(booking.end_date)}</span></p>
            </div>
          </div>
        </div>

        {/* Right Side: Proof of Transfer & Actions */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3 flex-1 flex flex-col">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> Bukti Transfer Denda</h3>
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border rounded-xl p-2 bg-card-muted overflow-hidden min-h-64">
              {payment.proof_image_url ? (
                <img
                  src={payment.proof_image_url}
                  alt="Bukti Transfer Denda"
                  className="max-h-80 max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="text-center p-6 text-muted">
                  <ImageIcon className="mx-auto h-8 w-8 text-subtle mb-1.5" />
                  <p className="text-xs">Penyewa belum mengunggah gambar bukti transfer.</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {payment.status === 'pending_confirmation' && (
            <div className="flex gap-3 no-print">
              <button
                onClick={handleReject}
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-danger bg-card py-3 text-xs font-bold text-danger transition-colors hover:bg-danger/5 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Tolak Denda
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending || !payment.proof_image_url}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-xs font-bold text-primary-fg shadow-md transition-all hover:bg-primary-hover disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Setujui & Selesaikan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
