import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PaymentStatusBadge } from '@/components/payments/payment-status';
import { CreditCard, HelpCircle } from 'lucide-react';
import type { PaymentStatus } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Riwayat Pembayaran — Jebrent',
  description: 'Riwayat transaksi DP, Pelunasan, dan Denda',
};

export default async function RenterPaymentsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { type: filterType } = await searchParams;

  // Query payments for the renter's bookings
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
      bookings!inner (
        renter_id,
        vehicles (
          brand,
          model,
          plate_number
        )
      )
    `) as any)
    .eq('bookings.renter_id', user.id)
    .order('created_at', { ascending: false });

  const list = payments ?? [];
  const filtered = filterType && filterType !== 'all' ? list.filter((p: any) => p.payment_type === filterType) : list;

  const tabs = [
    { value: 'all', label: 'Semua', count: list.length },
    { value: 'dp', label: 'Uang Muka (DP)', count: list.filter((p: any) => p.payment_type === 'dp').length },
    { value: 'final', label: 'Pelunasan', count: list.filter((p: any) => p.payment_type === 'final').length },
    { value: 'fine', label: 'Denda Keterlambatan', count: list.filter((p: any) => p.payment_type === 'fine').length },
  ];

  const activeTab = filterType || 'all';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <CreditCard className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Riwayat Pembayaran Anda</h1>
          <p className="text-sm text-muted">Pantau transaksi uang muka (DP), pelunasan sisa sewa, dan denda</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {tabs.map((tab) => (
          <a
            key={tab.value}
            href={`/dashboard/renter/payments${tab.value !== 'all' ? `?type=${tab.value}` : ''}`}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.value ? 'bg-primary text-primary-fg' : 'text-muted hover:text-foreground hover:bg-card-muted'
            }`}
          >
            {tab.label}
            {tab.count > 0 && <span className="ml-1.5 rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[9px]">{tab.count}</span>}
          </a>
        ))}
      </div>

      {/* Payments List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted">
          <HelpCircle className="mx-auto h-10 w-10 text-subtle mb-3" />
          <p className="text-sm">Belum ada transaksi pembayaran dalam kategori ini.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {filtered.map((p: any) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between shadow-sm">
              <div className="space-y-1.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-xs capitalize">{p.bookings?.vehicles?.brand} {p.bookings?.vehicles?.model}</h3>
                    <p className="text-[10px] text-muted font-mono">{p.bookings?.vehicles?.plate_number}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    p.payment_type === 'dp' ? 'bg-success/15 text-success' : p.payment_type === 'final' ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'
                  }`}>
                    {p.payment_type}
                  </span>
                </div>
                <div className="text-[10px] text-muted space-y-0.5">
                  <p>ID Transaksi: <span className="font-mono uppercase text-foreground">#{p.id.slice(0, 8)}</span></p>
                  <p>Metode: <span className="font-semibold text-foreground capitalize">{p.payment_method.replace('_', ' ')}</span></p>
                  <p>Tanggal: <span className="text-foreground">{formatDate(p.paid_at || p.created_at)}</span></p>
                </div>
              </div>

              <div className="border-t border-border pt-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted font-bold">Nominal Pembayaran</p>
                  <p className="text-sm font-bold text-primary">{formatCurrency(p.amount)}</p>
                </div>
                <PaymentStatusBadge status={p.status as PaymentStatus} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
