import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user role and redirect to role-specific dashboard
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  switch (profile.role) {
    case "admin":
      redirect("/dashboard/admin");
    case "owner":
      redirect("/dashboard/owner");
    case "driver":
      redirect("/dashboard/driver");
    default:
      // Renter doesn't have a dashboard, redirect to bookings
      redirect("/bookings");
  }
}
