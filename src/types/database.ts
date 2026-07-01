export type UserRole = 'renter' | 'owner' | 'admin' | 'driver';

export type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'inactive';

export type VehicleType = 'sedan' | 'suv' | 'mpv' | 'hatchback' | 'pickup' | 'van';

export type BookingStatus = 'pending' | 'confirmed' | 'paid' | 'in_delivery' | 'active' | 'returning' | 'completed' | 'cancelled';

export type PaymentStatus = 'unpaid' | 'pending_confirmation' | 'confirmed' | 'rejected' | 'refunded';

export type PaymentMethod = 'bank_transfer' | 'ewallet' | 'cash';

export type DeliveryStatus = 'assigned' | 'on_the_way' | 'delivered' | 'completed';

export type RentalDuration = 'half_day' | 'daily' | 'weekly';

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  emergency_phone: string | null;
  nik: string | null;
  avatar_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

export type Vehicle = {
  id: string;
  owner_id: string;
  plate_number: string;
  brand: string;
  model: string;
  type: VehicleType;
  year: number;
  color: string;
  half_day_rate: number;
  daily_rate: number;
  weekly_rate: number | null;
  status: VehicleStatus;
  mileage: number;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleImage = {
  id: string;
  vehicle_id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
};

export type Booking = {
  id: string;
  renter_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  duration_type: RentalDuration;
  delivery_address: string | null;
  status: BookingStatus;
  deposit_amount: number;
  total_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  booking_id: string;
  payment_method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  proof_image_url: string | null;
  paid_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  payment_type: 'dp' | 'final' | 'fine';
  created_at: string;
};

export type Addon = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type BookingAddon = {
  id: string;
  booking_id: string;
  addon_id: string;
  quantity: number;
  subtotal: number;
};

export type Review = {
  id: string;
  booking_id: string;
  vehicle_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type DeliverySchedule = {
  id: string;
  booking_id: string;
  driver_id: string;
  departure_time: string;
  delivery_status: DeliveryStatus;
  notes: string | null;
  proof_image_url: string | null;
  completed_at: string | null;
  created_at: string;
};

export type BookingWithVehicle = Booking & {
  vehicles: Vehicle & {
    vehicle_images: VehicleImage[];
  };
  profiles: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url'>;
};

export type BookingWithDetails = Booking & {
  vehicles: Vehicle & {
    vehicle_images: VehicleImage[];
    profiles: Pick<Profile, 'id' | 'full_name' | 'phone'> | null;
  };
  profiles: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url'>;
  payments: Payment | null;
  reviews: any;
  delivery_schedules:
    | (DeliverySchedule & {
        profiles: Pick<Profile, 'id' | 'full_name' | 'phone'> | null;
      })
    | null;
};

export type PaymentWithBooking = Payment & {
  bookings: Booking & {
    vehicles: Pick<Vehicle, 'id' | 'brand' | 'model' | 'plate_number'>;
    profiles: Pick<Profile, 'id' | 'full_name'>;
  };
};

export type ReviewWithProfile = Review & {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
};

export type DeliveryWithDetails = DeliverySchedule & {
  profiles: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url'>;
  bookings: Booking & {
    vehicles: Pick<Vehicle, 'id' | 'brand' | 'model' | 'plate_number'>;
    profiles: Pick<Profile, 'id' | 'full_name' | 'phone'> | null;
  };
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      vehicles: {
        Row: Vehicle;
        Insert: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Vehicle, 'id' | 'created_at'>>;
      };
      vehicle_images: {
        Row: VehicleImage;
        Insert: Omit<VehicleImage, 'id'>;
        Update: Partial<Omit<VehicleImage, 'id'>>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Booking, 'id' | 'created_at'>>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'id' | 'created_at'>;
        Update: Partial<Omit<Payment, 'id' | 'created_at'>>;
      };
      addons: {
        Row: Addon;
        Insert: Omit<Addon, 'id' | 'created_at'>;
        Update: Partial<Omit<Addon, 'id' | 'created_at'>>;
      };
      booking_addons: {
        Row: BookingAddon;
        Insert: Omit<BookingAddon, 'id'>;
        Update: Partial<Omit<BookingAddon, 'id'>>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at'>;
        Update: Partial<Omit<Review, 'id' | 'created_at'>>;
      };
      delivery_schedules: {
        Row: DeliverySchedule;
        Insert: Omit<DeliverySchedule, 'id' | 'created_at'>;
        Update: Partial<Omit<DeliverySchedule, 'id' | 'created_at'>>;
      };
    };
    Enums: {
      user_role: UserRole;
      vehicle_status: VehicleStatus;
      vehicle_type: VehicleType;
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      delivery_status: DeliveryStatus;
      rental_duration: RentalDuration;
    };
  };
};
