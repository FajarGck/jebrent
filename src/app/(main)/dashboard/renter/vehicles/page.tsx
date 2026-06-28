import { getVehicles, type VehicleFilters } from '@/lib/db/vehicles';
import VehicleCard from '@/components/vehicles/vehicle-card';
import VehicleFilter from '@/components/vehicles/vehicle-filter';
import { Car, Search } from 'lucide-react';
import type { VehicleType } from '@/types/database';
import { Suspense } from 'react';

export const metadata = { title: 'Daftar Kendaraan — Penyewa' };

export default async function RenterVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const filters: VehicleFilters = {
    search: params.search,
    type: params.type as VehicleType | undefined,
    sort: (params.sort as VehicleFilters['sort']) ?? 'newest',
    status: 'available',
  };

  const vehicles = await getVehicles(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Car className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Daftar Kendaraan Tersedia</h1>
          <p className="text-sm text-muted">Cari dan pilih kendaraan favorit Anda untuk disewa</p>
        </div>
      </div>

      <div className="mb-6">
        <Suspense>
          <VehicleFilter />
        </Suspense>
      </div>

      {vehicles.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-16 text-center">
          <Search className="mx-auto h-12 w-12 text-subtle" />
          <h3 className="mt-4 text-lg font-semibold">Tidak Ada Kendaraan</h3>
          <p className="mt-2 text-sm text-muted">
            {params.search || params.type
              ? 'Coba ubah filter pencarian Anda.'
              : 'Belum ada kendaraan yang tersedia saat ini.'}
          </p>
        </div>
      )}
    </div>
  );
}
