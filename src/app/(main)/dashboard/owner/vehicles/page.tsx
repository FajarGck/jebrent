import { getVehiclesByOwner } from '@/lib/db/vehicles';
import { requireDashboardAccess } from '@/lib/auth-server';
import OwnerVehicleTable from '@/components/vehicles/owner-vehicle-table';
import VehicleFilter from '@/components/vehicles/vehicle-filter';
import { Car, Plus } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

export default async function OwnerVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; sort?: string }>;
}) {
  const { user } = await requireDashboardAccess('owner');

  let vehicles = await getVehiclesByOwner(user.id);

  const params = await searchParams;
  if (params.search) {
    const kw = params.search.toLowerCase();
    vehicles = vehicles.filter(
      (v) =>
        v.brand.toLowerCase().includes(kw) ||
        v.model.toLowerCase().includes(kw) ||
        v.plate_number.toLowerCase().includes(kw),
    );
  }
  if (params.type) {
    vehicles = vehicles.filter((v) => v.type === params.type);
  }
  if (params.sort === 'price_asc') vehicles.sort((a, b) => a.daily_rate - b.daily_rate);
  else if (params.sort === 'price_desc') vehicles.sort((a, b) => b.daily_rate - a.daily_rate);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kendaraan Saya</h1>
            <p className="text-sm text-muted">{vehicles.length} kendaraan terdaftar</p>
          </div>
        </div>
        <Link
          href="/dashboard/owner/vehicles/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-xl"
        >
          <Plus className="h-4 w-4" />
          Tambah Kendaraan
        </Link>
      </div>

      <div className="mb-6">
        <Suspense>
          <VehicleFilter />
        </Suspense>
      </div>

      <OwnerVehicleTable vehicles={vehicles} />
    </>
  );
}
