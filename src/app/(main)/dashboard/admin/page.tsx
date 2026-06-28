import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LayoutDashboard, Users, Car, CalendarCheck, CreditCard } from 'lucide-react';
import type { Profile } from '@/types/database';
import AdminGPSMonitor from '@/components/dashboard/admin-gps-monitor';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const profile = data as Profile | null;
  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  const activeStatuses = ['pending', 'confirmed', 'paid', 'in_delivery', 'active', 'returning'];

  // Fetch metrics data
  const [usersRes, vehiclesRes, bookingsRes, revenueRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }),
    (supabase.from('bookings').select('*', { count: 'exact', head: true }) as any).in('status', activeStatuses),
    (supabase.from('payments').select('amount') as any).eq('status', 'confirmed'),
  ]);

  const totalRevenue = (revenueRes.data as { amount: number }[] ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);

  // Fetch active bookings for GPS simulation
  const { data: activeBookings } = await (supabase
    .from('bookings')
    .select('*, vehicles(brand, model, plate_number)') as any)
    .in('status', ['in_delivery', 'active']);

  // Fetch delivery schedules for recap
  const { data: deliverySchedules } = await (supabase
    .from('delivery_schedules')
    .select('*, bookings(*, vehicles(brand, model, plate_number))') as any)
    .order('departure_time', { ascending: true });

  const stats = [
    { label: 'Total Pengguna', value: String(usersRes.count ?? 0), icon: Users },
    { label: 'Total Kendaraan', value: String(vehiclesRes.count ?? 0), icon: Car },
    { label: 'Pemesanan Aktif', value: String(bookingsRes.count ?? 0), icon: CalendarCheck },
    { label: 'Pendapatan', value: formatCurrency(totalRevenue), icon: CreditCard },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard Admin</h1>
            <p className="text-sm text-muted">Selamat datang, {profile.full_name}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">{stat.label}</p>
              <stat.icon className="h-5 w-5 text-muted" />
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* GPS Monitoring & Delivery Recap Component */}
      <AdminGPSMonitor
        activeBookings={activeBookings ?? []}
        deliverySchedules={deliverySchedules ?? []}
      />
    </div>
  );
}
