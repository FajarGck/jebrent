'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Printer, FileSpreadsheet, TrendingUp, Calendar, ChevronRight } from 'lucide-react';

type PaymentItem = {
  id: string;
  amount: number;
  payment_type: string;
  paid_at: string;
  created_at: string;
  vehicleName: string;
};

type OwnerRevenueChartProps = {
  payments: PaymentItem[];
};

export default function OwnerRevenueChart({ payments }: OwnerRevenueChartProps) {
  const [filter, setFilter] = useState<'day' | 'week' | 'month'>('month');

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Grouping and Chart Data logic
  const getChartData = () => {
    const sorted = [...payments].sort((a, b) => new Date(a.paid_at || a.created_at).getTime() - new Date(b.paid_at || b.created_at).getTime());
    
    const groups: Record<string, number> = {};
    
    sorted.forEach((p) => {
      const d = new Date(p.paid_at || p.created_at);
      let key = '';
      if (filter === 'day') {
        key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      } else if (filter === 'week') {
        // Simple week grouping (Year - WeekNum)
        const oneJan = new Date(d.getFullYear(), 0, 1);
        const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
        key = `W${weekNum} (${d.getFullYear()})`;
      } else {
        key = d.toLocaleDateString('id-ID', { month: 'long', year: '2-digit' });
      }
      groups[key] = (groups[key] || 0) + Number(p.amount);
    });

    const labels = Object.keys(groups);
    const data = Object.values(groups);
    return { labels, data };
  };

  const { labels, data } = getChartData();
  const maxVal = Math.max(...data, 100000);

  // SVG dimensions for Line Chart
  const width = 600;
  const height = 200;
  const padding = 35;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate SVG points
  const points = data.map((val, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = height - padding - (val / maxVal) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  // Print report
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel/CSV
  const handleExportExcel = () => {
    const headers = ['ID Transaksi', 'Kendaraan', 'Tipe', 'Tanggal', 'Nominal'];
    const rows = payments.map((p) => [
      p.id.slice(0, 8).toUpperCase(),
      p.vehicleName,
      p.payment_type.toUpperCase(),
      formatDate(p.paid_at || p.created_at),
      p.amount,
    ]);
    
    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan_pendapatan_${filter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary Cards
  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const dpRevenue = payments.filter((p) => p.payment_type === 'dp').reduce((sum, p) => sum + Number(p.amount), 0);
  const finalRevenue = payments.filter((p) => p.payment_type === 'final').reduce((sum, p) => sum + Number(p.amount), 0);
  const fineRevenue = payments.filter((p) => p.payment_type === 'fine').reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Report Container */}
      <div id="print-area" className="space-y-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
        {/* Report Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold">Laporan Keuangan & Pendapatan</h2>
            <p className="text-xs text-muted">Rekap pendapatan rental, DP, pelunasan, dan denda</p>
          </div>
          <div className="flex gap-2 no-print">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-card-muted"
            >
              <FileSpreadsheet className="h-4 w-4 text-success" />
              Excel (CSV)
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-fg hover:bg-primary-hover shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Cetak PDF
            </button>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="p-4 rounded-xl border border-border bg-card-muted">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Pendapatan</p>
            <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card-muted">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Total DP (25%)</p>
            <p className="text-xl font-bold mt-1 text-success">{formatCurrency(dpRevenue)}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card-muted">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Pelunasan</p>
            <p className="text-xl font-bold mt-1 text-accent">{formatCurrency(finalRevenue)}</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card-muted">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Denda</p>
            <p className="text-xl font-bold mt-1 text-danger">{formatCurrency(fineRevenue)}</p>
          </div>
        </div>

        {/* Chart Section */}
        <div className="border border-border rounded-xl p-4 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1"><TrendingUp className="h-4 w-4 text-primary" /> Tren Pendapatan</span>
            <div className="flex border border-border rounded-lg p-0.5 bg-card-muted no-print">
              {(['day', 'week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold capitalize transition-colors ${
                    filter === mode ? 'bg-card text-foreground shadow-sm' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {mode === 'day' ? 'Hari' : mode === 'week' ? 'Minggu' : 'Bulan'}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full overflow-x-auto flex justify-center">
            {data.length > 0 ? (
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-lg overflow-visible">
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                  const y = padding + r * chartHeight;
                  return (
                    <line
                      key={i}
                      x1={padding}
                      y1={y}
                      x2={width - padding}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth="0.5"
                      strokeDasharray="4,4"
                    />
                  );
                })}
                {/* Chart line path */}
                {data.length > 1 ? (
                  <path
                    d={`M ${points}`}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {/* Data points */}
                {data.map((val, index) => {
                  const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
                  const y = height - padding - (val / maxVal) * chartHeight;
                  return (
                    <g key={index} className="group">
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        className="fill-primary stroke-white stroke-2 cursor-pointer hover:r-7 transition-all"
                      />
                      <text
                        x={x}
                        y={y - 10}
                        textAnchor="middle"
                        className="text-[9px] fill-foreground font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      >
                        {formatCurrency(val)}
                      </text>
                    </g>
                  );
                })}
                {/* X Axis Labels */}
                {labels.map((label, index) => {
                  const x = padding + (index / Math.max(labels.length - 1, 1)) * chartWidth;
                  return (
                    <text
                      key={index}
                      x={x}
                      y={height - 10}
                      textAnchor="middle"
                      className="text-[9px] fill-muted font-medium"
                    >
                      {label}
                    </text>
                  );
                })}
              </svg>
            ) : (
              <p className="text-xs text-muted py-12">Belum ada data grafik.</p>
            )}
          </div>
        </div>

        {/* Report Transactions Table */}
        <div className="space-y-3">
          <span className="text-xs font-bold flex items-center gap-1"><Calendar className="h-4 w-4 text-muted" /> Rincian Transaksi Masuk</span>
          <div className="overflow-hidden border border-border rounded-xl">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-card-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-bold text-muted">ID</th>
                  <th className="px-4 py-2.5 font-bold text-muted">Kendaraan</th>
                  <th className="px-4 py-2.5 font-bold text-muted">Kategori</th>
                  <th className="px-4 py-2.5 font-bold text-muted">Tanggal</th>
                  <th className="px-4 py-2.5 font-bold text-right text-muted">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">Belum ada transaksi.</td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-card-muted/55">
                      <td className="px-4 py-2.5 font-mono text-muted uppercase">#{p.id.slice(0, 8)}</td>
                      <td className="px-4 py-2.5 font-semibold">{p.vehicleName}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          p.payment_type === 'dp' ? 'bg-success/15 text-success' : p.payment_type === 'final' ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'
                        }`}>
                          {p.payment_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted">{formatDate(p.paid_at || p.created_at)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-primary">{formatCurrency(p.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
