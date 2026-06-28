'use client';

import Link from 'next/link';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BOOKING_STATUS_LABELS } from '@/lib/constants';
import { BookingStatusBadge, BookingStatusStepper } from './booking-status';
import { cancelBooking, confirmBooking, completeBooking } from '@/actions/bookings';
import PaymentForm from '../payments/payment-form';
import PaymentConfirm from '../payments/payment-confirm';
import ReviewForm from './review-form';
import { Car, Calendar, MapPin, FileText, CreditCard, User, Phone, AlertCircle, CheckCircle2, XCircle, Loader2, ArrowLeft, Clock, Star } from 'lucide-react';
import type { BookingWithDetails, UserRole } from '@/types/database';
import { getDashboardPath } from '@/lib/auth';

type BookingDetailProps = {
  booking: BookingWithDetails;
  userRole: UserRole;
  userId: string;
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-card-muted p-1.5 text-muted">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function ActionButtons({ booking, userRole, userId }: BookingDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const isRenter = booking.renter_id === userId;
  const isAdmin = userRole === 'admin';

  async function handleAction(actionName: string, actionFn: () => Promise<{ error?: string; success?: boolean }>) {
    setActionError(null);
    setActiveAction(actionName);
    startTransition(async () => {
      const result = await actionFn();
      if (result.error) {
        setActionError(result.error);
      } else {
        router.refresh();
      }
      setActiveAction(null);
    });
  }

  const buttons: React.ReactNode[] = [];

  // Renter atau Admin bisa membatalkan booking di awal
  if ((isRenter || isAdmin) && ['pending', 'confirmed', 'in_delivery'].includes(booking.status)) {
    buttons.push(
      <button
        key="cancel"
        onClick={() => handleAction('cancel', () => cancelBooking(booking.id))}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
      >
        {activeAction === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
        Batalkan Booking
      </button>,
    );
  }

  // Backup manual confirm booking (hanya Admin)
  if (isAdmin && booking.status === 'pending') {
    buttons.push(
      <button
        key="confirm"
        onClick={() => handleAction('confirm', () => confirmBooking(booking.id))}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover disabled:opacity-50"
      >
        {activeAction === 'confirm' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Konfirmasi Pengantaran (Manual)
      </button>,
    );
  }

  // Admin mengonfirmasi pengembalian (status 'returning')
  if (isAdmin && booking.status === 'returning') {
    buttons.push(
      <button
        key="complete"
        onClick={() => handleAction('complete', () => completeBooking(booking.id))}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-success/25 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {activeAction === 'complete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Konfirmasi Pengembalian Selesai
      </button>,
    );
  }

  if (buttons.length === 0) return null;

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {actionError}
        </div>
      )}
      <div className="flex flex-wrap gap-3">{buttons}</div>
    </div>
  );
}

