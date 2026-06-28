'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { MAX_VEHICLE_IMAGES, MAX_VEHICLE_IMAGES_SIZE, VEHICLE_IMAGES_TYPE } from '@/lib/constants';
import type { VehicleType, Vehicle } from '@/types/database';
import { requireVehicleManager } from '@/lib/auth-server';
import { validateVehicleImages } from '@/lib/helper/vehicle-images-validator';
import { resolveUserRole } from '@/lib/auth';

export type VehicleActionResult = {
  error?: string;
  success?: boolean;
  vehicleId?: string;
};

export async function createVehicle(formData: FormData): Promise<VehicleActionResult> {
  const supabase = await createClient();
  let user;
  try {
    user = await requireVehicleManager();
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' };
  }

  const plate = formData.get('plate_number') as string;
  const brand = formData.get('brand') as string;
  const model = formData.get('model') as string;
  const type = formData.get('type') as VehicleType;
  const year = parseInt(formData.get('year') as string);
  const color = formData.get('color') as string;
  const halfDayRate = parseFloat(formData.get('half_day_rate') as string);
  const dailyRate = parseFloat(formData.get('daily_rate') as string);
  const weeklyRateRaw = formData.get('weekly_rate') as string;
  const weeklyRate = weeklyRateRaw ? parseFloat(weeklyRateRaw) : null;
  const description = (formData.get('description') as string) || null;
  const rawImages = formData.getAll('images') as File[];
  const imageValidation = validateVehicleImages(rawImages);

  if ('error' in imageValidation) {
    return { error: imageValidation.error };
  }

  const images = imageValidation.files as File[];

  if (!plate || !brand || !model || !type || !year || !color || !halfDayRate || !dailyRate) return { error: 'Semua field wajib harus diisi' };

  const role = await resolveUserRole(supabase, user);
  let ownerId = user.id;
  if (role === 'admin') {
    const selectedOwner = formData.get('owner_id') as string;
    if (selectedOwner) ownerId = selectedOwner;
  }

  const { data: vehicleData, error: vehicleErr } = await (supabase.from('vehicles') as any)
    .insert({
      owner_id: ownerId,
      plate_number: plate.toUpperCase(),
      brand,
      model,
      type,
      year,
      color,
      half_day_rate: halfDayRate,
      daily_rate: dailyRate,
      weekly_rate: weeklyRate,
      description,
      status: 'available',
      mileage: 0,
    })
    .select()
    .single();

  const vehicle = vehicleData as Vehicle | null;
  if (vehicleErr || !vehicle) {
    const message = vehicleErr?.message ?? 'Gagal menyimpan';
    if (message.toLowerCase().includes('row-level security') || message.toLowerCase().includes('permission denied')) {
      return {
        error: 'Akses database ditolak. Jalankan migration Supabase terbaru, pastikan role akun = owner di tabel profiles, lalu login ulang.',
      };
    }
    return { error: message };
  }

  const validImages = images.filter((f) => f.size > 0).slice(0, MAX_VEHICLE_IMAGES);

  for (let i = 0; i < validImages.length; i++) {
    const file = validImages[i];
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${vehicle.id}/${Date.now()}_${i}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from('vehicle-images').upload(path, file, { contentType: file.type });
    if (uploadErr) {
      console.error('Image upload failed:', uploadErr);
      continue;
    }

    const { data: urlData } = supabase.storage.from('vehicle-images').getPublicUrl(path);

    await (supabase.from('vehicle_images') as any).insert({
      vehicle_id: vehicle.id,
      image_url: urlData.publicUrl,
      is_primary: i === 0,
      sort_order: i,
    });
  }

  revalidatePath('/dashboard/owner/vehicles');
  revalidatePath('/vehicles');
  return { success: true, vehicleId: vehicle.id };
}

