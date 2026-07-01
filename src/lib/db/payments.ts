'use server';

import { createClient } from "@/lib/supabase/server";
import type { Payment, PaymentStatus, PaymentWithBooking } from "@/types/database";
import { translateError } from "@/lib/helper/error-translator";

export async function insertPayment(
  data: Omit<Payment, "id" | "created_at">
): Promise<{ data: Payment | null; error: string | null }> {
  const supabase = await createClient();
  const { data: result, error } = await (supabase.from("payments") as any)
    .insert(data)
    .select()
    .single();

  if (error) return { data: null, error: translateError(error.message) };
  return { data: result as Payment, error: null };
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from("payments")
    .select("*")
    .eq("id", id)
    .single() as any);

  if (error || !data) return null;
  return data as Payment;
}

export async function getPaymentByBookingId(
  bookingId: string
): Promise<Payment | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single() as any);

  if (error || !data) return null;
  return data as Payment;
}

export async function getPendingPayments(): Promise<PaymentWithBooking[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from("payments")
    .select(`
      *,
      bookings (
        *,
        vehicles ( id, brand, model, plate_number ),
        profiles ( id, full_name )
      )
    `)
    .eq("status", "pending_confirmation")
    .order("created_at", { ascending: false }) as any);

  if (error || !data) return [];
  return data as PaymentWithBooking[];
}

export async function getAllPayments(): Promise<PaymentWithBooking[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from("payments")
    .select(`
      *,
      bookings (
        *,
        vehicles ( id, brand, model, plate_number ),
        profiles ( id, full_name )
      )
    `)
    .order("created_at", { ascending: false }) as any);

  if (error || !data) return [];
  return data as PaymentWithBooking[];
}

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  confirmedBy?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const updates: Record<string, string> = { status };
  if (status === "confirmed") {
    updates.confirmed_at = new Date().toISOString();
    if (confirmedBy) updates.confirmed_by = confirmedBy;
  }

  const { error } = await (supabase.from("payments") as any)
    .update(updates)
    .eq("id", id);

  if (error) return { error: translateError(error.message) };
  return { error: null };
}
