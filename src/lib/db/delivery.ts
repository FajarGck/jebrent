"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  DeliverySchedule,
  DeliveryStatus,
  DeliveryWithDetails,
} from "@/types/database";
import { translateError } from "@/lib/helper/error-translator";

export async function insertDeliverySchedule(
  data: Omit<DeliverySchedule, "id" | "created_at">
): Promise<{ data: DeliverySchedule | null; error: string | null }> {
  const supabase = await createClient();
  const { data: result, error } = await (supabase
    .from("delivery_schedules") as any)
    .insert(data)
    .select()
    .single();

  if (error) return { data: null, error: translateError(error.message) };
  return { data: result as DeliverySchedule, error: null };
}

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

export async function updateDeliveryStatus(
  id: string,
  status: DeliveryStatus,
  proofImageUrl?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const updates: Record<string, string> = { delivery_status: status };
  if (status === "delivered") {
    updates.completed_at = new Date().toISOString();
    if (proofImageUrl) updates.proof_image_url = proofImageUrl;
  }

  const { error } = await (supabase.from("delivery_schedules") as any)
    .update(updates)
    .eq("id", id);

  if (error) return { error: translateError(error.message) };
  return { error: null };
}

export async function getAllDeliveries(): Promise<DeliveryWithDetails[]> {
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
    .order("departure_time", { ascending: false }) as any);

  if (error || !data) return [];
  return data as DeliveryWithDetails[];
}
