"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth";
import { insertReview } from "@/lib/db/reviews";
import { translateError } from "@/lib/helper/error-translator";

export async function createReview(
  bookingId: string,
  rating: number,
  comment?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' };

  const role = await resolveUserRole(supabase, user);
  if (role !== "renter") {
    return { error: "Hanya penyewa yang dapat memberikan ulasan" };
  }

  const { data: bookingData, error: bookingErr } = await (supabase
    .from("bookings") as any)
    .select("renter_id, vehicle_id, status")
    .eq("id", bookingId)
    .single();

  const booking = bookingData as { renter_id: string; vehicle_id: string; status: string } | null;

  if (bookingErr || !booking) {
    return { error: "Pemesanan tidak ditemukan" };
  }

  if (booking.renter_id !== user.id) {
    return { error: "Anda tidak memiliki hak akses untuk memberikan ulasan pada pemesanan ini" };
  }

  if (booking.status !== "completed") {
    return { error: "Anda hanya bisa mengulas setelah penyewaan selesai" };
  }

  const { error: insertErr } = await insertReview({
    booking_id: bookingId,
    vehicle_id: booking.vehicle_id,
    reviewer_id: user.id,
    rating,
    comment: comment || null,
  });

  if (insertErr) {
    return { error: `Gagal mengirim ulasan: ${translateError(insertErr)}` };
  }

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/vehicles/${booking.vehicle_id}`);
  revalidatePath(`/dashboard/renter/bookings`);

  return { success: true };
}
