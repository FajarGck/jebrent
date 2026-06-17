-- Fix "permission denied for table vehicles" for owner accounts.
-- Causes: missing table GRANTs and/or RLS only trusting profiles.role while metadata says owner.

-- Table privileges for API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

-- Role helper: profiles table OR JWT user_metadata (set at registration)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    (
      SELECT CASE
        WHEN (raw_user_meta_data->>'role') IN ('admin', 'owner', 'renter', 'driver')
        THEN (raw_user_meta_data->>'role')::public.user_role
        ELSE NULL
      END
      FROM auth.users
      WHERE id = auth.uid()
    ),
    CASE
      WHEN (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'owner', 'renter', 'driver')
      THEN (auth.jwt() -> 'user_metadata' ->> 'role')::public.user_role
      ELSE NULL
    END,
    'renter'::public.user_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_vehicle_manager()
RETURNS boolean AS $$
  SELECT public.get_user_role() IN ('owner', 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Profiles: allow insert if signup trigger missed
DROP POLICY IF EXISTS "Profiles: insert own" ON profiles;
CREATE POLICY "Profiles: insert own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Vehicles: owner insert (profiles.role OR JWT metadata)
DROP POLICY IF EXISTS "Vehicles: owner can insert" ON vehicles;
CREATE POLICY "Vehicles: owner can insert"
  ON vehicles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND public.is_vehicle_manager());

DROP POLICY IF EXISTS "Vehicles: owner/admin can update" ON vehicles;
CREATE POLICY "Vehicles: owner/admin can update"
  ON vehicles FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.get_user_role() = 'admin')
  WITH CHECK (auth.uid() = owner_id OR public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Vehicles: owner/admin can delete" ON vehicles;
CREATE POLICY "Vehicles: owner/admin can delete"
  ON vehicles FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.get_user_role() = 'admin');
