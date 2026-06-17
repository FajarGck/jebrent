import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDashboardPath, resolveUserRole } from '@/lib/auth';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const role = await resolveUserRole(supabase, user);
  redirect(getDashboardPath(role));
}
