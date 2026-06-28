import VehicleForm from '@/components/vehicles/vehicle-form';
import { requireDashboardAccess } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';

export default async function AdminNewVehiclePage() {
  await requireDashboardAccess('admin');
  const supabase = await createClient();

  const { data: owners } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'owner')
    .order('full_name', { ascending: true });

  return <VehicleForm mode="create" owners={(owners as any[]) ?? []} />;
}
