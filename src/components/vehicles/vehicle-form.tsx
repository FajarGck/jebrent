'use client';

import { useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createVehicle, updateVehicleAction } from '@/actions/vehicles';
import ImageUpload from './image-upload';
import { VEHICLE_TYPE_LABELS } from '@/lib/constants';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import type { VehicleType } from '@/types/database';
import type { VehicleWithImages } from '@/lib/db/vehicles';
import Link from 'next/link';

type VehicleFormProps = {
  mode: 'create' | 'edit';
  vehicle?: VehicleWithImages;
  owners?: { id: string; full_name: string }[];
  onDeleteImage?: (imageId: string, imageUrl: string) => void;
  onSetPrimary?: (imageId: string) => void;
};

const VEHICLE_TYPES = Object.entries(VEHICLE_TYPE_LABELS) as [VehicleType, string][];

export default function VehicleForm({ mode, vehicle, owners, onDeleteImage, onSetPrimary }: VehicleFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newImages, setNewImages] = useState<File[]>([]);

  const pathPrefix = pathname.startsWith('/dashboard/admin') ? '/dashboard/admin' : '/dashboard/owner';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    if (mode === 'create') {
      newImages.forEach((f) => formData.append('images', f));
      const result = await createVehicle(formData);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push(pathPrefix + '/vehicles');
    } else {
      formData.set('vehicle_id', vehicle!.id);
      newImages.forEach((f) => formData.append('new_images', f));
      const result = await updateVehicleAction(formData);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push(pathPrefix + '/vehicles');
      router.refresh();
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href={`${pathPrefix}/vehicles`}
          className="rounded-lg border border-border p-2 text-muted transition-colors hover:border-border-hover hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">
          {mode === 'create' ? 'Tambah Kendaraan' : 'Edit Kendaraan'}
        </h1>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Informasi Kendaraan</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="plate_number" className="mb-1.5 block text-sm font-medium">Plat Nomor</label>
                <input
                  id="plate_number"
                  name="plate_number"
                  type="text"
                  required
                  defaultValue={vehicle?.plate_number}
                  placeholder="B 1234 ABC"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm uppercase transition-colors focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="type" className="mb-1.5 block text-sm font-medium">Tipe</label>
                <select
                  id="type"
                  name="type"
                  required
                  defaultValue={vehicle?.type}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                >
                  {VEHICLE_TYPES.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="brand" className="mb-1.5 block text-sm font-medium">Merk / Brand</label>
                <input
                  id="brand"
                  name="brand"
                  type="text"
                  required
                  defaultValue={vehicle?.brand}
                  placeholder="Toyota, Honda, Suzuki"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="model" className="mb-1.5 block text-sm font-medium">Model / Seri</label>
                <input
                  id="model"
                  name="model"
                  type="text"
                  required
                  defaultValue={vehicle?.model}
                  placeholder="Avanza, Civic, Ertiga"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="year" className="mb-1.5 block text-sm font-medium">Tahun</label>
                <input
                  id="year"
                  name="year"
                  type="number"
                  required
                  defaultValue={vehicle?.year}
                  placeholder="2020"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="color" className="mb-1.5 block text-sm font-medium">Warna</label>
                <input
                  id="color"
                  name="color"
                  type="text"
                  required
                  defaultValue={vehicle?.color}
                  placeholder="Hitam, Putih, Silver"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium">Deskripsi / Catatan Tambahan (Opsional)</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={vehicle?.description ?? ''}
                placeholder="Fasilitas AC dingin, bensin irit, dll."
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Tarif Sewa (Rupiah)</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="half_day_rate" className="mb-1.5 block text-sm font-medium">Tarif 12 Jam <span className="text-danger">*</span></label>
                <input
                  id="half_day_rate"
                  name="half_day_rate"
                  type="number"
                  required
                  defaultValue={vehicle?.half_day_rate}
                  placeholder="150000"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="daily_rate" className="mb-1.5 block text-sm font-medium">Tarif 24 Jam (Harian) <span className="text-danger">*</span></label>
                <input
                  id="daily_rate"
                  name="daily_rate"
                  type="number"
                  required
                  defaultValue={vehicle?.daily_rate}
                  placeholder="250000"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="weekly_rate" className="mb-1.5 block text-sm font-medium">Tarif Mingguan (Opsional)</label>
                <input
                  id="weekly_rate"
                  name="weekly_rate"
                  type="number"
                  defaultValue={vehicle?.weekly_rate ?? ''}
                  placeholder="1500000"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Owner Assignment Dropdown for Admin */}
          {owners && owners.length > 0 && pathname.startsWith('/dashboard/admin') && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">Kepemilikan Kendaraan</h2>
              <div>
                <label htmlFor="owner_id" className="mb-1.5 block text-sm font-medium">Pilih Pemilik (Owner) <span className="text-danger">*</span></label>
                <select
                  id="owner_id"
                  name="owner_id"
                  required
                  defaultValue={vehicle?.owner_id}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                >
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>{o.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Foto Kendaraan</h2>
            <ImageUpload
              existingImages={vehicle?.vehicle_images ?? []}
              onDeleteExisting={onDeleteImage}
              onSetPrimary={onSetPrimary}
              onChange={setNewImages}
            />
          </div>

          {mode === 'edit' && (
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Status Operasional</h2>
              <div>
                <label htmlFor="status" className="mb-1.5 block text-sm font-medium">Status Ketersediaan</label>
                <select
                  id="status"
                  name="status"
                  defaultValue={vehicle?.status}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                >
                  <option value="available">Tersedia</option>
                  <option value="rented">Sedang Disewa</option>
                  <option value="maintenance">Perbaikan (Maintenance)</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
              <div>
                <label htmlFor="mileage" className="mb-1.5 block text-sm font-medium">Total Jarak Tempuh (KM)</label>
                <input
                  id="mileage"
                  name="mileage"
                  type="number"
                  defaultValue={vehicle?.mileage ?? 0}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-xl disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {mode === 'create' ? 'Simpan Kendaraan' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </form>
  );
}
