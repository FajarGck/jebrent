import VehicleForm from '@/components/vehicles/vehicle-form';
import { requireDashboardAccess } from '@/lib/auth-server';

export default async function NewVehiclePage() {
  await requireDashboardAccess('owner');
  return <VehicleForm mode="create" />;
}
