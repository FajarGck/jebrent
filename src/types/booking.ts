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

export type CreateBookingInput = {
  vehicleId: string;
  startDate: string;
  endDate: string;
  durationType: RentalDuration;
  deliveryAddress: string | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  usageRadius?: number | null;
  notes: string | null;
};

export type AssignDriverInput = {
  bookingId: string;
  driverId: string;
  departureTime: string;
  notes: string | null;
};

export type UpdateDeliveryStatusInput = {
  deliveryId: string;
  status: DeliveryStatus;
};

export type PriceBreakdown = {
  dailyRate: number;
  halfDayRate: number;
  numberOfDays: number;
  durationType: RentalDuration;
  subtotal: number;
  depositAmount: number;
  totalPrice: number;
};

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

export type BookingFilters = {
  status?: BookingStatus | "all";
  startDateFrom?: string;
  startDateTo?: string;
  sort?: "newest" | "oldest" | "start_date_asc" | "start_date_desc";
};

export type DeliveryFilters = {
  status?: DeliveryStatus | "all";
  dateFrom?: string;
  dateTo?: string;
};

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
