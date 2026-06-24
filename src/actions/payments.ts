'use server';
// =============================================================
// src/actions/payments.ts
// Server Actions: Payment Flow — Dev B ONLY
// =============================================================
// Business logic: validasi, permission check, upload storage, orchestrate DB
// Query langsung → lib/db/payments.ts
// =============================================================

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { resolveUserRole } from '@/lib/auth';
import { insertPayment, getPaymentById, getPaymentByBookingId, updatePaymentStatus } from '@/lib/db/payments';
import { getBookingById, updateBookingStatus } from '@/lib/db/bookings';
import type { PaymentActionResult } from '@/types/payment';
import type { PaymentMethod } from '@/types/database';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROOF_SIZE = 5 * 1024 * 1024; // 5MB

// =============================================================
// UPLOAD BUKTI BAYAR — Penyewa
// =============================================================

export async function uploadPaymentProof(formData: FormData): Promise<PaymentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Anda harus login' };

  // Parse input
  const bookingId = formData.get('booking_id') as string;
  const paymentMethod = formData.get('payment_method') as PaymentMethod;
  const file = formData.get('proof_file') as File;

  if (!bookingId || !paymentMethod) return { error: 'Data tidak lengkap' };
  if (!file || file.size === 0) return { error: 'Bukti pembayaran wajib diupload' };

  // Validasi file
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Format file harus JPG, PNG, atau WebP' };
  }
  if (file.size > MAX_PROOF_SIZE) {
    return { error: 'Ukuran file maksimal 5MB' };
  }

  // Verifikasi booking milik user & status confirmed
  const booking = await getBookingById(bookingId);
  if (!booking) return { error: 'Booking tidak ditemukan' };
  if (booking.renter_id !== user.id) {
    return { error: 'Anda tidak memiliki akses ke booking ini' };
  }
  if (booking.status !== 'confirmed') {
    return { error: 'Pembayaran hanya bisa dilakukan untuk booking yang sudah dikonfirmasi' };
  }

  // Cek apakah sudah ada payment pending
  const existingPayment = await getPaymentByBookingId(bookingId);
  if (existingPayment && existingPayment.status === 'pending_confirmation') {
    return { error: 'Bukti pembayaran sudah diupload dan menunggu konfirmasi' };
  }

  // Upload ke Supabase Storage
  const ext = file.name.split('.').pop();
  const path = `${user.id}/${bookingId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('payment-proofs').upload(path, file, { contentType: file.type });

  if (uploadErr) return { error: `Gagal upload: ${uploadErr.message}` };

  const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(path);

  // Insert payment record
  const { data: payment, error: insertErr } = await insertPayment({
    booking_id: bookingId,
    payment_method: paymentMethod,
    amount: booking.total_price,
    status: 'pending_confirmation',
    proof_image_url: urlData.publicUrl,
    paid_at: new Date().toISOString(),
    confirmed_at: null,
    confirmed_by: null,
  });

  if (insertErr || !payment) {
    return { error: insertErr ?? 'Gagal menyimpan data pembayaran' };
  }

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath('/dashboard/admin/payments');

  return { success: true, paymentId: payment.id };
}

// =============================================================
// KONFIRMASI PAYMENT — Admin/Owner
// =============================================================

export async function confirmPayment(paymentId: string): Promise<PaymentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const payment = await getPaymentById(paymentId);
  if (!payment) return { error: 'Payment tidak ditemukan' };
  if (payment.status !== 'pending_confirmation') {
    return { error: 'Payment ini tidak dalam status menunggu konfirmasi' };
  }

  // Permission: admin atau owner kendaraan
  const booking = await getBookingById(payment.booking_id);
  if (!booking) return { error: 'Booking tidak ditemukan' };

  const role = await resolveUserRole(supabase, user);
  const isAdmin = role === 'admin';
  const isVehicleOwner = role === 'owner' && booking.vehicles?.owner_id === user.id;

  if (!isAdmin && !isVehicleOwner) {
    return { error: 'Hanya admin atau pemilik kendaraan yang dapat mengkonfirmasi' };
  }

  // Update payment → confirmed
  const { error: paymentErr } = await updatePaymentStatus(paymentId, 'confirmed', user.id);
  if (paymentErr) return { error: paymentErr };

  // Update booking → paid
  const { error: bookingErr } = await updateBookingStatus(payment.booking_id, 'paid');
  if (bookingErr) return { error: bookingErr };

  revalidatePath(`/bookings/${payment.booking_id}`);
  revalidatePath('/dashboard/admin/payments');
  revalidatePath('/dashboard/owner');

  return { success: true, paymentId };
}

// =============================================================
// TOLAK PAYMENT — Admin/Owner (penyewa bisa re-upload)
// =============================================================

export async function rejectPayment(paymentId: string): Promise<PaymentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const payment = await getPaymentById(paymentId);
  if (!payment) return { error: 'Payment tidak ditemukan' };
  if (payment.status !== 'pending_confirmation') {
    return { error: 'Payment ini tidak dalam status menunggu konfirmasi' };
  }

  // Permission check
  const booking = await getBookingById(payment.booking_id);
  if (!booking) return { error: 'Booking tidak ditemukan' };

  const role = await resolveUserRole(supabase, user);
  const isAdmin = role === 'admin';
  const isVehicleOwner = role === 'owner' && booking.vehicles?.owner_id === user.id;

  if (!isAdmin && !isVehicleOwner) {
    return { error: 'Hanya admin atau pemilik kendaraan yang dapat menolak' };
  }

  // Reset ke unpaid agar penyewa bisa upload ulang
  const { error } = await updatePaymentStatus(paymentId, 'unpaid');
  if (error) return { error };

  revalidatePath(`/bookings/${payment.booking_id}`);
  revalidatePath('/dashboard/admin/payments');

  return { success: true, paymentId };
}

// =============================================================
// GET — wrapper untuk UI
// =============================================================

export async function getPaymentForBooking(bookingId: string) {
  return getPaymentByBookingId(bookingId);
}
