// =============================================================
// src/lib/db/delivery.ts  [NEW FILE]
// Data Access Layer: Delivery Schedules — Dev A ONLY
// =============================================================
// Aturan:
//  - Hanya query Supabase. Tidak ada business logic.
//  - Business logic → actions/delivery.ts
// =============================================================

import { createClient } from "@/lib/supabase/server";
import type {
  DeliverySchedule,
  DeliveryStatus,
  DeliveryWithDetails,
} from "@/types/database";

// =============================================================
// INSERT
// =============================================================

/**
 * Insert jadwal delivery baru.
 * Dipanggil oleh: actions/delivery.ts → assignDriver()
 *
 * @param data - semua field DeliverySchedule kecuali id dan created_at
 */
export async function insertDeliverySchedule(
  data: Omit<DeliverySchedule, "id" | "created_at">
): Promise<{ data: DeliverySchedule | null; error: string | null }> {
  const supabase = await createClient();
  const { data: result, error } = await (supabase
    .from("delivery_schedules") as any)
    .insert(data)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: result as DeliverySchedule, error: null };
}

// =============================================================
// SELECT
// =============================================================

/**
 * Ambil delivery schedule untuk booking tertentu, dengan detail driver.
 * Digunakan di halaman detail booking.
 *
 * @param bookingId - UUID booking
 */
export async function getDeliveryByBooking(
  bookingId: string
): Promise<DeliveryWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from("delivery_schedules")
    .select(`
      *,
      profiles ( id, full_name, phone, avatar_url ),
      bookings (
        *,
        vehicles ( id, brand, model, plate_number ),
        profiles ( id, full_name, phone )
      )
    `)
    .eq("booking_id", bookingId)
    .single() as any);

  if (error || !data) return null;
  return data as DeliveryWithDetails;
}

/**
 * Ambil semua delivery schedule yang di-assign ke driver tertentu.
 * Digunakan di dashboard driver.
 *
 * @param driverId - UUID driver (auth user id)
 */
export async function getDeliveriesByDriver(
  driverId: string
): Promise<DeliveryWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from("delivery_schedules")
    .select(`
      *,
      profiles ( id, full_name, phone, avatar_url ),
      bookings (
        *,
        vehicles ( id, brand, model, plate_number ),
        profiles ( id, full_name, phone )
      )
    `)
    .eq("driver_id", driverId)
    .order("departure_time", { ascending: true }) as any);

  if (error || !data) return [];
  return data as DeliveryWithDetails[];
}

// =============================================================
// UPDATE
// =============================================================

/**
 * Update status delivery schedule.
 * Dipanggil oleh: actions/delivery.ts → updateDeliveryStatus()
 *
 * @param id - delivery schedule UUID
 * @param status - DeliveryStatus baru
 */
export async function updateDeliveryStatus(
  id: string,
  status: DeliveryStatus
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const updates: Record<string, string> = { delivery_status: status };
  if (status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await (supabase.from("delivery_schedules") as any)
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}
