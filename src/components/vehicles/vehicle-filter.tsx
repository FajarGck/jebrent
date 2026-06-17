'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { VEHICLE_TYPE_LABELS } from '@/lib/constants';
import type { VehicleType } from '@/types/database';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
];

const VEHICLE_TYPES = Object.entries(VEHICLE_TYPE_LABELS) as [VehicleType, string][];

export default function VehicleFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const clearAll = () => router.push(pathname);

  const current = {
    search: searchParams.get('search') ?? '',
    type: searchParams.get('type') ?? '',
    sort: searchParams.get('sort') ?? 'newest',
  };

  const hasFilters = current.search || current.type || current.sort !== 'newest';

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Cari merek, model, atau plat..."
          defaultValue={current.search}
          onChange={(e) => {
            const timer = setTimeout(() => updateParams('search', e.target.value), 400);
            return () => clearTimeout(timer);
          }}
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-primary focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={current.type}
          onChange={(e) => updateParams('type', e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
        >
          <option value="">Semua Tipe</option>
          {VEHICLE_TYPES.map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          value={current.sort}
          onChange={(e) => updateParams('sort', e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded-xl border border-border px-3 py-2.5 text-sm text-muted transition-colors hover:border-danger hover:text-danger"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
