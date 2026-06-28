// Data Access Layer: Reviews
import { createClient } from "@/lib/supabase/server";

export type Review = {
  id: string;
  booking_id: string;
  vehicle_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
};

/**
 * Ambil semua review untuk kendaraan tertentu, beserta data reviewer.
 */
export async function getReviewsByVehicle(
  vehicleId: string
): Promise<Review[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      *,
      profiles (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Review[];
}

/**
 * Simpan review baru ke database.
 */
export async function insertReview(
  data: Omit<Review, "id" | "created_at" | "profiles">
): Promise<{ data: Review | null; error: string | null }> {
  const supabase = await createClient();
  const { data: result, error } = await (supabase
    .from("reviews") as any)
    .insert(data)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: result as Review, error: null };
}
