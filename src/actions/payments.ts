'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { resolveUserRole } from '@/lib/auth';
import { insertPayment, getPaymentById, getPaymentByBookingId, updatePaymentStatus } from '@/lib/db/payments';
import { getBookingById, updateBookingStatus, updateBookingAndVehicleStatus } from '@/lib/db/bookings';
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
  const paymentTypeInput = formData.get('payment_type') as string | null;

  if (!bookingId || !paymentMethod) return { error: 'Data tidak lengkap' };
  if (!file || file.size === 0) return { error: 'Bukti pembayaran wajib diupload' };

  // Validasi file
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Format file harus JPG, PNG, atau WebP' };
  }
  if (file.size > MAX_PROOF_SIZE) {
    return { error: 'Ukuran file maksimal 5MB' };
  }

  // Verifikasi booking milik user
  const booking = await getBookingById(bookingId);
  if (!booking) return { error: 'Booking tidak ditemukan' };
  if (booking.renter_id !== user.id) {
    return { error: 'Anda tidak memiliki akses ke booking ini' };
  }

  // Tentukan tipe pembayaran & nominal secara otomatis berdasarkan status booking
  let paymentType: 'dp' | 'final' | 'fine' = 'dp';
  let amount = Number(booking.deposit_amount);

  if (paymentTypeInput === 'fine') {
    paymentType = 'fine';
    const fineAmountStr = formData.get('amount') as string;
    amount = parseFloat(fineAmountStr) || 0;
    if (amount <= 0) return { error: 'Nominal denda tidak valid' };
  } else if (booking.status === 'pending') {
    paymentType = 'dp';
    amount = Number(booking.deposit_amount);
  } else if (booking.status === 'in_delivery' || booking.status === 'active') {
    paymentType = 'final';
    amount = Number(booking.total_price) - Number(booking.deposit_amount);
  } else {
    return { error: 'Pembayaran tidak diizinkan pada status pemesanan saat ini' };
  }

  // Upload ke Supabase Storage
  const ext = file.name.split('.').pop();
  const path = `${user.id}/${bookingId}/${paymentType}_${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('payment-proofs').upload(path, file, { contentType: file.type });

  if (uploadErr) return { error: `Gagal upload: ${uploadErr.message}` };

  const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(path);

  // Cek apakah sudah ada payment dengan tipe yang sama
  const { data: existingPayment } = await (supabase
    .from('payments') as any)
    .select('id, status')
    .eq('booking_id', bookingId)
    .eq('payment_type', paymentType)
    .maybeSingle();

  if (existingPayment) {
    if (existingPayment.status === 'pending_confirmation') {
      return { error: 'Bukti pembayaran tipe ini sudah diupload dan sedang menunggu konfirmasi' };
    }
    if (existingPayment.status === 'confirmed') {
      return { error: 'Pembayaran ini sudah dikonfirmasi sebelumnya' };
    }

    // Jika statusnya 'unpaid' atau 'rejected', kita perbarui record yang sudah ada!
    const { error: updateErr } = await (supabase
      .from('payments') as any)
      .update({
        payment_method: paymentMethod,
        amount: amount,
        status: 'pending_confirmation',
        proof_image_url: urlData.publicUrl,
        paid_at: new Date().toISOString(),
        confirmed_at: null,
        confirmed_by: null,
      })
      .eq('id', existingPayment.id);

    if (updateErr) {
      return { error: `Gagal memperbarui bukti pembayaran: ${updateErr.message}` };
    }

    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath('/dashboard/admin/payments');
    return { success: true, paymentId: existingPayment.id };
  }

  // Insert payment record
  const { data: payment, error: insertErr } = await insertPayment({
    booking_id: bookingId,
    payment_method: paymentMethod,
    amount: amount,
    status: 'pending_confirmation',
    proof_image_url: urlData.publicUrl,
    paid_at: new Date().toISOString(),
    confirmed_at: null,
    confirmed_by: null,
    payment_type: paymentType,
  } as any);

  if (insertErr || !payment) {
    return { error: insertErr ?? 'Gagal menyimpan data pembayaran' };
  }

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath('/dashboard/admin/payments');

  return { success: true, paymentId: payment.id };
}

// =============================================================
// KONFIRMASI PAYMENT — Admin Only
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

  const booking = await getBookingById(payment.booking_id);
  if (!booking) return { error: 'Booking tidak ditemukan' };

  // Permission: admin only
  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') {
    return { error: 'Hanya admin yang dapat mengkonfirmasi pembayaran' };
  }

  // Update payment → confirmed
  const { error: paymentErr } = await updatePaymentStatus(paymentId, 'confirmed', user.id);
  if (paymentErr) return { error: paymentErr };

  // Tentukan target status booking & kendaraan berdasarkan tipe pembayaran
  let nextBookingStatus: any = 'in_delivery';
  let nextVehicleStatus: any = 'rented';

  if (payment.payment_type === 'dp') {
    nextBookingStatus = 'in_delivery';
    nextVehicleStatus = 'rented';

    // Ambil jam pengantaran otomatis dari settings
    const { data: settingData } = await (supabase
      .from('system_settings') as any)
      .select('value')
      .eq('key', 'auto_delivery_hour')
      .maybeSingle();
    const autoHour = settingData ? parseInt(settingData.value, 10) : 7;

    const deliveryTime = new Date(booking.start_date);
    deliveryTime.setHours(autoHour, 0, 0, 0);

    // Load-balancing driver assignment
    const { data: drivers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'driver');

    let assignedDriverId = null;

    if (drivers && drivers.length > 0) {
      const startOfDay = new Date(deliveryTime);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(deliveryTime);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: activeSchedules } = await supabase
        .from('delivery_schedules')
        .select('driver_id')
        .gte('departure_time', startOfDay.toISOString())
        .lte('departure_time', endOfDay.toISOString());

      const driverLoads = drivers.map((d: any) => {
        const load = activeSchedules?.filter((s: any) => s.driver_id === d.id).length || 0;
        return { id: d.id, load };
      });

      // Urutkan berdasarkan beban terkecil (load-balanced round-robin)
      driverLoads.sort((a, b) => a.load - b.load);
      assignedDriverId = driverLoads[0].id;
    }

    await (supabase.from('delivery_schedules') as any).insert({
      booking_id: booking.id,
      driver_id: assignedDriverId,
      departure_time: deliveryTime.toISOString(),
      delivery_status: 'assigned',
      notes: `Jadwal otomatis dibuat sistem pada pukul ${autoHour.toString().padStart(2, '0')}:00 WIB`,
    });

  } else if (payment.payment_type === 'final') {
    nextBookingStatus = 'active';
    nextVehicleStatus = 'rented';
  } else if (payment.payment_type === 'fine') {
    nextBookingStatus = 'completed';
    nextVehicleStatus = 'available';
  }

  // Update status booking dan kendaraan
  try {
    if (booking.vehicle_id) {
      await updateBookingAndVehicleStatus(
        booking.id,
        booking.vehicle_id,
        nextBookingStatus,
        nextVehicleStatus
      );
    } else {
      await updateBookingStatus(booking.id, nextBookingStatus);
    }
  } catch (err) {
    console.error('Gagal memperbarui status booking/kendaraan:', err);
  }

  revalidatePath(`/bookings/${payment.booking_id}`);
  revalidatePath('/dashboard/admin/payments');
  revalidatePath('/dashboard/admin');

  return { success: true, paymentId };
}

// =============================================================
// TOLAK PAYMENT — Admin Only
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

  // Permission: admin only
  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') {
    return { error: 'Hanya admin yang dapat menolak pembayaran' };
  }

  // Reset ke rejected agar penyewa bisa upload ulang
  const { error } = await updatePaymentStatus(paymentId, 'rejected' as any);
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
