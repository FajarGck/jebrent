'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { resolveUserRole } from '@/lib/auth';
import { DEPOSIT_PERCENTAGE } from '@/lib/constants';
import { insertBooking, getBookingsByRenter, getBookingsByOwner, updateBookingStatus, checkDateOverlap, getBookingById, updateBookingAndVehicleStatus } from '@/lib/db/bookings';
import { getVehicleById } from '@/lib/db/vehicles';
import type { BookingWithVehicle } from '@/types/database';
import type { BookingActionResult, CreateBookingInput, PriceBreakdown } from '@/types/booking';
import { translateError } from '@/lib/helper/error-translator';

function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export async function calculatePriceBreakdown(vehicleId: string, startDate: string, endDate: string): Promise<{ data: PriceBreakdown | null; error: string | null }> {
  const vehicle = await getVehicleById(vehicleId);
  if (!vehicle) return { data: null, error: 'Kendaraan tidak ditemukan' };

  const numberOfDays = calculateDays(startDate, endDate);
  const dailyRate = vehicle.daily_rate;
  const halfDayRate = vehicle.half_day_rate;

  let subtotal: number;
  let durationType: CreateBookingInput['durationType'] = 'daily';

  if (numberOfDays >= 7 && vehicle.weekly_rate) {
    const weeks = Math.floor(numberOfDays / 7);
    const remainingDays = numberOfDays % 7;
    subtotal = weeks * vehicle.weekly_rate + remainingDays * dailyRate;
    durationType = 'weekly';
  } else {
    subtotal = numberOfDays * dailyRate;
    durationType = 'daily';
  }

  const depositAmount = subtotal * DEPOSIT_PERCENTAGE;

  return {
    data: {
      dailyRate,
      halfDayRate,
      numberOfDays,
      durationType,
      subtotal,
      depositAmount,
      totalPrice: subtotal,
    },
    error: null,
  };
}

export async function createBooking(input: CreateBookingInput): Promise<BookingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Silakan masuk terlebih dahulu untuk melakukan pemesanan.' };

  const { data: profileData } = await supabase.from('profiles').select('verification_status').eq('id', user.id).single();
  const profile = profileData as { verification_status: string } | null;
  if (!profile || profile.verification_status !== 'verified') {
    return {
      error: 'Akun Anda belum terverifikasi oleh Admin. Silakan lengkapi profil & unggah KTP Anda di halaman Profil Saya.',
    };
  }

  // Validasi format tanggal
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: 'Format tanggal tidak valid' };
  }
  if (start < today) {
    return { error: 'Tanggal mulai tidak boleh di masa lalu' };
  }
  if (end <= start) {
    return { error: 'Tanggal selesai harus setelah tanggal mulai' };
  }

  const vehicle = await getVehicleById(input.vehicleId);
  if (!vehicle) return { error: 'Kendaraan tidak ditemukan' };
  if (vehicle.status !== 'available') {
    return { error: 'Kendaraan tidak tersedia untuk disewa saat ini' };
  }

  // Cek apakah tanggal sewa berbenturan dengan pesanan lain
  const hasOverlap = await checkDateOverlap(input.vehicleId, input.startDate, input.endDate);
  if (hasOverlap) {
    return {
      error: 'Kendaraan sudah dibooking pada tanggal yang dipilih. Silakan pilih tanggal lain.',
    };
  }

  const { data: priceData, error: priceError } = await calculatePriceBreakdown(input.vehicleId, input.startDate, input.endDate);
  if (priceError || !priceData) {
    return { error: priceError ? translateError(priceError) : 'Gagal menghitung harga' };
  }

  const { data: booking, error: insertError } = await insertBooking({
    renter_id: user.id,
    vehicle_id: input.vehicleId,
    start_date: input.startDate,
    end_date: input.endDate,
    duration_type: priceData.durationType,
    delivery_address: input.deliveryAddress,
    delivery_latitude: input.deliveryLatitude,
    delivery_longitude: input.deliveryLongitude,
    usage_radius: input.usageRadius,
    status: 'pending',
    deposit_amount: priceData.depositAmount,
    total_price: priceData.totalPrice,
    notes: input.notes,
  } as any);

  if (insertError || !booking) {
    return { error: insertError ? translateError(insertError) : 'Gagal membuat pemesanan' };
  }

  revalidatePath('/bookings');
  revalidatePath('/dashboard/renter');
  revalidatePath('/dashboard/admin');

  return { success: true, bookingId: booking.id };
}

