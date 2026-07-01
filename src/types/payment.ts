import type {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentWithBooking,
} from "@/types/database";

export type {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentWithBooking,
};

export type PaymentActionResult = {
  error?: string;
  success?: boolean;
  paymentId?: string;
};
