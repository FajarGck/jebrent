import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PaymentStatusBadge } from '@/components/payments/payment-status';
import { ShieldAlert, ArrowLeft, Eye } from 'lucide-react';
import type { Profile, PaymentStatus } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kelola Denda Keterlambatan — Admin',
  description: 'Konfirmasi dan kelola denda keterlambatan kendaraan',
};

export default async function AdminFinesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const profile = data as Profile | null;
  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  const { status: filterStatus } = await searchParams;

  // Query all payments of type 'fine'
  const { data: payments } = await (supabase
    .from('payments')
    .select(`
      id,
      amount,
      status,
      payment_type,
      payment_method,
      paid_at,
      created_at,
      booking_id,
      bookings (
        id,
        end_date,
        vehicles (
          brand,
          model,
          plate_number
        ),
        profiles (
          full_name
        )
      )
    `) as any)
    .eq('payment_type', 'fine')
    .order('created_at', { ascending: false });

  const list = payments ?? [];
  const filtered = filterStatus && filterStatus !== 'all' ? list.filter((p: any) => p.status === filterStatus) : list;

  const tabs = [
    { value: 'all', label: 'Semua', count: list.length },
    { value: 'pending_confirmation', label: 'Menunggu Konfirmasi', count: list.filter((p: any) => p.status === 'pending_confirmation').length },
    { value: 'confirmed', label: 'Terkonfirmasi', count: list.filter((p: any) => p.status === 'confirmed').length },
    { value: 'unpaid', label: 'Belum Dibayar', count: list.filter((p: any) => p.status === 'unpaid').length },
  ];

  const activeTab = filterStatus || 'all';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/admin" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary mb-3">
          <ArrowLeft className="h-4 w-4" />
          Dashboard Admin
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-danger/10 p-2.5 text-danger">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kelola Denda Keterlambatan</h1>
            <p className="text-sm text-muted">{list.filter((p: any) => p.status === 'pending_confirmation').length} denda menunggu konfirmasi pembayaran</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/dashboard/admin/fines${tab.value !== 'all' ? `?status=${tab.value}` : ''}`}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.value ? 'bg-primary text-primary-fg' : 'text-muted hover:text-foreground hover:bg-card-muted'
            }`}
          >
            {tab.label}
            {tab.count > 0 && <span className="ml-1.5 rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[9px]">{tab.count}</span>}
          </Link>
        ))}
      </div>

      {/* Fines List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted">
          <ShieldAlert className="mx-auto h-10 w-10 text-subtle mb-3" />
          <p className="text-sm">Tidak ada transaksi denda keterlambatan dalam kategori ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p: any) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm">{p.bookings?.vehicles?.brand} {p.bookings?.vehicles?.model}</h3>
                  <PaymentStatusBadge status={p.status as PaymentStatus} size="sm" />
                </div>
                <p className="text-xs text-muted">
                  Penyewa: <span className="text-foreground font-semibold">{p.bookings?.profiles?.full_name || '—'}</span> • Plat: <span className="text-foreground font-semibold">{p.bookings?.vehicles?.plate_number}</span>
                </p>
                <p className="text-[10px] text-muted">
                  Batas Sewa: {formatDate(p.bookings?.end_date)} • Diunggah: {formatDate(p.created_at)}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                <div className="text-left sm:text-right">
                  <p className="text-[9px] uppercase tracking-wider text-muted font-bold">Jumlah Denda</p>
                  <p className="text-sm font-bold text-danger">{formatCurrency(p.amount)}</p>
                </div>
                <Link
                  href={`/dashboard/admin/fines/${p.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-card-muted transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Tinjau Denda
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
