// =============================================================
// src/types/booking.ts
// Extended Booking & Delivery Types — Dev A ONLY
// =============================================================
// File ini berisi type TAMBAHAN di atas yang sudah ada di database.ts.
// - JANGAN duplikasi type yang sudah ada di database.ts
// - Import dari sini untuk form, filter, dan UI-specific types
// =============================================================

import type {
  Booking,
  BookingStatus,
  BookingWithDetails,
  BookingWithVehicle,
  DeliverySchedule,
  DeliveryStatus,
  DeliveryWithDetails,
  RentalDuration,
  Vehicle,
} from "@/types/database";

// Re-export supaya consumer tidak perlu import dari 2 file
export type {
  Booking,
  BookingStatus,
  BookingWithDetails,
  BookingWithVehicle,
  DeliverySchedule,
  DeliveryStatus,
  DeliveryWithDetails,
  RentalDuration,
};

// =============================================================
// Form Input Types
// =============================================================

/** Input dari booking-form.tsx sebelum dikirim ke createBooking() */
export type CreateBookingInput = {
  vehicleId: string;
  startDate: string;       // format: "YYYY-MM-DD"
  endDate: string;         // format: "YYYY-MM-DD"
  durationType: RentalDuration;
  deliveryAddress: string | null;
  notes: string | null;
};

/** Input untuk assign driver ke booking */
export type AssignDriverInput = {
  bookingId: string;
  driverId: string;
  departureTime: string;   // ISO timestamp
  notes: string | null;
};

/** Input untuk update status delivery */
export type UpdateDeliveryStatusInput = {
  deliveryId: string;
  status: DeliveryStatus;
};

// =============================================================
// Calculated / Derived Types
// =============================================================

/** Kalkulasi harga sewa sebelum booking dibuat */
export type PriceBreakdown = {
  dailyRate: number;
  halfDayRate: number;
  numberOfDays: number;
  durationType: RentalDuration;
  subtotal: number;
  depositAmount: number;   // 30% dari total (DEPOSIT_PERCENTAGE dari constants.ts)
  totalPrice: number;
};

/** Summary ringkas untuk booking card di list */
export type BookingSummary = Pick<
  Booking,
  | "id"
  | "status"
  | "start_date"
  | "end_date"
  | "total_price"
  | "created_at"
> & {
  vehicle: Pick<Vehicle, "id" | "brand" | "model" | "plate_number">;
  vehiclePrimaryImageUrl: string | null;
};

// =============================================================
// Filter Types
// =============================================================

/** Filter untuk list booking (getMyBookings, getOwnerBookings) */
export type BookingFilters = {
  status?: BookingStatus | "all";
  startDateFrom?: string;
  startDateTo?: string;
  sort?: "newest" | "oldest" | "start_date_asc" | "start_date_desc";
};

/** Filter untuk list delivery (getDriverDeliveries) */
export type DeliveryFilters = {
  status?: DeliveryStatus | "all";
  dateFrom?: string;
  dateTo?: string;
};

// =============================================================
// Action Result Type (konsisten dengan vehicles.ts pattern)
// =============================================================

export type BookingActionResult = {
  error?: string;
  success?: boolean;
  bookingId?: string;
};

export type DeliveryActionResult = {
  error?: string;
  success?: boolean;
  deliveryId?: string;
};
