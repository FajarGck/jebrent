-- Drop the old function
DROP FUNCTION IF EXISTS public.create_user_by_admin(text, text, text, text);

-- Recreate the create_user_by_admin function with confirmed_at populated
CREATE OR REPLACE FUNCTION public.create_user_by_admin(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- Generate user ID
  v_user_id := gen_random_uuid();
  
  -- Encrypt password
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  -- Insert into auth.users (including confirmed_at)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_password,
    now(),
    now(), -- confirmed_at is required for login to bypass email verification
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(),
    now(),
    false
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS insert policy on vehicles to allow admin insertion
DROP POLICY IF EXISTS "Vehicles: owner can insert" ON vehicles;
CREATE POLICY "Vehicles: owner can insert"
  ON vehicles FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = owner_id AND public.is_vehicle_manager()) OR public.get_user_role() = 'admin');
