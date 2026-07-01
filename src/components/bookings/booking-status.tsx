import { BookingStatus } from '@/types/database';
import { BOOKING_STATUS_LABELS } from '@/lib/constants';
import { Clock, CheckCircle2, CreditCard, Truck, Car, RotateCcw, Star, XCircle } from 'lucide-react';

type StatusConfig = {
  label: string;
  color: string;
  icon: React.ElementType;
  step: number;
};

const STATUS_CONFIG: Record<BookingStatus, StatusConfig> = {
  pending: {
    label: BOOKING_STATUS_LABELS.pending,
    color: 'bg-warning/10 text-warning border-warning/30',
    icon: Clock,
    step: 1,
  },
  confirmed: {
    label: BOOKING_STATUS_LABELS.confirmed,
    color: 'bg-primary/10 text-primary border-primary/30',
    icon: CheckCircle2,
    step: 2,
  },
  paid: {
    label: BOOKING_STATUS_LABELS.paid,
    color: 'bg-accent/10 text-accent border-accent/30',
    icon: CreditCard,
    step: 3,
  },
  in_delivery: {
    label: BOOKING_STATUS_LABELS.in_delivery,
    color: 'bg-primary/10 text-primary border-primary/30',
    icon: Truck,
    step: 4,
  },
  active: {
    label: BOOKING_STATUS_LABELS.active,
    color: 'bg-success/10 text-success border-success/30',
    icon: Car,
    step: 5,
  },
  returning: {
    label: BOOKING_STATUS_LABELS.returning,
    color: 'bg-warning/10 text-warning border-warning/30',
    icon: RotateCcw,
    step: 6,
  },
  completed: {
    label: BOOKING_STATUS_LABELS.completed,
    color: 'bg-success/10 text-success border-success/30',
    icon: Star,
    step: 7,
  },
  cancelled: {
    label: BOOKING_STATUS_LABELS.cancelled,
    color: 'bg-danger/10 text-danger border-danger/30',
    icon: XCircle,
    step: -1,
  },
};

const MAIN_FLOW: BookingStatus[] = ['pending', 'confirmed', 'paid', 'in_delivery', 'active', 'returning', 'completed'];

type BadgeProps = {
  status: BookingStatus;
  size?: 'sm' | 'md';
};

export function BookingStatusBadge({ status, size = 'md' }: BadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${config.color} ${sizeClass}`}>
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {config.label}
    </span>
  );
}

type StepperProps = {
  status: BookingStatus;
};

export function BookingStatusStepper({ status }: StepperProps) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
        <XCircle className="h-5 w-5 text-danger shrink-0" />
        <div>
          <p className="text-sm font-semibold text-danger">Pemesanan Dibatalkan</p>
          <p className="text-xs text-muted">Pemesanan ini telah dibatalkan</p>
        </div>
      </div>
    );
  }

  const currentStep = STATUS_CONFIG[status].step;

  return (
    <div className="space-y-1">
      {MAIN_FLOW.map((s, idx) => {
        const config = STATUS_CONFIG[s];
        const Icon = config.icon;
        const stepNum = idx + 1;
        const isDone = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isPending = stepNum > currentStep;
        const isLast = idx === MAIN_FLOW.length - 1;

        return (
          <div key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isDone ? 'border-success bg-success text-white' : isCurrent ? 'border-primary bg-primary text-white' : 'border-border bg-card text-subtle'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              {!isLast && <div className={`my-0.5 w-0.5 flex-1 min-h-5 rounded-full transition-colors ${isDone ? 'bg-success' : 'bg-border'}`} />}
            </div>

            <div className="pb-4 pt-1">
              <p className={`text-sm font-medium leading-none ${isPending ? 'text-muted' : 'text-foreground'}`}>{config.label}</p>
              {isCurrent && <p className="mt-0.5 text-xs text-primary">Status saat ini</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
