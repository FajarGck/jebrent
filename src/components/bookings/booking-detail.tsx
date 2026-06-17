'use client';
// src/components/bookings/booking-detail.tsx
// Full detail view sebuah booking — Dev A ONLY

import Link from 'next/link';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BOOKING_STATUS_LABELS } from '@/lib/constants';
import { BookingStatusBadge, BookingStatusStepper } from './booking-status';
import {
  cancelBooking,
  confirmBooking,
  completeBooking,
} from '@/actions/bookings';
import {
  Car,
  Calendar,
  MapPin,
  FileText,
  CreditCard,
  Truck,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import type { BookingWithDetails, UserRole } from '@/types/database';

// =============================================================
// Types
// =============================================================

type BookingDetailProps = {
  booking: BookingWithDetails;
  userRole: UserRole;
  userId: string;
};

// =============================================================
// Sub-component: Info Row
// =============================================================
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
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

// =============================================================
// Sub-component: Action Buttons
// =============================================================
function ActionButtons({
  booking,
  userRole,
  userId,
}: BookingDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const isRenter = booking.renter_id === userId;
  const isAdmin = userRole === 'admin';
  const vehicleOwnerId = (booking.vehicles as any)?.profiles?.id;
  const isVehicleOwner = userRole === 'owner' && vehicleOwnerId === userId;

  async function handleAction(
    actionName: string,
    actionFn: () => Promise<{ error?: string; success?: boolean }>
  ) {
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

  // Cancel: renter (pending/confirmed) atau admin
  if (
    (isRenter || isAdmin) &&
    ['pending', 'confirmed'].includes(booking.status)
  ) {
    buttons.push(
      <button
        key="cancel"
        onClick={() =>
          handleAction('cancel', () => cancelBooking(booking.id))
        }
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
      >
        {activeAction === 'cancel' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        Batalkan Booking
      </button>
    );
  }

  // Confirm: vehicle owner atau admin, hanya jika pending
  if ((isVehicleOwner || isAdmin) && booking.status === 'pending') {
    buttons.push(
      <button
        key="confirm"
        onClick={() =>
          handleAction('confirm', () => confirmBooking(booking.id))
        }
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover disabled:opacity-50"
      >
        {activeAction === 'confirm' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Konfirmasi Booking
      </button>
    );
  }

  // Complete: vehicle owner atau admin, jika active/returning/paid
  if (
    (isVehicleOwner || isAdmin) &&
    ['active', 'returning', 'paid'].includes(booking.status)
  ) {
    buttons.push(
      <button
        key="complete"
        onClick={() =>
          handleAction('complete', () => completeBooking(booking.id))
        }
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-success/25 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {activeAction === 'complete' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Selesaikan Booking
      </button>
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

// =============================================================
// Main Component
// =============================================================

export default function BookingDetail({
  booking,
  userRole,
  userId,
}: BookingDetailProps) {
  const vehicle = booking.vehicles;
  const renter = booking.profiles;

  // Supabase mengembalikan ARRAY untuk relasi one-to-many.
  // Normalize ke object tunggal agar tidak error saat akses .status, .replace(), dll.
  const rawPayments = booking.payments;
  const payment = Array.isArray(rawPayments)
    ? (rawPayments[0] ?? null)
    : (rawPayments ?? null);

  const rawDelivery = booking.delivery_schedules;
  const delivery = Array.isArray(rawDelivery)
    ? (rawDelivery[0] ?? null)
    : (rawDelivery ?? null);

  const primaryImage =
    vehicle?.vehicle_images?.find((img) => img.is_primary) ??
    vehicle?.vehicle_images?.[0];

  const days = Math.max(
    1,
    Math.ceil(
      (new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar booking
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Detail Booking</h1>
          <p className="text-xs text-muted font-mono mt-0.5">#{booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <BookingStatusBadge status={booking.status} size="md" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ======== LEFT COLUMN ======== */}
        <div className="space-y-5">

          {/* Kendaraan */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
              <Car className="h-4 w-4" /> Kendaraan
            </h2>
            <div className="flex gap-4">
              {primaryImage ? (
                <img
                  src={primaryImage.image_url}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="h-24 w-32 flex-shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-24 w-32 flex-shrink-0 items-center justify-center rounded-xl bg-card-muted">
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
                <Link
                  href={`/vehicles/${vehicle.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Lihat detail kendaraan →
                </Link>
              </div>
            </div>
          </div>

          {/* Tanggal & Harga */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
              <Calendar className="h-4 w-4" /> Periode Sewa
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow
                icon={Calendar}
                label="Tanggal Mulai"
                value={formatDate(booking.start_date)}
              />
              <InfoRow
                icon={Calendar}
                label="Tanggal Selesai"
                value={formatDate(booking.end_date)}
              />
              <InfoRow
                icon={Clock}
                label="Durasi"
                value={`${days} hari`}
              />
              <InfoRow
                icon={CreditCard}
                label="Total Harga"
                value={
                  <span className="text-primary font-bold">
                    {formatCurrency(booking.total_price)}
                  </span>
                }
              />
            </div>

            {booking.deposit_amount > 0 && (
              <div className="mt-4 rounded-xl bg-card-muted p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Deposit (DP)</span>
                  <span className="font-semibold text-warning">
                    {formatCurrency(booking.deposit_amount)}
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between text-sm">
                  <span className="text-muted">Sisa Pembayaran</span>
                  <span className="font-semibold">
                    {formatCurrency(booking.total_price - booking.deposit_amount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Pengantaran */}
          {booking.delivery_address && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
                <MapPin className="h-4 w-4" /> Pengantaran
              </h2>
              <InfoRow
                icon={MapPin}
                label="Alamat Pengantaran"
                value={booking.delivery_address}
              />

              {delivery && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted font-semibold uppercase tracking-wide">Driver</p>
                  <div className="flex items-center gap-3 rounded-xl bg-card-muted p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Truck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {delivery.profiles?.full_name ?? 'Driver'}
                      </p>
                      {delivery.profiles?.phone && (
                        <p className="flex items-center gap-1 text-xs text-muted">
                          <Phone className="h-3 w-3" />
                          {delivery.profiles.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted" />
                    <span className="text-muted">Jadwal: </span>
                    <span className="font-medium">
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

          {/* Catatan */}
          {booking.notes && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
                <FileText className="h-4 w-4" /> Catatan
              </h2>
              <p className="text-sm whitespace-pre-line leading-relaxed">{booking.notes}</p>
            </div>
          )}

          {/* Penyewa (visible untuk owner/admin) */}
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

          {/* Payment Info — placeholder untuk Dev B */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted uppercase tracking-wide">
              <CreditCard className="h-4 w-4" /> Pembayaran
            </h2>
            {payment ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Status</span>
                  <span className="font-semibold capitalize">{payment.status.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Jumlah</span>
                  <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                </div>
                {payment.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-muted">Metode</span>
                    <span className="font-semibold capitalize">
                      {payment.payment_method.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">
                {booking.status === 'pending'
                  ? 'Pembayaran dapat dilakukan setelah booking dikonfirmasi oleh pemilik.'
                  : 'Belum ada data pembayaran.'}
              </p>
            )}
            {/* DEV B: Tambahkan PaymentForm di sini setelah booking confirmed */}
            {/* {booking.status === 'confirmed' && !payment && <PaymentForm bookingId={booking.id} />} */}
          </div>

          {/* Action Buttons */}
          <ActionButtons booking={booking} userRole={userRole} userId={userId} />
        </div>

        {/* ======== RIGHT COLUMN: Status Timeline ======== */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-5 text-sm font-semibold text-muted uppercase tracking-wide">
              Status Booking
            </h2>
            <BookingStatusStepper status={booking.status} />
          </div>

          {/* Meta info */}
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
