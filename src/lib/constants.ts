export const APP_NAME = "Jebrent";
export const APP_DESCRIPTION = "Platform Rental Kendaraan Terpercaya";

export const ROLES = {
  RENTER: "renter",
  OWNER: "owner",
  ADMIN: "admin",
  DRIVER: "driver",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  renter: "Penyewa",
  owner: "Pemilik",
  admin: "Admin",
  driver: "Pengantar",
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Dikonfirmasi",
  paid: "Sudah Dibayar",
  in_delivery: "Sedang Diantar",
  active: "Sedang Digunakan",
  returning: "Proses Pengembalian",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  available: "Tersedia",
  rented: "Disewa",
  maintenance: "Perawatan",
  inactive: "Tidak Aktif",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Belum Dibayar",
  pending_confirmation: "Menunggu Konfirmasi",
  confirmed: "Terkonfirmasi",
  refunded: "Dikembalikan",
};

// Deposit percentage from total price
export const DEPOSIT_PERCENTAGE = 0.3; // 30%
