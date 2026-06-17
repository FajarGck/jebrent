'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deleteVehicleAction } from '@/actions/vehicles';
import { formatCurrency } from '@/lib/utils';
import { VEHICLE_TYPE_LABELS, VEHICLE_STATUS_LABELS } from '@/lib/constants';
import { Car, Pencil, Trash2, Loader2, X } from 'lucide-react';
import type { VehicleWithImages } from '@/lib/db/vehicles';

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-success/10 text-success',
  rented: 'bg-warning/10 text-warning',
  maintenance: 'bg-danger/10 text-danger',
  inactive: 'bg-card-muted text-subtle',
};

export default function OwnerVehicleTable({ vehicles }: { vehicles: VehicleWithImages[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(vehicleId: string) {
    setDeleting(vehicleId);
    const result = await deleteVehicleAction(vehicleId);
    if (result.error) {
      alert(result.error);
    }
    setDeleting(null);
    setConfirmId(null);
    router.refresh();
  }

  if (!vehicles.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <Car className="mx-auto h-12 w-12 text-subtle" />
        <h3 className="mt-4 text-lg font-semibold">Belum Ada Kendaraan</h3>
        <p className="mt-2 text-sm text-muted">Mulai tambahkan kendaraan Anda untuk disewakan.</p>
        <Link
          href="/dashboard/owner/vehicles/new"
          className="mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
        >
          Tambah Kendaraan
        </Link>
      </div>
    );
  }

  return (
    <>
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Hapus Kendaraan?</h3>
            <p className="mt-2 text-sm text-muted">
              Kendaraan ini akan dihapus permanen beserta semua foto-fotonya. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-border-hover"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={!!deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger-hover disabled:opacity-50"
              >
                {deleting === confirmId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card-muted">
              <th className="px-4 py-3 text-left font-medium text-muted">Kendaraan</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Tipe</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Tarif/Hari</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {vehicles.map((v) => {
              const primary = v.vehicle_images?.find(img => img.is_primary) ?? v.vehicle_images?.[0];
              return (
                <tr key={v.id} className="transition-colors hover:bg-card-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-card-muted">
                        {primary ? (
                          <img src={primary.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center"><Car className="h-4 w-4 text-subtle" /></div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{v.brand} {v.model}</p>
                        <p className="text-xs text-muted">{v.plate_number} • {v.year}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{VEHICLE_TYPE_LABELS[v.type]}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(v.daily_rate)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[v.status]}`}>
                      {VEHICLE_STATUS_LABELS[v.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/owner/vehicles/${v.id}/edit`}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setConfirmId(v.id)}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {vehicles.map((v) => {
          const primary = v.vehicle_images?.find(img => img.is_primary) ?? v.vehicle_images?.[0];
          return (
            <div key={v.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex gap-4 p-4">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-card-muted">
                  {primary ? (
                    <img src={primary.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Car className="h-6 w-6 text-subtle" /></div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{v.brand} {v.model}</h3>
                  <p className="mt-0.5 text-xs text-muted">{v.plate_number} • {v.year} • {VEHICLE_TYPE_LABELS[v.type]}</p>
                  <p className="mt-1 text-sm font-bold text-primary">{formatCurrency(v.daily_rate)}<span className="text-xs font-normal text-muted">/hari</span></p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[v.status]}`}>
                    {VEHICLE_STATUS_LABELS[v.status]}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 border-t border-border px-4 py-2">
                <Link
                  href={`/dashboard/owner/vehicles/${v.id}/edit`}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Link>
                <button
                  onClick={() => setConfirmId(v.id)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
