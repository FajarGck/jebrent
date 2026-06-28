-- Recreate the create_user_by_admin function to correctly populate token columns with empty strings
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
  
  -- Encrypt password (with standard blowfish work factor 10)
  v_encrypted_password := crypt(p_password, gen_salt('bf', 10));

  -- Insert into auth.users (including all required token strings to avoid GoTrue 500 error)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    reauthentication_token,
    phone_change,
    phone_change_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_password,
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(),
    now(),
    false,
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  );

  -- Insert into auth.identities to link identity provider
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true),
    'email',
    v_user_id,
    now(),
    now(),
    now()
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
