import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getVehicleById } from '@/lib/db/vehicles';
import EditVehicleClient from './client';

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();
  if (vehicle.owner_id !== user.id) redirect('/dashboard');

  return <EditVehicleClient vehicle={vehicle} />;
}
