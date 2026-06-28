// components/payments/payment-status.tsx — Dev B ONLY
// Badge status pembayaran (mengikuti pattern BookingStatusBadge)

import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { Clock, CreditCard, CheckCircle2, XCircle } from "lucide-react";
import type { PaymentStatus } from "@/types/database";

type StatusConfig = {
  label: string;
  color: string;
  icon: React.ElementType;
};

const STATUS_CONFIG: Record<PaymentStatus, StatusConfig> = {
  unpaid: {
    label: PAYMENT_STATUS_LABELS.unpaid,
    color: "bg-warning/10 text-warning border-warning/30",
    icon: Clock,
  },
  pending_confirmation: {
    label: PAYMENT_STATUS_LABELS.pending_confirmation,
    color: "bg-primary/10 text-primary border-primary/30",
    icon: CreditCard,
  },
  confirmed: {
    label: PAYMENT_STATUS_LABELS.confirmed,
    color: "bg-success/10 text-success border-success/30",
    icon: CheckCircle2,
  },
  refunded: {
    label: PAYMENT_STATUS_LABELS.refunded,
    color: "bg-danger/10 text-danger border-danger/30",
    icon: XCircle,
  },
  rejected: {
    label: PAYMENT_STATUS_LABELS.rejected,
    color: "bg-danger/10 text-danger border-danger/30",
    icon: XCircle,
  },
};

type BadgeProps = {
  status: PaymentStatus;
  size?: "sm" | "md";
};

export function PaymentStatusBadge({ status, size = "md" }: BadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClass =
    size === "sm"
      ? "px-2 py-0.5 text-xs gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.color} ${sizeClass}`}
    >
      <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {config.label}
    </span>
  );
}
