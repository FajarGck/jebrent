'use server';

import { createClient } from '@/lib/supabase/server';
import type { Booking, BookingWithDetails, BookingWithVehicle, BookingStatus } from '@/types/database';
import { translateError } from '@/lib/helper/error-translator';

export async function insertBooking(data: Omit<Booking, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Booking | null; error: string | null }> {
  const supabase = await createClient();
  const { data: result, error } = await (supabase.from('bookings') as any).insert(data).select().single();

  if (error) return { data: null, error: translateError(error.message) };
  return { data: result as Booking, error: null };
}

export async function getBookingById(id: string): Promise<BookingWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from('bookings')
    .select(
      `
      *,
      vehicles (
        *,
        vehicle_images (*),
        profiles ( id, full_name, phone )
      ),
      profiles ( id, full_name, phone, avatar_url ),
      payments (*),
      reviews (*),
      delivery_schedules (
        *,
        profiles ( id, full_name, phone )
      )
    `,
    )
    .eq('id', id)
    .single() as any);

  if (error || !data) return null;
  return data as BookingWithDetails;
}

export async function getBookingsByRenter(renterId: string): Promise<BookingWithVehicle[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from('bookings')
    .select(
      `
      *,
      vehicles (
        *,
        vehicle_images (*)
      ),
      profiles ( id, full_name, phone, avatar_url )
    `,
    )
    .eq('renter_id', renterId)
    .order('created_at', { ascending: false }) as any);

  if (error || !data) return [];
  return data as BookingWithVehicle[];
}

export async function getBookingsByVehicle(vehicleId: string): Promise<BookingWithVehicle[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from('bookings')
    .select(
      `
      *,
      vehicles (
        *,
        vehicle_images (*)
      ),
      profiles ( id, full_name, phone, avatar_url )
    `,
    )
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false }) as any);

  if (error || !data) return [];
  return data as BookingWithVehicle[];
}

export async function getBookingsByOwner(ownerId: string): Promise<BookingWithVehicle[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase
    .from('bookings')
    .select(
      `
      *,
      vehicles!inner (
        *,
        vehicle_images (*)
      ),
      profiles ( id, full_name, phone, avatar_url )
    `,
    )
    .eq('vehicles.owner_id', ownerId)
    .order('created_at', { ascending: false }) as any);

  if (error || !data) return [];
  return data as BookingWithVehicle[];
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await (supabase.from('bookings') as any).update({ status, updated_at: new Date().toISOString() }).eq('id', id);

  if (error) return { error: translateError(error.message) };
  return { error: null };
}

export async function updateBookingAndVehicleStatus(
  bookingId: string,
  vehicleId: string,
  bookingStatus: 'confirmed' | 'pending' | 'paid' | 'in_delivery' | 'active' | 'returning' | 'completed' | 'cancelled',
  vehicleStatus: 'available' | 'rented' | 'maintenance' | 'inactive',
) {
  const supabase = await createClient();

  const { error } = await (supabase.rpc as any)('confirm_booking_transaction', {
    p_booking_id: bookingId,
    p_vehicle_id: vehicleId,
    p_booking_status: bookingStatus,
    p_vehicle_status: vehicleStatus,
  });

  if (error) {
    console.error('Error updating booking and vehicle status:', error);
    throw new Error(translateError(error.message));
  }
}

export async function checkDateOverlap(vehicleId: string, startDate: string, endDate: string, excludeBookingId?: string): Promise<boolean> {
  const supabase = await createClient();

  const activeStatuses = ['pending', 'confirmed', 'paid', 'in_delivery', 'active', 'returning'];

  let query = supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId)
    .in('status', activeStatuses)
    .lt('start_date', endDate)
    .gt('end_date', startDate) as any;

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { count, error } = await query;
  if (error) return true;
  return (count ?? 0) > 0;
}

export async function countBookingsByRenter(renterId: string, status?: BookingStatus): Promise<number> {
  const supabase = await createClient();
  let query = supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('renter_id', renterId);

  if (status) query = (query as any).eq('status', status);

  const { count } = await (query as any);
  return count ?? 0;
}
