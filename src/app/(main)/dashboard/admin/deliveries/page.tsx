import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAllDeliveries } from '@/lib/db/delivery';
import AdminDeliveryCard from '@/components/delivery/admin-delivery-card';
import { Truck } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Profile, DeliveryStatus } from '@/types/database';

export const metadata: Metadata = {
  title: 'Kelola Pengantaran — Admin Jebrent',
};

const STATUS_FILTERS: { label: string; value: DeliveryStatus | 'all' }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Ditugaskan', value: 'assigned' },
  { label: 'Sedang Diantar', value: 'on_the_way' },
  { label: 'Terkirim', value: 'delivered' },
  { label: 'Selesai', value: 'completed' },
];

export default async function AdminDeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const profile = data as Pick<Profile, 'role'> | null;
  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  const { status: statusParam } = await searchParams;
  const activeFilter = (statusParam ?? 'all') as DeliveryStatus | 'all';

  const allDeliveries = await getAllDeliveries();
  const filtered =
    activeFilter === 'all'
      ? allDeliveries
      : allDeliveries.filter((d) => d.delivery_status === activeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Kelola Semua Pengantaran</h1>
        <p className="mt-1 text-sm text-muted">
          {allDeliveries.length} total pengantaran di dalam sistem
        </p>
      </div>

      {/* Filter tabs */}
      {allDeliveries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ label, value }) => {
            const count =
              value === 'all'
                ? allDeliveries.length
                : allDeliveries.filter((d) => d.delivery_status === value).length;

            return (
              <Link
                key={value}
                href={
                  value === 'all'
                    ? '/dashboard/admin/deliveries'
                    : `/dashboard/admin/deliveries?status=${value}`
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted hover:border-border-hover hover:text-foreground'
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    activeFilter === value ? 'bg-primary/20' : 'bg-card-muted'
                  }`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Truck className="mx-auto h-12 w-12 text-subtle" />
          <h2 className="mt-4 text-lg font-semibold">Belum Ada Pengantaran</h2>
          <p className="mt-2 text-sm text-muted">
            Tidak ada jadwal pengantaran dengan status ini.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((delivery) => (
            <AdminDeliveryCard key={delivery.id} delivery={delivery} />
          ))}
        </div>
      )}
    </div>
  );
}
