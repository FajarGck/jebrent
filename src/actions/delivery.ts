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
import { updateBookingAndVehicleStatus } from "@/lib/db/bookings";
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
    proof_image_url: null,
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
// UPDATE DELIVERY STATUS (simple: assigned → on_the_way)
// =============================================================

export async function updateDeliveryStatus(
  input: UpdateDeliveryStatusInput
): Promise<DeliveryActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

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
  if (delivery.driver_id !== user.id && role !== "admin") {
    return { error: "Anda tidak memiliki izin untuk update status ini" };
  }

  const { error } = await dbUpdateDeliveryStatus(input.deliveryId, input.status);
  if (error) return { error };

  revalidatePath("/dashboard/driver");
  revalidatePath(`/bookings/${delivery.booking_id}`);

  return { success: true, deliveryId: input.deliveryId };
}

// =============================================================
// COMPLETE DELIVERY (on_the_way → delivered + foto wajib)
// =============================================================

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROOF_SIZE = 5 * 1024 * 1024;

export async function completeDelivery(
  formData: FormData
): Promise<DeliveryActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const deliveryId = formData.get("delivery_id") as string;
  const vehicleId = formData.get("vehicle_id") as string | null;
  const file = formData.get("proof_file") as File;

  if (!deliveryId) return { error: "Data tidak lengkap" };
  if (!file || file.size === 0) return { error: "Foto bukti pengantaran wajib diupload" };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: "Format file harus JPG, PNG, atau WebP" };
  if (file.size > MAX_PROOF_SIZE) return { error: "Ukuran file maksimal 5MB" };

  const { data: deliveryData } = await supabase
    .from("delivery_schedules")
    .select("driver_id, booking_id")
    .eq("id", deliveryId)
    .single();

  const delivery = deliveryData as { driver_id: string; booking_id: string } | null;
  if (!delivery) return { error: "Jadwal pengantaran tidak ditemukan" };

  const role = await resolveUserRole(supabase, user);
  if (delivery.driver_id !== user.id && role !== "admin") {
    return { error: "Anda tidak memiliki izin" };
  }

  // Upload foto
  const ext = file.name.split(".").pop();
  const path = `${user.id}/${delivery.booking_id}/${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("delivery-proofs")
    .upload(path, file, { contentType: file.type });

  if (uploadErr) return { error: `Gagal upload: ${uploadErr.message}` };

  const { data: urlData } = supabase.storage.from("delivery-proofs").getPublicUrl(path);

  // Update delivery → delivered
  const { error: dbErr } = await dbUpdateDeliveryStatus(deliveryId, "delivered", urlData.publicUrl);
  if (dbErr) return { error: dbErr };

  // Update booking → active via RPC (bypass RLS for driver)
  // Get vehicle_id from client FormData because RLS blocks driver from querying `bookings`
  if (vehicleId) {
    await updateBookingAndVehicleStatus(
      delivery.booking_id,
      vehicleId,
      "active",
      "rented"
    );
  }

  revalidatePath("/dashboard/driver");
  revalidatePath(`/bookings/${delivery.booking_id}`);

  return { success: true, deliveryId };
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

// =============================================================
// ADMIN DIRECT COMPLETE DELIVERY
// =============================================================

export async function adminCompleteDelivery(
  deliveryId: string
): Promise<DeliveryActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const role = await resolveUserRole(supabase, user);
  if (role !== "admin") {
    return { error: "Hanya admin yang memiliki izin untuk menandai sudah diantar" };
  }

  const { data: deliveryData } = await supabase
    .from("delivery_schedules")
    .select("booking_id, bookings(vehicle_id)")
    .eq("id", deliveryId)
    .single();

  const delivery = deliveryData as any;
  if (!delivery) return { error: "Jadwal pengantaran tidak ditemukan" };

  const vehicleId = delivery.bookings?.vehicle_id;

  // Update delivery status to delivered
  const { error: dbErr } = await dbUpdateDeliveryStatus(deliveryId, "delivered");
  if (dbErr) return { error: dbErr };

  // Update booking status to active and vehicle status to rented
  if (vehicleId) {
    await updateBookingAndVehicleStatus(
      delivery.booking_id,
      vehicleId,
      "active",
      "rented"
    );
  }

  revalidatePath("/dashboard/admin/deliveries");
  revalidatePath(`/bookings/${delivery.booking_id}`);

  return { success: true };
}

export async function getAutoDeliveryHour(): Promise<number> {
  const supabase = await createClient();
  const { data } = await (supabase
    .from('system_settings') as any)
    .select('value')
    .eq('key', 'auto_delivery_hour')
    .maybeSingle();
  return data ? parseInt(data.value, 10) : 7;
}

export async function updateAutoDeliveryHour(hour: number): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') return { error: 'Hanya admin yang dapat mengubah pengaturan ini' };

  if (hour < 0 || hour > 23) return { error: 'Jam harus antara 0 sampai 23' };

  const { error } = await (supabase.from('system_settings') as any)
    .upsert({ key: 'auto_delivery_hour', value: hour.toString(), updated_at: new Date().toISOString() });

  if (error) return { error: error.message };

  revalidatePath('/dashboard/admin/deliveries');
  return { success: true };
}
