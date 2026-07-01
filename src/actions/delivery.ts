"use server";

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
import { translateError } from "@/lib/helper/error-translator";

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROOF_SIZE = 5 * 1024 * 1024;

export async function assignDriver(
  input: AssignDriverInput
): Promise<DeliveryActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const role = await resolveUserRole(supabase, user);
  if (role !== "admin" && role !== "owner") {
    return { error: "Hanya admin atau pemilik yang dapat menugaskan pengantar" };
  }

  const { data: bookingData } = await supabase
    .from("bookings")
    .select("status, vehicles(owner_id)")
    .eq("id", input.bookingId)
    .single();

  const booking = bookingData as {
    status: string;
    vehicles: { owner_id: string } | null;
  } | null;

  if (!booking) return { error: "Pemesanan tidak ditemukan" };

  const assignableStatuses = ["confirmed", "paid"];
  if (!assignableStatuses.includes(booking.status)) {
    return {
      error: `Pemesanan dengan status "${booking.status}" belum bisa ditugaskan pengantar`,
    };
  }

  if (role === "owner" && booking.vehicles?.owner_id !== user.id) {
    return { error: "Anda hanya bisa menugaskan pengantar untuk kendaraan milik Anda" };
  }

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
    return { error: insertError ? translateError(insertError) : "Gagal membuat jadwal pengantaran" };
  }

  await (supabase.from("bookings") as any)
    .update({ status: "in_delivery", updated_at: new Date().toISOString() })
    .eq("id", input.bookingId);

  revalidatePath(`/bookings/${input.bookingId}`);
  revalidatePath("/dashboard/driver");
  revalidatePath("/dashboard/owner");

  return { success: true, deliveryId: delivery.id };
}

export async function updateDeliveryStatus(
  input: UpdateDeliveryStatusInput
): Promise<DeliveryActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

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
    return { error: "Anda tidak memiliki hak akses untuk mengubah status ini" };
  }

  const { error } = await dbUpdateDeliveryStatus(input.deliveryId, input.status);
  if (error) return { error: translateError(error) };

  revalidatePath("/dashboard/driver");
  revalidatePath(`/bookings/${delivery.booking_id}`);

  return { success: true, deliveryId: input.deliveryId };
}

export async function completeDelivery(
  formData: FormData
): Promise<DeliveryActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const deliveryId = formData.get("delivery_id") as string;
  const vehicleId = formData.get("vehicle_id") as string | null;
  const file = formData.get("proof_file") as File;

  if (!deliveryId) return { error: "Data tidak lengkap" };
  if (!file || file.size === 0) return { error: "Foto bukti pengantaran wajib diunggah" };
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
    return { error: "Anda tidak memiliki hak akses untuk tindakan ini" };
  }

  const ext = file.name.split(".").pop();
  const path = `${user.id}/${delivery.booking_id}/${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("delivery-proofs")
    .upload(path, file, { contentType: file.type });

  if (uploadErr) return { error: `Gagal mengunggah: ${translateError(uploadErr.message)}` };

  const { data: urlData } = supabase.storage.from("delivery-proofs").getPublicUrl(path);

  const { error: dbErr } = await dbUpdateDeliveryStatus(deliveryId, "delivered", urlData.publicUrl);
  if (dbErr) return { error: translateError(dbErr) };

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

export async function getDriverDeliveries(): Promise<DeliveryWithDetails[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];
  return getDeliveriesByDriver(user.id);
}

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

export async function adminCompleteDelivery(
  deliveryId: string
): Promise<DeliveryActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const role = await resolveUserRole(supabase, user);
  if (role !== "admin") {
    return { error: "Hanya admin yang memiliki hak akses untuk menandai sudah diantar" };
  }

  const { data: deliveryData } = await supabase
    .from("delivery_schedules")
    .select("booking_id, bookings(vehicle_id)")
    .eq("id", deliveryId)
    .single();

  const delivery = deliveryData as any;
  if (!delivery) return { error: "Jadwal pengantaran tidak ditemukan" };

  const vehicleId = delivery.bookings?.vehicle_id;

  const { error: dbErr } = await dbUpdateDeliveryStatus(deliveryId, "delivered");
  if (dbErr) return { error: translateError(dbErr) };

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
  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') return { error: 'Hanya admin yang dapat mengubah pengaturan ini' };

  if (hour < 0 || hour > 23) return { error: 'Jam harus antara 0 sampai 23' };

  const { error } = await (supabase.from('system_settings') as any)
    .upsert({ key: 'auto_delivery_hour', value: hour.toString(), updated_at: new Date().toISOString() });

  if (error) return { error: translateError(error.message) };

  revalidatePath('/dashboard/admin/deliveries');
  return { success: true };
}
