export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <h1>Detail Booking</h1>
      {/* TODO: Booking detail with payment status, delivery info */}
    </div>
  );
}
