// types/payment.ts — Dev B ONLY
// Extended Payment Types (mengikuti pattern types/booking.ts)

import type {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentWithBooking,
} from "@/types/database";

// Re-export agar consumer cukup import dari sini
export type {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentWithBooking,
};

// Action result (konsisten dengan BookingActionResult)
export type PaymentActionResult = {
  error?: string;
  success?: boolean;
  paymentId?: string;
};
