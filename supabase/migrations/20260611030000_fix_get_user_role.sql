-- Align RLS role checks with auth metadata when profile row is missing or outdated.
-- App-level resolveUserRole() already falls back to user_metadata; get_user_role() must too.

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
    'renter'::public.user_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Allow users to create their own profile if the signup trigger did not run.
CREATE POLICY "Profiles: insert own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
