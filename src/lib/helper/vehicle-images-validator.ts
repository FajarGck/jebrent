import { MAX_VEHICLE_IMAGES, MAX_VEHICLE_IMAGES_SIZE } from '../constants';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function validateVehicleImages(files: File[]) {
  const validFiles = files.filter((f) => f instanceof File && f.size > 0);

  if (validFiles.length > MAX_VEHICLE_IMAGES) {
    return { error: `Jumlah foto kendaraan melebihi batas maksimal (maksimal ${MAX_VEHICLE_IMAGES} foto).` };
  }

  for (const file of validFiles) {
    if (file.size > MAX_VEHICLE_IMAGES_SIZE) {
      return { error: 'Ukuran file foto terlalu besar (maksimal 5MB).' };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return { error: 'Format file tidak didukung. Harap gunakan format JPG, PNG, atau WebP.' };
    }
  }

  return { files: validFiles };
}
