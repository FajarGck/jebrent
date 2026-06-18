"use server";
// =============================================================
// src/actions/bookings.ts
// Server Actions: Booking Flow — Dev A ONLY
// =============================================================
// Layer ini adalah "Use Case" — berisi business logic:
//  ✅ Validasi input
//  ✅ Cek permission (siapa yang boleh melakukan aksi ini?)
//  ✅ Kalkulasi harga
//  ✅ Orchestrasi panggilan ke lib/db/
//  ✅ Revalidate Next.js cache setelah mutasi
//
// JANGAN taruh query Supabase langsung di sini → pakai lib/db/bookings.ts
// =============================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth";
import { DEPOSIT_PERCENTAGE } from "@/lib/constants";
import {
  insertBooking,
  getBookingsByRenter,
  getBookingsByOwner,
  updateBookingStatus,
  checkDateOverlap,
  getBookingById,
  updateBookingAndVehicleStatus,
} from "@/lib/db/bookings";
import { getVehicleById } from "@/lib/db/vehicles";
import type { BookingWithVehicle } from "@/types/database";
import type {
  BookingActionResult,
  CreateBookingInput,
  PriceBreakdown,
} from "@/types/booking";

// =============================================================
// HELPER: Kalkulasi Harga
// =============================================================

/**
 * Hitung jumlah hari antara dua tanggal (inklusif start, eksklusif end).
 * Contoh: 1 Jan - 3 Jan = 2 hari.
 */
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Hitung breakdown harga sewa berdasarkan tipe durasi.
 * Dipanggil dari booking-form.tsx (untuk preview harga real-time)
 * dan dari createBooking (untuk menyimpan total_price ke DB).
 */
export async function calculatePriceBreakdown(
  vehicleId: string,
  startDate: string,
  endDate: string
): Promise<{ data: PriceBreakdown | null; error: string | null }> {
  const vehicle = await getVehicleById(vehicleId);
  if (!vehicle) return { data: null, error: "Kendaraan tidak ditemukan" };

  const numberOfDays = calculateDays(startDate, endDate);
  const dailyRate = vehicle.daily_rate;
  const halfDayRate = vehicle.half_day_rate;

  // Gunakan weekly_rate jika tersedia dan durasi >= 7 hari
  let subtotal: number;
  let durationType: CreateBookingInput["durationType"] = "daily";

  if (numberOfDays >= 7 && vehicle.weekly_rate) {
    const weeks = Math.floor(numberOfDays / 7);
    const remainingDays = numberOfDays % 7;
    subtotal = weeks * vehicle.weekly_rate + remainingDays * dailyRate;
    durationType = "weekly";
  } else {
    subtotal = numberOfDays * dailyRate;
    durationType = "daily";
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

// =============================================================
// CREATE BOOKING  ← PALING KRITIKAL untuk Dev B
// =============================================================

/**
 * Membuat booking baru.
 *
 * Flow:
 * 1. Cek autentikasi (harus login)
 * 2. Validasi input dasar
 * 3. Ambil data kendaraan (pastikan ada & available)
 * 4. Cek overlap tanggal dengan booking lain
 * 5. Hitung total_price dan deposit_amount
 * 6. Insert ke database
 * 7. Revalidate cache
 *
 * Dipanggil dari: components/bookings/booking-form.tsx
 * Dev B butuh bookingId dari hasil ini untuk createPayment()
 */
export async function createBooking(
  input: CreateBookingInput
): Promise<BookingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Anda harus login untuk membuat booking" };

  // Validasi tanggal
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: "Format tanggal tidak valid" };
  }
  if (start < today) {
    return { error: "Tanggal mulai tidak boleh di masa lalu" };
  }
  if (end <= start) {
    return { error: "Tanggal selesai harus setelah tanggal mulai" };
  }

  // Ambil data kendaraan
  const vehicle = await getVehicleById(input.vehicleId);
  if (!vehicle) return { error: "Kendaraan tidak ditemukan" };
  if (vehicle.status !== "available") {
    return { error: "Kendaraan tidak tersedia untuk disewa saat ini" };
  }

  // Cek overlap tanggal
  const hasOverlap = await checkDateOverlap(
    input.vehicleId,
    input.startDate,
    input.endDate
  );
  if (hasOverlap) {
    return {
      error:
        "Kendaraan sudah dibooking pada tanggal yang dipilih. Silakan pilih tanggal lain.",
    };
  }

  // Hitung harga
  const { data: priceData, error: priceError } = await calculatePriceBreakdown(
    input.vehicleId,
    input.startDate,
    input.endDate
  );
  if (priceError || !priceData) {
    return { error: priceError ?? "Gagal menghitung harga" };
  }

  // Insert booking
  const { data: booking, error: insertError } = await insertBooking({
    renter_id: user.id,
    vehicle_id: input.vehicleId,
    start_date: input.startDate,
    end_date: input.endDate,
    duration_type: priceData.durationType,
    delivery_address: input.deliveryAddress,
    status: "pending",
    deposit_amount: priceData.depositAmount,
    total_price: priceData.totalPrice,
    notes: input.notes,
  });

  if (insertError || !booking) {
    return { error: insertError ?? "Gagal membuat booking" };
  }

  revalidatePath("/bookings");
  revalidatePath("/dashboard/renter");

  return { success: true, bookingId: booking.id };
}

