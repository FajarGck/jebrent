// =============================================================
// src/lib/db/bookings.ts
// Data Access Layer: Bookings — Dev A ONLY
// =============================================================
// Aturan:
//  - File ini HANYA berisi query Supabase. Tidak ada business logic.
//  - Business logic (validasi, kalkulasi harga, cek permission) → actions/bookings.ts
//  - Semua fungsi async, return { data, error } atau array kosong [] jika gagal
// =============================================================

import { createClient } from "@/lib/supabase/server";
import type {
  Booking,
  BookingWithDetails,
  BookingWithVehicle,
  BookingStatus,
} from "@/types/database";

// =============================================================
// INSERT
// =============================================================

/**
 * Insert booking baru ke tabel bookings.
 * Dipanggil oleh: actions/bookings.ts → createBooking()
 *
 * @param data - semua field Booking kecuali id, created_at, updated_at
 * @returns booking yang baru dibuat, atau error
 */
export async function insertBooking(
  data: Omit<Booking, "id" | "created_at" | "updated_at">
): Promise<{ data: Booking | null; error: string | null }> {
  const supabase = await createClient();
  const { data: result, error } = await (supabase.from("bookings") as any)
    .insert(data)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: result as Booking, error: null };
}

// =============================================================
// SELECT — Single Record
// =============================================================

/**
 * Ambil 1 booking by ID, dengan join ke vehicles dan profiles.
 * Digunakan untuk halaman detail booking (bookings/[id]/page.tsx)
 *
 * @param id - booking UUID
 */
export async function getBookingById(
  id: string
): Promise<BookingWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from("bookings")
    .select(`
      *,
      vehicles (
        *,
        vehicle_images (*),
        profiles ( id, full_name, phone )
      ),
      profiles ( id, full_name, phone, avatar_url ),
      payments (*),
      delivery_schedules (
        *,
        profiles ( id, full_name, phone )
      )
    `)
    .eq("id", id)
    .single() as any);

  if (error || !data) return null;
  return data as BookingWithDetails;
}

// =============================================================
// SELECT — Collections
// =============================================================

/**
 * Ambil semua booking milik seorang renter (penyewa).
 * Digunakan untuk: bookings/page.tsx (dari sisi penyewa)
 *
 * @param renterId - UUID penyewa (auth user id)
 */
export async function getBookingsByRenter(
  renterId: string
): Promise<BookingWithVehicle[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from("bookings")
    .select(`
      *,
      vehicles (
        *,
        vehicle_images (*)
      ),
      profiles ( id, full_name, phone, avatar_url )
    `)
    .eq("renter_id", renterId)
    .order("created_at", { ascending: false }) as any);

  if (error || !data) return [];
  return data as BookingWithVehicle[];
}

/**
 * Ambil semua booking untuk kendaraan milik seorang owner.
 * Digunakan untuk: dashboard/owner — list booking masuk
 *
 * @param vehicleId - UUID kendaraan milik owner
 */
export async function getBookingsByVehicle(
  vehicleId: string
): Promise<BookingWithVehicle[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from("bookings")
    .select(`
      *,
      vehicles (
        *,
        vehicle_images (*)
      ),
      profiles ( id, full_name, phone, avatar_url )
    `)
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false }) as any);

  if (error || !data) return [];
  return data as BookingWithVehicle[];
}

/**
 * Ambil semua booking untuk semua kendaraan milik owner tertentu.
 * Lebih efisien daripada loop getBookingsByVehicle untuk setiap kendaraan.
 *
 * @param ownerId - UUID pemilik kendaraan
 */
export async function getBookingsByOwner(
  ownerId: string
): Promise<BookingWithVehicle[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from("bookings")
    .select(`
      *,
      vehicles!inner (
        *,
        vehicle_images (*)
      ),
      profiles ( id, full_name, phone, avatar_url )
    `)
    .eq("vehicles.owner_id", ownerId)
    .order("created_at", { ascending: false }) as any);

  if (error || !data) return [];
  return data as BookingWithVehicle[];
}

// =============================================================
// UPDATE
// =============================================================

/**
 * Update status booking.
 * Dipanggil oleh: confirmBooking, cancelBooking, completeBooking di actions/
 *
 * @param id - booking UUID
 * @param status - BookingStatus baru
 */
export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await (supabase.from("bookings") as any)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateBookingAndVehicleStatus(
  bookingId: string,
  vehicleId: string,
  bookingStatus: 'confirmed' | 'pending' | 'paid' | 'in_delivery' | 'active' | 'returning' | 'completed' | 'cancelled',
  vehicleStatus: 'available' | 'rented' | 'maintenance' | 'inactive'
) {
  const supabase = await createClient();

  // Bypass TypeScript error menggunakan 'as any' karena tipe RPC belum di-generate (supabase gen types)
  const { error } = await (supabase.rpc as any)('confirm_booking_transaction', {
    p_booking_id: bookingId,
    p_vehicle_id: vehicleId,
    p_booking_status: bookingStatus,
    p_vehicle_status: vehicleStatus
  });


  if (error) {
    console.error("Error updating booking and vehicle status:", error);
    throw new Error(error.message);
  }
}

// =============================================================
// VALIDATION HELPER
// =============================================================

/**
 * Cek apakah ada booking yang overlap (tanggal bentrok) untuk kendaraan tertentu.
 * Overlap terjadi jika: startDate < booking.end_date AND endDate > booking.start_date
 *
 * @param vehicleId - UUID kendaraan
 * @param startDate - tanggal mulai baru (format: "YYYY-MM-DD")
 * @param endDate   - tanggal selesai baru (format: "YYYY-MM-DD")
 * @param excludeBookingId - opsional: exclude booking ini dari cek (untuk edit booking)
 * @returns true jika ada overlap (tanggal TIDAK bisa dipakai)
 */
export async function checkDateOverlap(
  vehicleId: string,
  startDate: string,
  endDate: string,
  excludeBookingId?: string
): Promise<boolean> {
  const supabase = await createClient();

  // Hanya cek booking yang AKTIF (bukan cancelled/completed)
  const activeStatuses = ["pending", "confirmed", "paid", "in_delivery", "active", "returning"];

  let query = (supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .in("status", activeStatuses)
    // Overlap condition: start < other.end_date AND end > other.start_date
    .lt("start_date", endDate)
    .gt("end_date", startDate) as any);

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { count, error } = await query;
  if (error) return true; // Fail-safe: anggap overlap jika query error
  return (count ?? 0) > 0;
}

// =============================================================
// AGGREGATE / STATS (untuk Dashboard)
// =============================================================

/**
 * Hitung total booking berdasarkan renter ID dan status tertentu.
 * Digunakan untuk dashboard stats renter.
 */
export async function countBookingsByRenter(
  renterId: string,
  status?: BookingStatus
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("renter_id", renterId);

  if (status) query = (query as any).eq("status", status);

  const { count } = await (query as any);
  return count ?? 0;
}