export async function updateVehicleAction(formData: FormData): Promise<VehicleActionResult> {
  const supabase = await createClient();
  const imageValidation = validateVehicleImages(formData.getAll('new_images') as File[]);

  if ('error' in imageValidation) {
    return { error: imageValidation.error };
  }

  const newImages = imageValidation.files as File[];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const vehicleId = formData.get('vehicle_id') as string;
  if (!vehicleId) return { error: 'Vehicle ID missing' };

  const role = await resolveUserRole(supabase, user);
  const { data: existingData } = await supabase.from('vehicles').select('owner_id').eq('id', vehicleId).single();
  const existing = existingData as { owner_id: string } | null;
  if (!existing || (existing.owner_id !== user.id && role !== 'admin')) return { error: 'Unauthorized' };

  const updates: Record<string, string | number | null> = {};
  const fields = ['plate_number', 'brand', 'model', 'type', 'year', 'color', 'half_day_rate', 'daily_rate', 'weekly_rate', 'description', 'status', 'mileage'];

  for (const field of fields) {
    const val = formData.get(field);
    if (val === null || val === '') continue;
    if (['year', 'mileage'].includes(field)) updates[field] = parseInt(val as string);
    else if (['half_day_rate', 'daily_rate', 'weekly_rate'].includes(field)) updates[field] = parseFloat(val as string);
    else if (field === 'plate_number') updates[field] = (val as string).toUpperCase();
    else updates[field] = val as string;
  }

  if (role === 'admin') {
    const selectedOwner = formData.get('owner_id') as string;
    if (selectedOwner) updates['owner_id'] = selectedOwner;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await (supabase.from('vehicles') as any).update(updates).eq('id', vehicleId);
    if (error) return { error: error.message };
  }

  const validNew = newImages.filter((f) => f.size > 0).slice(0, MAX_VEHICLE_IMAGES);

  if (validNew.length > 0) {
    const { count } = await supabase.from('vehicle_images').select('*', { count: 'exact', head: true }).eq('vehicle_id', vehicleId);
    const remaining = MAX_VEHICLE_IMAGES - (count ?? 0);

    for (let i = 0; i < Math.min(validNew.length, remaining); i++) {
      const file = validNew[i];
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${vehicleId}/${Date.now()}_${i}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from('vehicle-images').upload(path, file, { contentType: file.type });
      if (uploadErr) {
        console.error('Image upload failed during update:', uploadErr);
        continue;
      }

      const { data: urlData } = supabase.storage.from('vehicle-images').getPublicUrl(path);

      await (supabase.from('vehicle_images') as any).insert({
        vehicle_id: vehicleId,
        image_url: urlData.publicUrl,
        is_primary: false,
        sort_order: (count ?? 0) + i,
      });
    }
  }

  revalidatePath('/dashboard/owner/vehicles');
  revalidatePath(`/vehicles/${vehicleId}`);
  revalidatePath('/vehicles');
  return { success: true, vehicleId };
}

export async function deleteVehicleAction(vehicleId: string): Promise<VehicleActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const role = await resolveUserRole(supabase, user);
  const { data: existingData } = await supabase.from('vehicles').select('owner_id').eq('id', vehicleId).single();
  const existing = existingData as { owner_id: string } | null;
  if (!existing || (existing.owner_id !== user.id && role !== 'admin')) return { error: 'Unauthorized' };

  const { data: imagesData } = await supabase.from('vehicle_images').select('image_url').eq('vehicle_id', vehicleId);
  const images = (imagesData ?? []) as { image_url: string }[];

  if (images.length) {
    const paths = images
      .map((img) => {
        try {
          const url = new URL(img.image_url);
          return url.pathname.split('/storage/v1/object/public/vehicle-images/')[1];
        } catch {
          return null;
        }
      })
      .filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from('vehicle-images').remove(paths);
  }

  const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/owner/vehicles');
  revalidatePath('/vehicles');
  return { success: true };
}

export async function uploadVehicleImageAction(formData: FormData): Promise<VehicleActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const vehicleId = formData.get('vehicle_id') as string;
  const file = formData.get('file') as File;
  if (!vehicleId || !file || file.size === 0) return { error: 'Data tidak lengkap' };

  const { data: vehicleData } = await supabase.from('vehicles').select('owner_id').eq('id', vehicleId).single();
  const vehicle = vehicleData as { owner_id: string } | null;
  if (!vehicle || vehicle.owner_id !== user.id) return { error: 'Unauthorized' };

  const { count } = await supabase.from('vehicle_images').select('*', { count: 'exact', head: true }).eq('vehicle_id', vehicleId);
  if ((count ?? 0) >= MAX_VEHICLE_IMAGES) return { error: `Maksimal ${MAX_VEHICLE_IMAGES} foto` };

  const ext = file.name.split('.').pop();
  const path = `${user.id}/${vehicleId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('vehicle-images').upload(path, file, { contentType: file.type });
  if (uploadErr) return { error: uploadErr.message };

  const { data: urlData } = supabase.storage.from('vehicle-images').getPublicUrl(path);

  await (supabase.from('vehicle_images') as any).insert({
    vehicle_id: vehicleId,
    image_url: urlData.publicUrl,
    is_primary: (count ?? 0) === 0,
    sort_order: count ?? 0,
  });

  revalidatePath(`/dashboard/owner/vehicles/${vehicleId}/edit`);
  return { success: true };
}

export async function deleteVehicleImageAction(imageId: string, imageUrl: string): Promise<VehicleActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  try {
    const url = new URL(imageUrl);
    const path = url.pathname.split('/storage/v1/object/public/vehicle-images/')[1];
    if (path) await supabase.storage.from('vehicle-images').remove([path]);
  } catch {
    // ignore URL parse errors
  }

  const { error } = await supabase.from('vehicle_images').delete().eq('id', imageId);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/owner/vehicles');
  return { success: true };
}

export async function setPrimaryImageAction(imageId: string, vehicleId: string): Promise<VehicleActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  await (supabase.from('vehicle_images') as any).update({ is_primary: false }).eq('vehicle_id', vehicleId);

  const { error } = await (supabase.from('vehicle_images') as any).update({ is_primary: true }).eq('id', imageId);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/owner/vehicles');
  revalidatePath(`/vehicles/${vehicleId}`);
  return { success: true };
}
