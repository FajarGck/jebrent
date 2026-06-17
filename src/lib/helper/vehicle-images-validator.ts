import { MAX_VEHICLE_IMAGES, MAX_VEHICLE_IMAGES_SIZE } from '../constants';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function validateVehicleImages(files: File[]) {
  const validFiles = files.filter((f) => f instanceof File && f.size > 0);

  if (validFiles.length > MAX_VEHICLE_IMAGES) {
    return { error: `Maksimal ${MAX_VEHICLE_IMAGES} gambar` };
  }

  for (const file of validFiles) {
    if (file.size > MAX_VEHICLE_IMAGES_SIZE) {
      return { error: 'Ukuran gambar melebihi batas' };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      console.log(file.size);
      return { error: 'Tipe gambar tidak didukung' };
    }
  }

  return { files: validFiles };
}
