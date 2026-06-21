import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBookingById } from '@/lib/db/bookings';
import { resolveUserRole } from '@/lib/auth';
import { getAvailableDrivers } from '@/actions/delivery';
import BookingDetail from '@/components/bookings/booking-detail';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) return { title: 'Booking Tidak Ditemukan — Jebrent' };
  return {
    title: `Booking #${id.slice(0, 8).toUpperCase()} — Jebrent`,
    description: `Detail booking ${booking.vehicles.brand} ${booking.vehicles.model}`,
  };
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/bookings/${id}`);

  const booking = await getBookingById(id);
  if (!booking) notFound();

  // Permission: renter, vehicle owner, driver yang di-assign, atau admin
  const role = await resolveUserRole(supabase, user);
  const isRenter = booking.renter_id === user.id;
  const isAdmin = role === 'admin';
  const isVehicleOwner = role === 'owner' && booking.vehicles?.owner_id === user.id;
  const isAssignedDriver =
    role === 'driver' && booking.delivery_schedules?.booking_id === id;

  if (!isRenter && !isAdmin && !isVehicleOwner && !isAssignedDriver) {
    redirect('/bookings');
  }

  // Jika owner/admin, ambil list driver
  const drivers = (isAdmin || isVehicleOwner) ? await getAvailableDrivers() : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <BookingDetail booking={booking} userRole={role} userId={user.id} drivers={drivers} />
    </div>
  );
}