// =============================================================
// CANCEL BOOKING  ← KRITIKAL (harus ada agar booking tidak stuck)
// =============================================================

/**
 * Membatalkan booking.
 * Hanya bisa dilakukan oleh: penyewa yang membuat booking, atau admin.
 * Hanya bisa membatalkan booking dengan status: pending atau confirmed.
 */
export async function cancelBooking(
  bookingId: string
): Promise<BookingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Ambil booking untuk verifikasi kepemilikan
  const { data: bookingData } = await supabase
    .from("bookings")
    .select("renter_id, status")
    .eq("id", bookingId)
    .single();

  const booking = bookingData as { renter_id: string; status: string } | null;
  if (!booking) return { error: "Booking tidak ditemukan" };

  const role = await resolveUserRole(supabase, user);
  const isOwner = booking.renter_id === user.id;
  const isAdmin = role === "admin";

  if (!isOwner && !isAdmin) {
    return { error: "Anda tidak memiliki izin untuk membatalkan booking ini" };
  }

  const cancellableStatuses = ["pending", "confirmed"];
  if (!cancellableStatuses.includes(booking.status)) {
    return {
      error: `Booking dengan status "${booking.status}" tidak dapat dibatalkan`,
    };
  }

  const { error } = await updateBookingStatus(bookingId, "cancelled");
  if (error) return { error };

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/dashboard/owner");

  return { success: true, bookingId };
}

// =============================================================
// CONFIRM BOOKING  ← KRITIKAL (trigger Dev B bisa mulai payment)
// =============================================================

/**
 * Owner mengkonfirmasi booking.
 * Setelah confirmed, status booking berubah ke "confirmed"
 * → Dev B bisa trigger payment flow dari sini.
 *
 * Hanya bisa dilakukan oleh: owner kendaraan yang di-booking, atau admin.
 */

export async function confirmBooking(bookingId: string): Promise<BookingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 1. Verifikasi Data & Izin (Logic yang sudah ada)
  const booking = await getBookingById(bookingId); // Pastikan fungsi ini mereturn data + owner_id

  if (!booking) return { error: "Booking tidak ditemukan" };
  if (booking.status !== "pending") {
    return { error: "Hanya booking dengan status 'pending' yang bisa dikonfirmasi" };
  }

  const role = await resolveUserRole(supabase, user);
  const isVehicleOwner = booking.vehicles != null && booking.vehicles.owner_id === user.id;
  const isAdmin = role === "admin";

  if (!isVehicleOwner && !isAdmin) {
    return { error: "Hanya pemilik kendaraan atau admin yang dapat mengkonfirmasi" };
  }

  if (!booking.vehicle_id) {
    return { error: "Data kendaraan pada booking tidak ditemukan" };
  }

  // 2. Gunakan fungsi baru yang melibatkan RPC (update booking & vehicle sekaligus)
  try {
    await updateBookingAndVehicleStatus(
      bookingId,
      booking.vehicle_id,
      "confirmed",
      "rented"
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Gagal mengonfirmasi booking: ${message}` };
  }

  // 3. Revalidate path agar UI sinkron
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/admin"); // Tambahkan path admin jika perlu

  return { success: true, bookingId };
}

// =============================================================
// COMPLETE BOOKING
// =============================================================

/**
 * Menandai booking sebagai selesai.
 * Dipanggil oleh owner atau admin setelah kendaraan kembali.
 * Setelah completed, Dev B bisa trigger review flow.
 */
export async function completeBooking(
  bookingId: string
): Promise<BookingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: bookingData } = await supabase
    .from("bookings")
    .select("status, vehicles(owner_id)")
    .eq("id", bookingId)
    .single();

  const booking = bookingData as {
    status: string;
    vehicles: { owner_id: string } | null;
  } | null;

  if (!booking) return { error: "Booking tidak ditemukan" };

  const completableStatuses = ["active", "returning", "paid"];
  if (!completableStatuses.includes(booking.status)) {
    return { error: `Booking dengan status "${booking.status}" belum bisa diselesaikan` };
  }

  const role = await resolveUserRole(supabase, user);
  const isVehicleOwner = booking.vehicles?.owner_id === user.id;
  const isAdmin = role === "admin";

  if (!isVehicleOwner && !isAdmin) {
    return { error: "Hanya pemilik kendaraan atau admin yang dapat menyelesaikan booking" };
  }

  const { error } = await updateBookingStatus(bookingId, "completed");
  if (error) return { error };

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/renter");

  return { success: true, bookingId };
}

// =============================================================
// GET — untuk UI Pages
// =============================================================

/**
 * Ambil semua booking milik penyewa yang sedang login.
 * Digunakan di: bookings/page.tsx
 */
export async function getMyBookings(): Promise<BookingWithVehicle[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];
  return getBookingsByRenter(user.id);
}

/**
 * Ambil semua booking untuk kendaraan milik owner yang sedang login.
 * Digunakan di: dashboard/owner/bookings/page.tsx (Dev B akan pakai ini)
 */
export async function getOwnerBookings(): Promise<BookingWithVehicle[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];
  return getBookingsByOwner(user.id);
}