export default function BookingDetail({ booking, userRole, userId }: BookingDetailProps) {
  const vehicle = booking.vehicles;
  const renter = booking.profiles;

  const isAdmin = userRole === 'admin';
  const isRenter = booking.renter_id === userId;

  const rawPayments = booking.payments;
  const payments = Array.isArray(rawPayments) ? rawPayments : (rawPayments ? [rawPayments] : []);
  
  const dpPayment = payments.find((p: any) => p.payment_type === 'dp');
  const finalPayment = payments.find((p: any) => p.payment_type === 'final');

  const rawReviews = (booking as any).reviews;
  const reviews = Array.isArray(rawReviews) ? rawReviews : (rawReviews ? [rawReviews] : []);
  const hasReviewed = reviews.length > 0;

  const rawDelivery = booking.delivery_schedules;
  const delivery = Array.isArray(rawDelivery) ? (rawDelivery[0] ?? null) : (rawDelivery ?? null);

  const primaryImage = vehicle?.vehicle_images?.find((img) => img.is_primary) ?? vehicle?.vehicle_images?.[0];

  const days = Math.max(1, Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-6">
      <Link href={getDashboardPath(userRole)} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Detail Booking</h1>
          <p className="text-xs text-muted font-mono mt-0.5">#{booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <BookingStatusBadge status={booking.status} size="md" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
              <Car className="h-4 w-4" /> Kendaraan
            </h2>
            <div className="flex gap-4">
              {primaryImage ? (
                <img src={primaryImage.image_url} alt={`${vehicle.brand} ${vehicle.model}`} className="h-24 w-32 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-xl bg-card-muted">
                  <Car className="h-8 w-8 text-subtle" />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-lg font-bold">
                  {vehicle.brand} {vehicle.model}
                </p>
                <p className="text-sm text-muted">
                  {vehicle.year} • {vehicle.color} • {vehicle.plate_number}
                </p>
                <Link href={`/vehicles/${vehicle.id}`} className="text-xs text-primary hover:underline">
                  Lihat detail kendaraan →
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
              <Calendar className="h-4 w-4" /> Periode Sewa
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={Calendar} label="Tanggal Mulai" value={formatDate(booking.start_date)} />
              <InfoRow icon={Calendar} label="Tanggal Selesai" value={formatDate(booking.end_date)} />
              <InfoRow icon={Clock} label="Durasi" value={`${days} hari`} />
              <InfoRow icon={CreditCard} label="Total Harga" value={<span className="text-primary font-bold">{formatCurrency(booking.total_price)}</span>} />
            </div>

            {booking.deposit_amount > 0 && (
              <div className="mt-4 rounded-xl bg-card-muted p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Deposit (DP 25%)</span>
                  <span className="font-semibold text-warning">{formatCurrency(booking.deposit_amount)}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-sm">
                  <span className="text-muted">Sisa Pembayaran (75%)</span>
                  <span className="font-semibold">{formatCurrency(booking.total_price - booking.deposit_amount)}</span>
                </div>
              </div>
            )}
          </div>

          {booking.delivery_address && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
                <MapPin className="h-4 w-4" /> Pengantaran & Area Penggunaan
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow icon={MapPin} label="Alamat Pengantaran" value={booking.delivery_address} />
                {(booking as any).usage_radius && (
                  <InfoRow icon={Car} label="Radius Batas Penggunaan" value={`${(booking as any).usage_radius} KM`} />
                )}
              </div>

              {delivery && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted font-semibold uppercase tracking-wide">Jadwal Pengantaran</p>
                  <div className="flex items-center gap-2 text-sm bg-card-muted p-3 rounded-xl border border-border">
                    <Calendar className="h-3.5 w-3.5 text-muted" />
                    <span className="text-muted">Jadwal: </span>
                    <span className="font-medium text-primary">
                      {new Date(delivery.departure_time).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {booking.notes && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
                <FileText className="h-4 w-4" /> Catatan
              </h2>
              <p className="text-sm whitespace-pre-line leading-relaxed">{booking.notes}</p>
            </div>
          )}

          {userRole !== 'renter' && renter && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
                <User className="h-4 w-4" /> Penyewa
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{renter.full_name}</p>
                  {renter.phone && (
                    <p className="flex items-center gap-1 text-sm text-muted">
                      <Phone className="h-3 w-3" />
                      {renter.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section Pembayaran DP 25% */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide border-b border-border pb-2">
              <CreditCard className="h-4 w-4" /> Pembayaran DP (25%)
            </h2>
            {dpPayment ? (
              <PaymentConfirm payment={dpPayment} isAdmin={isAdmin} />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Silakan bayar DP sebesar 25% untuk mengaktifkan pemesanan.
                </p>
                {booking.status === 'pending' && isRenter && (
                  <PaymentForm bookingId={booking.id} totalPrice={booking.deposit_amount} paymentType="dp" />
                )}
              </div>
            )}
          </div>

          {/* Section Pembayaran Pelunasan 75% */}
          {(dpPayment?.status === 'confirmed' || ['in_delivery', 'active', 'returning', 'completed'].includes(booking.status)) && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide border-b border-border pb-2">
                <CreditCard className="h-4 w-4" /> Pelunasan Sisa Pembayaran (75%)
              </h2>
              {finalPayment ? (
                <PaymentConfirm payment={finalPayment} isAdmin={isAdmin} />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted">
                    Sisa pelunasan sebesar 75% dari total sewa dibayarkan saat armada diantar.
                  </p>
                  {booking.status === 'in_delivery' && isRenter && (
                    <PaymentForm bookingId={booking.id} totalPrice={booking.total_price - booking.deposit_amount} paymentType="final" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Review / Rating Section */}
          {booking.status === 'completed' && isRenter && !hasReviewed && (
            <ReviewForm bookingId={booking.id} />
          )}

          {hasReviewed && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide border-b border-border pb-2">
                <Star className="h-4 w-4 text-warning fill-warning" /> Ulasan Anda
              </h2>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < reviews[0].rating ? 'text-warning fill-warning' : 'text-subtle'
                      }`}
                    />
                  ))}
                </div>
                {reviews[0].comment && (
                  <p className="text-sm text-muted bg-card-muted p-3 rounded-xl mt-2 italic">
                    "{reviews[0].comment}"
                  </p>
                )}
              </div>
            </div>
          )}

          <ActionButtons booking={booking} userRole={userRole} userId={userId} />
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-5 text-sm font-semibold text-muted uppercase tracking-wide">Status Booking</h2>
            <BookingStatusStepper status={booking.status} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Info</h2>
            <InfoRow
              icon={Calendar}
              label="Dibuat"
              value={new Date(booking.created_at).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            />
            {booking.updated_at && booking.updated_at !== booking.created_at && (
              <InfoRow
                icon={Clock}
                label="Diperbarui"
                value={new Date(booking.updated_at).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
