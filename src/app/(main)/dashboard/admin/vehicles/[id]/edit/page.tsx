import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getVehicleById } from '@/lib/db/vehicles';
import { resolveUserRole } from '@/lib/auth';
import EditVehicleClient from './client';

export default async function AdminEditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') redirect('/dashboard');

  const vehicle = await getVehicleById(id);
  if (!vehicle) notFound();

  const { data: owners } = await supabase.from('profiles').select('id, full_name').eq('role', 'owner').order('full_name', { ascending: true });

  return <EditVehicleClient vehicle={vehicle} owners={(owners as any[]) ?? []} />;
}
