// Server Actions: Reviews
// Handles: CRUD review/rating
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth";
import { insertReview } from "@/lib/db/reviews";

export async function createReview(
  bookingId: string,
  rating: number,
  comment?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const role = await resolveUserRole(supabase, user);
  if (role !== "renter") {
    return { error: "Hanya penyewa yang dapat memberikan ulasan" };
  }

  // Get booking details to verify status and ownership
  const { data: bookingData, error: bookingErr } = await (supabase
    .from("bookings") as any)
    .select("renter_id, vehicle_id, status")
    .eq("id", bookingId)
    .single();

  const booking = bookingData as { renter_id: string; vehicle_id: string; status: string } | null;

  if (bookingErr || !booking) {
    return { error: "Booking tidak ditemukan" };
  }

  if (booking.renter_id !== user.id) {
    return { error: "Anda tidak memiliki izin untuk mengulas booking ini" };
  }

  if (booking.status !== "completed") {
    return { error: "Anda hanya bisa mengulas setelah penyewaan selesai" };
  }

  // Insert review
  const { error: insertErr } = await insertReview({
    booking_id: bookingId,
    vehicle_id: booking.vehicle_id,
    reviewer_id: user.id,
    rating,
    comment: comment || null,
  });

  if (insertErr) {
    return { error: `Gagal mengirim ulasan: ${insertErr}` };
  }

  // Revalidate pages to update ratings/reviews
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/vehicles/${booking.vehicle_id}`);
  revalidatePath(`/dashboard/renter/bookings`);

  return { success: true };
}
