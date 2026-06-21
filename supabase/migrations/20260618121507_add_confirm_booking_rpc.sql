-- Update fungsi dengan explicit cast ke enum type & transaction handling
create or replace function confirm_booking_transaction(
  p_booking_id uuid,
  p_vehicle_id uuid,
  p_booking_status text,
  p_vehicle_status text
) returns void as $$
begin
  -- Cast text ke enum type yang sesuai dengan kolom di database
  update bookings 
    set status = p_booking_status::booking_status, updated_at = now()
    where id = p_booking_id;

  update vehicles 
    set status = p_vehicle_status::vehicle_status, updated_at = now()
    where id = p_vehicle_id;

exception when others then
  raise exception 'Transaction failed: %', sqlerrm;
end;
$$ language plpgsql security definer;