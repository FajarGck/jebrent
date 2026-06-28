import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveUserRole } from '@/lib/auth';
import AdminFineDetail from '@/components/payments/admin-fine-detail';
import type { Profile } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Detail Denda Keterlambatan — Admin',
  description: 'Detail denda keterlambatan sewa kendaraan',
};

export default async function AdminFineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/dashboard/admin/fines/${id}`);

  const role = await resolveUserRole(supabase, user);
  if (role !== 'admin') redirect('/dashboard');

  // Query specific fine payment joining booking details
  const { data: payment } = await (supabase
    .from('payments')
    .select(`
      *,
      bookings (
        id,
        end_date,
        vehicles (
          brand,
          model,
          plate_number
        ),
        profiles (
          full_name,
          phone,
          nik
        )
      )
    `) as any)
    .eq('id', id)
    .single();

  if (!payment) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminFineDetail payment={payment} />
    </div>
  );
}
