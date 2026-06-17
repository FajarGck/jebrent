// src/components/delivery/delivery-status.tsx
// Badge status pengantaran — Dev A ONLY

import type { DeliveryStatus } from '@/types/database';
import { MapPin, Navigation, CheckCircle2, Star } from 'lucide-react';

type StatusConfig = {
  label: string;
  color: string;
  icon: React.ElementType;
};

const CONFIG: Record<DeliveryStatus, StatusConfig> = {
  assigned: {
    label: 'Ditugaskan',
    color: 'bg-warning/10 text-warning border-warning/30',
    icon: MapPin,
  },
  on_the_way: {
    label: 'Sedang Diantar',
    color: 'bg-primary/10 text-primary border-primary/30',
    icon: Navigation,
  },
  delivered: {
    label: 'Terkirim',
    color: 'bg-success/10 text-success border-success/30',
    icon: CheckCircle2,
  },
  completed: {
    label: 'Selesai',
    color: 'bg-success/10 text-success border-success/30',
    icon: Star,
  },
};

type Props = {
  status: DeliveryStatus;
  size?: 'sm' | 'md';
};

export function DeliveryStatusBadge({ status, size = 'md' }: Props) {
  const config = CONFIG[status];
  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${config.color} ${sizeClass}`}>
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {config.label}
    </span>
  );
}
