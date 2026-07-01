'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { resolveUserRole } from '@/lib/auth';
import { insertPayment, getPaymentById, getPaymentByBookingId, updatePaymentStatus } from '@/lib/db/payments';
import { getBookingById, updateBookingStatus, updateBookingAndVehicleStatus } from '@/lib/db/bookings';
import type { PaymentActionResult } from '@/types/payment';
import type { PaymentMethod } from '@/types/database';
import { translateError } from '@/lib/helper/error-translator';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROOF_SIZE = 5 * 1024 * 1024;

export async function uploadPaymentProof(formData: FormData): Promise<PaymentActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const bookingId = formData.get('booking_id') as string;
  const paymentMethod = formData.get('payment_method') as PaymentMethod;
  const file = formData.get('proof_file') as File;
  const paymentTypeInput = formData.get('payment_type') as string | null;

  if (!bookingId || !paymentMethod) return { error: 'Data tidak lengkap' };
  if (!file || file.size === 0) return { error: 'Bukti pembayaran wajib diunggah' };

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Format file harus JPG, PNG, atau WebP' };
  }
  if (file.size > MAX_PROOF_SIZE) {
    return { error: 'Ukuran file maksimal 5MB' };
  }

  const booking = await getBookingById(bookingId);
  if (!booking) return { error: 'Pemesanan tidak ditemukan' };
  if (booking.renter_id !== user.id) {
    return { error: 'Anda tidak memiliki hak akses ke pemesanan ini' };
  }

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

  const ext = file.name.split('.').pop();
  const path = `${user.id}/${bookingId}/${paymentType}_${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('payment-proofs').upload(path, file, { contentType: file.type });

  if (uploadErr) return { error: `Gagal mengunggah: ${translateError(uploadErr.message)}` };

  const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(path);

  const { data: existingPayment } = await (supabase
    .from('payments') as any)
    .select('id, status')
    .eq('booking_id', bookingId)
    .eq('payment_type', paymentType)
    .maybeSingle();

  if (existingPayment) {
    if (existingPayment.status === 'pending_confirmation') {
      return { error: 'Bukti pembayaran tipe ini sudah diunggah dan sedang menunggu konfirmasi' };
    }
    if (existingPayment.status === 'confirmed') {
      return { error: 'Pembayaran ini sudah dikonfirmasi sebelumnya' };
    }

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
      return { error: `Gagal memperbarui bukti pembayaran: ${translateError(updateErr.message)}` };
    }

    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath('/dashboard/admin/payments');
    return { success: true, paymentId: existingPayment.id };
  }

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
    return { error: insertErr ? translateError(insertErr) : 'Gagal menyimpan data pembayaran' };
  }

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath('/dashboard/admin/payments');

  return { success: true, paymentId: payment.id };
}

export async function confirmPayment(paymentId: string): Promise<PaymentActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const payment = await getPaymentById(paymentId);
  if (!payment) return { error: 'Pembayaran tidak ditemukan' };
  if (payment.status !== 'pending_confirmation') {
    return { error: 'Pembayaran ini tidak dalam status menunggu konfirmasi' };
  }

  const booking = await getBookingById(payment.booking_id);
  if (!booking) return { error: 'Pemesanan tidak ditemukan' };

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') {
    return { error: 'Hanya admin yang dapat mengonfirmasi pembayaran' };
  }

  const { error: paymentErr } = await updatePaymentStatus(paymentId, 'confirmed', user.id);
  if (paymentErr) return { error: translateError(paymentErr) };

  let nextBookingStatus: any = 'in_delivery';
  let nextVehicleStatus: any = 'rented';

  if (payment.payment_type === 'dp') {
    nextBookingStatus = 'in_delivery';
    nextVehicleStatus = 'rented';

    const { data: settingData } = await (supabase
      .from('system_settings') as any)
      .select('value')
      .eq('key', 'auto_delivery_hour')
      .maybeSingle();
    const autoHour = settingData ? parseInt(settingData.value, 10) : 7;

    const deliveryTime = new Date(booking.start_date);
    deliveryTime.setHours(autoHour, 0, 0, 0);

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

export async function rejectPayment(paymentId: string): Promise<PaymentActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const payment = await getPaymentById(paymentId);
  if (!payment) return { error: 'Pembayaran tidak ditemukan' };
  if (payment.status !== 'pending_confirmation') {
    return { error: 'Pembayaran ini tidak dalam status menunggu konfirmasi' };
  }

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') {
    return { error: 'Hanya admin yang dapat menolak pembayaran' };
  }

  const { error } = await updatePaymentStatus(paymentId, 'rejected' as any);
  if (error) return { error: translateError(error) };

  revalidatePath(`/bookings/${payment.booking_id}`);
  revalidatePath('/dashboard/admin/payments');

  return { success: true, paymentId };
}

export async function getPaymentForBooking(bookingId: string) {
  return getPaymentByBookingId(bookingId);
}
