import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveUserRole } from '@/lib/auth';
import Sidebar from '@/components/layout/sidebar';
import type { UserRole } from '@/types/database';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const role = await resolveUserRole(supabase, user);

  return (
    <div className="flex flex-1">
      <Sidebar role={role as UserRole} />
      <div className="flex-1 p-6 lg:p-8">{children}</div>
    </div>
  );
}
