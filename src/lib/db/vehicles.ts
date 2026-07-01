import { createClient } from '@/lib/supabase/server';
import type { Vehicle, VehicleImage, VehicleType, VehicleStatus } from '@/types/database';
import { translateError } from '@/lib/helper/error-translator';

export type VehicleFilters = {
  search?: string;
  type?: VehicleType;
  status?: VehicleStatus;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest';
};

export type VehicleWithImages = Vehicle & {
  vehicle_images: VehicleImage[];
  profiles?: { full_name: string; avatar_url: string | null } | null;
};

export async function getVehicles(filters?: VehicleFilters): Promise<VehicleWithImages[]> {
  const supabase = await createClient();
  let query = supabase.from('vehicles').select('*, vehicle_images(*), profiles(full_name, avatar_url)') as any;

  if (filters?.search) {
    const kw = `%${filters.search}%`;
    query = query.or(`brand.ilike.${kw},model.ilike.${kw},plate_number.ilike.${kw}`);
  }
  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.status) query = query.eq('status', filters.status);
  else query = query.neq('status', 'inactive');
  if (filters?.minPrice) query = query.gte('daily_rate', filters.minPrice);
  if (filters?.maxPrice) query = query.lte('daily_rate', filters.maxPrice);

  switch (filters?.sort) {
    case 'price_asc':
      query = query.order('daily_rate', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('daily_rate', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as VehicleWithImages[];
}

export async function getVehiclesByOwner(ownerId: string): Promise<VehicleWithImages[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from('vehicles').select('*, vehicle_images(*)').eq('owner_id', ownerId).order('created_at', { ascending: false }) as any);

  if (error || !data) return [];
  return data as VehicleWithImages[];
}

export async function getVehicleById(id: string): Promise<VehicleWithImages | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from('vehicles').select('*, vehicle_images(*), profiles(full_name, avatar_url)').eq('id', id).single() as any);

  if (error || !data) return null;
  return data as VehicleWithImages;
}

export async function insertVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Vehicle | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from('vehicles') as any).insert(vehicle).select().single();
  if (error) return { data: null, error: translateError(error.message) };
  return { data: data as Vehicle, error: null };
}

export async function updateVehicle(id: string, updates: Partial<Omit<Vehicle, 'id' | 'created_at'>>): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await (supabase.from('vehicles') as any).update(updates).eq('id', id);
  if (error) return { error: translateError(error.message) };
  return { error: null };
}

export async function deleteVehicle(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) return { error: translateError(error.message) };
  return { error: null };
}

export async function insertVehicleImage(image: Omit<VehicleImage, 'id'>): Promise<{ data: VehicleImage | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from('vehicle_images') as any).insert(image).select().single();
  if (error) return { data: null, error: translateError(error.message) };
  return { data: data as VehicleImage, error: null };
}

export async function deleteVehicleImage(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from('vehicle_images').delete().eq('id', id);
  if (error) return { error: translateError(error.message) };
  return { error: null };
}

export async function setVehiclePrimaryImage(imageId: string, vehicleId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  await (supabase.from('vehicle_images') as any).update({ is_primary: false }).eq('vehicle_id', vehicleId);
  const { error } = await (supabase.from('vehicle_images') as any).update({ is_primary: true }).eq('id', imageId);
  if (error) return { error: translateError(error.message) };
  return { error: null };
}

export async function getOwnerVehicleCount(ownerId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('owner_id', ownerId);
  return count ?? 0;
}

export async function getOwnerVehicleCountByStatus(ownerId: string, status: VehicleStatus) {
  const supabase = await createClient();
  const { count } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('status', status);
  return count ?? 0;
}