export async function cancelBooking(bookingId: string): Promise<BookingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const { data: bookingData } = await supabase.from('bookings').select('renter_id, status, vehicle_id').eq('id', bookingId).single();
  const booking = bookingData as { renter_id: string; status: string; vehicle_id: string | null } | null;
  if (!booking) return { error: 'Pemesanan tidak ditemukan' };

  const role = await resolveUserRole(supabase, user);
  const isOwner = booking.renter_id === user.id;
  const isAdmin = role === 'admin';

  if (!isOwner && !isAdmin) {
    return { error: 'Anda tidak memiliki hak akses untuk membatalkan pemesanan ini' };
  }

  const cancellableStatuses = ['pending', 'confirmed', 'in_delivery'];
  if (!cancellableStatuses.includes(booking.status)) {
    return {
      error: `Pemesanan dengan status "${booking.status}" tidak dapat dibatalkan`,
    };
  }

  try {
    if (booking.vehicle_id) {
      await updateBookingAndVehicleStatus(bookingId, booking.vehicle_id, 'cancelled', 'available');
    } else {
      const { error } = await updateBookingStatus(bookingId, 'cancelled');
      if (error) return { error: translateError(error) };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Gagal membatalkan pemesanan: ${translateError(message)}` };
  }

  revalidatePath('/bookings');
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath('/dashboard/owner');
  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard/renter');

  return { success: true, bookingId };
}

export async function confirmBooking(bookingId: string): Promise<BookingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const booking = await getBookingById(bookingId);
  if (!booking) return { error: 'Pemesanan tidak ditemukan' };
  if (booking.status !== 'pending') {
    return { error: "Hanya pemesanan dengan status 'menunggu konfirmasi' yang bisa dikonfirmasi" };
  }

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') {
    return { error: 'Hanya admin yang dapat mengonfirmasi pemesanan' };
  }

  if (!booking.vehicle_id) {
    return { error: 'Data kendaraan pada pemesanan tidak ditemukan' };
  }

  try {
    await updateBookingAndVehicleStatus(bookingId, booking.vehicle_id, 'in_delivery', 'rented');

    // Jadwal pengantaran otomatis jam 7 pagi
    const deliveryTime = new Date(booking.start_date);
    deliveryTime.setHours(7, 0, 0, 0);

    await (supabase.from('delivery_schedules') as any).insert({
      booking_id: booking.id,
      departure_time: deliveryTime.toISOString(),
      delivery_status: 'assigned',
      notes: 'Jadwal otomatis dibuat sistem pada pukul 07:00 WIB',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Gagal mengonfirmasi pemesanan: ${translateError(message)}` };
  }

  revalidatePath('/bookings');
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath('/dashboard/owner');
  revalidatePath('/dashboard/admin');

  return { success: true, bookingId };
}

export async function completeBooking(bookingId: string): Promise<BookingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const { data: bookingData } = await supabase.from('bookings').select('status, vehicle_id').eq('id', bookingId).single();
  const booking = bookingData as { status: string; vehicle_id: string; } | null;
  if (!booking) return { error: 'Pemesanan tidak ditemukan' };

  const completableStatuses = ['active', 'returning'];
  if (!completableStatuses.includes(booking.status)) {
    return { error: `Pemesanan dengan status "${booking.status}" belum bisa diselesaikan` };
  }

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') {
    return { error: 'Hanya admin yang dapat menyelesaikan pemesanan' };
  }

  try {
    await updateBookingAndVehicleStatus(bookingId, booking.vehicle_id, 'completed', 'available');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Gagal menyelesaikan pemesanan: ${translateError(message)}` };
  }

  revalidatePath('/bookings');
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath('/dashboard/owner');
  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard/renter');
  revalidatePath('/vehicles');

  return { success: true, bookingId };
}

export async function returnVehicle(bookingId: string): Promise<BookingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const { data: bookingData } = await supabase.from('bookings').select('renter_id, status').eq('id', bookingId).single();
  const booking = bookingData as { renter_id: string; status: string } | null;
  if (!booking) return { error: 'Pemesanan tidak ditemukan' };

  if (booking.renter_id !== user.id) {
    return { error: 'Hanya penyewa yang dapat mengembalikan kendaraan' };
  }

  if (booking.status !== 'active') {
    return { error: 'Kendaraan hanya bisa dikembalikan saat status sedang digunakan' };
  }

  const { error } = await updateBookingStatus(bookingId, 'returning');
  if (error) return { error: translateError(error) };

  revalidatePath('/bookings');
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath('/dashboard/owner');

  return { success: true, bookingId };
}

export async function getMyBookings(): Promise<BookingWithVehicle[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];
  return getBookingsByRenter(user.id);
}

export async function getOwnerBookings(): Promise<BookingWithVehicle[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];
  return getBookingsByOwner(user.id);
}
