import Link from 'next/link';
import { Car } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { VEHICLE_TYPE_LABELS, VEHICLE_STATUS_LABELS } from '@/lib/constants';
import type { VehicleWithImages } from '@/lib/db/vehicles';

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-success/10 text-success',
  rented: 'bg-warning/10 text-warning',
  maintenance: 'bg-danger/10 text-danger',
  inactive: 'bg-card-muted text-subtle',
};

export default function VehicleCard({ vehicle }: { vehicle: VehicleWithImages }) {
  const primary = vehicle.vehicle_images?.find(img => img.is_primary) ?? vehicle.vehicle_images?.[0];

  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="relative aspect-16/10 overflow-hidden bg-card-muted">
        {primary ? (
          <img
            src={primary.image_url}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Car className="h-12 w-12 text-subtle" />
          </div>
        )}
        <div className="absolute right-3 top-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[vehicle.status] ?? ''}`}>
            {VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {VEHICLE_TYPE_LABELS[vehicle.type] ?? vehicle.type}
          </span>
          <span className="text-xs text-muted">{vehicle.year}</span>
        </div>
        <h3 className="mt-2 text-lg font-semibold leading-tight">
          {vehicle.brand} {vehicle.model}
        </h3>
        <p className="mt-1 text-xs text-muted">{vehicle.color} • {vehicle.plate_number}</p>
        <div className="mt-3 flex items-baseline gap-1 border-t border-border pt-3">
          <span className="text-lg font-bold text-primary">{formatCurrency(vehicle.daily_rate)}</span>
          <span className="text-xs text-muted">/hari</span>
        </div>
      </div>
    </Link>
  );
}
