'use client';

import { useState } from 'react';
import { Car } from 'lucide-react';

interface VehicleImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export function VehicleDetailGallery({ images, vehicleName }: { images: VehicleImage[]; vehicleName: string }) {
  const [pickedImage, setPickedImage] = useState(images[0]?.image_url || '');

  const pickImage = (imageUrl: string) => {
    setPickedImage(imageUrl);
  };

  if (images.length === 0) {
    return (
      <div className="flex aspect-16/10 items-center justify-center rounded-2xl border border-border bg-card-muted">
        <Car className="h-16 w-16 text-subtle" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-16/10 overflow-hidden rounded-2xl border border-border bg-card-muted">
        <img src={pickedImage} alt={vehicleName} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.slice(1).map((img) => (
            <div key={img.id} className="aspect-square overflow-hidden rounded-xl border border-border bg-card-muted">
              <img src={img.image_url} alt="" className="h-full w-full cursor-pointer object-cover" onClick={() => pickImage(img.image_url)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
