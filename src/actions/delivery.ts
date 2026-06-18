"use server";
// =============================================================
// src/actions/delivery.ts
// Server Actions: Delivery Flow — Dev A ONLY
// =============================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth";
import {
  insertDeliverySchedule,
  getDeliveriesByDriver,
  updateDeliveryStatus as dbUpdateDeliveryStatus,
} from "@/lib/db/delivery";
import type { DeliveryWithDetails } from "@/types/database";
import type {
  DeliveryActionResult,
  AssignDriverInput,
  UpdateDeliveryStatusInput,
} from "@/types/booking";

// =============================================================
// ASSIGN DRIVER
// =============================================================

/**
 * Assign pengantar (driver) ke sebuah booking.
 * Hanya bisa dilakukan oleh: admin atau owner kendaraan.
 *
 * Flow:
 * 1. Cek auth + permission (admin/owner only)
 * 2. Cek booking sudah confirmed dan belum punya delivery
 * 3. Insert delivery_schedule
 * 4. Update booking status ke "in_delivery"
 */
export async function assignDriver(
  input: AssignDriverInput
): Promise<DeliveryActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const role = await resolveUserRole(supabase, user);
  if (role !== "admin" && role !== "owner") {
    return { error: "Hanya admin atau pemilik yang dapat assign pengantar" };
  }

  // Verifikasi booking statusnya confirmed atau paid
  const { data: bookingData } = await supabase
    .from("bookings")
    .select("status, vehicles(owner_id)")
    .eq("id", input.bookingId)
    .single();

  const booking = bookingData as {
    status: string;
    vehicles: { owner_id: string } | null;
  } | null;

  if (!booking) return { error: "Booking tidak ditemukan" };

  const assignableStatuses = ["confirmed", "paid"];
  if (!assignableStatuses.includes(booking.status)) {
    return {
      error: `Booking dengan status "${booking.status}" belum bisa di-assign driver`,
    };
  }

  // Owner hanya bisa assign untuk kendaraannya sendiri
  if (role === "owner" && booking.vehicles?.owner_id !== user.id) {
    return { error: "Anda hanya bisa assign driver untuk kendaraan milik Anda" };
  }

  // Insert delivery schedule
  const { data: delivery, error: insertError } = await insertDeliverySchedule({
    booking_id: input.bookingId,
    driver_id: input.driverId,
    departure_time: input.departureTime,
    delivery_status: "assigned",
    notes: input.notes,
    completed_at: null,
  });

  if (insertError || !delivery) {
    return { error: insertError ?? "Gagal membuat jadwal pengantaran" };
  }

  // Update booking status ke in_delivery
  await (supabase.from("bookings") as any)
    .update({ status: "in_delivery", updated_at: new Date().toISOString() })
    .eq("id", input.bookingId);

  revalidatePath(`/bookings/${input.bookingId}`);
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/owner");

  return { success: true, deliveryId: delivery.id };
}

// =============================================================
// UPDATE DELIVERY STATUS
// =============================================================

/**
 * Driver mengupdate status pengantaran.
 * Hanya bisa dilakukan oleh driver yang di-assign, atau admin.
 */
export async function updateDeliveryStatus(
  input: UpdateDeliveryStatusInput
): Promise<DeliveryActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Verifikasi driver adalah yang di-assign
  const { data: deliveryData } = await supabase
    .from("delivery_schedules")
    .select("driver_id, booking_id")
    .eq("id", input.deliveryId)
    .single();

  const delivery = deliveryData as {
    driver_id: string;
    booking_id: string;
  } | null;

  if (!delivery) return { error: "Jadwal pengantaran tidak ditemukan" };

  const role = await resolveUserRole(supabase, user);
  const isAssignedDriver = delivery.driver_id === user.id;
  const isAdmin = role === "admin";

  if (!isAssignedDriver && !isAdmin) {
    return { error: "Anda tidak memiliki izin untuk update status ini" };
  }

  const { error } = await dbUpdateDeliveryStatus(
    input.deliveryId,
    input.status
  );
  if (error) return { error };

  // Jika delivery selesai, update booking status ke active
  if (input.status === "delivered") {
    await (supabase.from("bookings") as any)
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", delivery.booking_id);
  }

  revalidatePath("/dashboard/driver");
  revalidatePath(`/bookings/${delivery.booking_id}`);

  return { success: true, deliveryId: input.deliveryId };
}

// =============================================================
// GET — untuk Driver Dashboard
// =============================================================

/**
 * Ambil semua jadwal delivery untuk driver yang sedang login.
 * Digunakan di: dashboard/driver/page.tsx dan dashboard/driver/deliveries/page.tsx
 */
export async function getDriverDeliveries(): Promise<DeliveryWithDetails[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];
  return getDeliveriesByDriver(user.id);
}

// =============================================================
// GET DRIVERS
// =============================================================

/**
 * Ambil daftar semua driver yang tersedia.
 * Digunakan untuk dropdown Assign Driver oleh Owner/Admin.
 */
export async function getAvailableDrivers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("role", "driver")
    .order("full_name");

  if (error || !data) return [];
  return data;
}
