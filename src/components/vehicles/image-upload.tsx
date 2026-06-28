'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, X, Star, ImageIcon } from 'lucide-react';
import { MAX_VEHICLE_IMAGES } from '@/lib/constants';
import type { VehicleImage } from '@/types/database';

type ExistingImage = VehicleImage;

type ImageUploadProps = {
  existingImages?: ExistingImage[];
  onDeleteExisting?: (imageId: string, imageUrl: string) => void;
  onSetPrimary?: (imageId: string) => void;
  onChange?: (files: File[]) => void;
  maxImages?: number;
};

export default function ImageUpload({
  existingImages = [],
  onDeleteExisting,
  onSetPrimary,
  onChange,
  maxImages = MAX_VEHICLE_IMAGES,
}: ImageUploadProps) {
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = maxImages - existingImages.length - newFiles.length;

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).slice(0, remaining);
      if (!arr.length) return;

      const urls = arr.map((f) => URL.createObjectURL(f));
      const nextFiles = [...newFiles, ...arr];
      setNewFiles(nextFiles);
      onChange?.(nextFiles);
      setPreviews((prev) => [...prev, ...urls]);
    },
    [remaining, onChange, newFiles],
  );

  const removeNew = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    const nextFiles = newFiles.filter((_, i) => i !== index);
    setNewFiles(nextFiles);
    onChange?.(nextFiles);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Foto Kendaraan ({existingImages.length + newFiles.length}/{maxImages})
        </label>
      </div>

      {(existingImages.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {existingImages.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-card-muted">
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
              {img.is_primary && (
                <div className="absolute left-2 top-2 rounded-md bg-warning px-1.5 py-0.5 text-[10px] font-bold text-white">
                  UTAMA
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {!img.is_primary && onSetPrimary && (
                  <button
                    type="button"
                    onClick={() => onSetPrimary(img.id)}
                    className="rounded-lg bg-white/90 p-1.5 text-warning transition-colors hover:bg-white"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                {onDeleteExisting && (
                  <button
                    type="button"
                    onClick={() => onDeleteExisting(img.id, img.image_url)}
                    className="rounded-lg bg-white/90 p-1.5 text-danger transition-colors hover:bg-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {previews.map((url, i) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-dashed border-primary/30 bg-card-muted">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <div className="absolute left-2 top-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-fg">
                BARU
              </div>
              <button
                type="button"
                onClick={() => removeNew(i)}
                className="absolute right-2 top-2 rounded-lg bg-white/90 p-1 text-danger opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium">Klik atau seret foto ke sini</p>
            <p className="mt-1 text-xs text-muted">JPG, PNG, WebP • Maks 5MB • {remaining} slot tersisa</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      )}
    </div>
  );
}
