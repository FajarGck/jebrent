// Redirect ke /bookings — halaman booking sudah ada di sana
// Dashboard sidebar mengarah ke /dashboard/renter/bookings, kita redirect ke /bookings
import { redirect } from 'next/navigation';

export default function RenterBookingsRedirect() {
  redirect('/bookings');
}
