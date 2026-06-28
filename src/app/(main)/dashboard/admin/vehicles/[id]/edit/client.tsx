'use client';

import { useRouter } from 'next/navigation';
import VehicleForm from '@/components/vehicles/vehicle-form';
import { deleteVehicleImageAction, setPrimaryImageAction } from '@/actions/vehicles';
import type { VehicleWithImages } from '@/lib/db/vehicles';

type Props = {
  vehicle: VehicleWithImages;
  owners: { id: string; full_name: string }[];
};

export default function EditVehicleClient({ vehicle, owners }: Props) {
  const router = useRouter();

  async function handleDeleteImage(imageId: string, imageUrl: string) {
    const result = await deleteVehicleImageAction(imageId, imageUrl);
    if (result.error) alert(result.error);
    else router.refresh();
  }

  async function handleSetPrimary(imageId: string) {
    const result = await setPrimaryImageAction(imageId, vehicle.id);
    if (result.error) alert(result.error);
    else router.refresh();
  }

  return (
    <VehicleForm
      mode="edit"
      vehicle={vehicle}
      owners={owners}
      onDeleteImage={handleDeleteImage}
      onSetPrimary={handleSetPrimary}
    />
  );
}
