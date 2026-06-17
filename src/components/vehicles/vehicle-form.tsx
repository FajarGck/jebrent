'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createVehicle, updateVehicleAction } from '@/actions/vehicles';
import ImageUpload from './image-upload';
import { VEHICLE_TYPE_LABELS } from '@/lib/constants';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import type { VehicleType, VehicleImage } from '@/types/database';
import type { VehicleWithImages } from '@/lib/db/vehicles';
import Link from 'next/link';

type VehicleFormProps = {
  mode: 'create' | 'edit';
  vehicle?: VehicleWithImages;
  onDeleteImage?: (imageId: string, imageUrl: string) => void;
  onSetPrimary?: (imageId: string) => void;
};

const VEHICLE_TYPES = Object.entries(VEHICLE_TYPE_LABELS) as [VehicleType, string][];

export default function VehicleForm({ mode, vehicle, onDeleteImage, onSetPrimary }: VehicleFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newImages, setNewImages] = useState<File[]>([]);

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
      router.push('/dashboard/owner/vehicles');
    } else {
      formData.set('vehicle_id', vehicle!.id);
      newImages.forEach((f) => formData.append('new_images', f));
      const result = await updateVehicleAction(formData);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push('/dashboard/owner/vehicles');
      router.refresh();
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/owner/vehicles"
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
                  defaultValue={vehicle?.type ?? ''}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                >
                  <option value="" disabled>Pilih tipe</option>
                  {VEHICLE_TYPES.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="brand" className="mb-1.5 block text-sm font-medium">Merek</label>
                <input
                  id="brand"
                  name="brand"
                  type="text"
                  required
                  defaultValue={vehicle?.brand}
                  placeholder="Toyota"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="model" className="mb-1.5 block text-sm font-medium">Model</label>
                <input
                  id="model"
                  name="model"
                  type="text"
                  required
                  defaultValue={vehicle?.model}
                  placeholder="Avanza"
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
                  min={2000}
                  max={new Date().getFullYear() + 1}
                  defaultValue={vehicle?.year}
                  placeholder="2024"
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
                  placeholder="Putih"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium">Deskripsi</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={vehicle?.description ?? ''}
                placeholder="Deskripsi singkat kendaraan..."
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Tarif Sewa</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="half_day_rate" className="mb-1.5 block text-sm font-medium">Per 12 Jam (Rp)</label>
                <input
                  id="half_day_rate"
                  name="half_day_rate"
                  type="number"
                  required
                  min={0}
                  step={1000}
                  defaultValue={vehicle?.half_day_rate}
                  placeholder="150000"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="daily_rate" className="mb-1.5 block text-sm font-medium">Per 24 Jam (Rp)</label>
                <input
                  id="daily_rate"
                  name="daily_rate"
                  type="number"
                  required
                  min={0}
                  step={1000}
                  defaultValue={vehicle?.daily_rate}
                  placeholder="250000"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="weekly_rate" className="mb-1.5 block text-sm font-medium">Per Minggu (Rp)</label>
                <input
                  id="weekly_rate"
                  name="weekly_rate"
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={vehicle?.weekly_rate ?? ''}
                  placeholder="1500000"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-xs text-muted">Opsional</p>
              </div>
            </div>
          </div>

          {mode === 'edit' && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">Status</h2>
              <select
                name="status"
                defaultValue={vehicle?.status}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none sm:w-auto"
              >
                <option value="available">Tersedia</option>
                <option value="maintenance">Perawatan</option>
                <option value="inactive">Tidak Aktif</option>
              </select>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <ImageUpload
            existingImages={vehicle?.vehicle_images}
            onDeleteExisting={onDeleteImage}
            onSetPrimary={onSetPrimary}
            onChange={setNewImages}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <Link
          href="/dashboard/owner/vehicles"
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-border-hover"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-xl disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mode === 'create' ? 'Simpan Kendaraan' : 'Update Kendaraan'}
        </button>
      </div>
    </form>
  );
}
