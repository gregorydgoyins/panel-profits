-- Transactional two-user RLS verification. All test records are rolled back.
BEGIN;

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
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'rls-user-a@panelprofits.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"RLS User A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'rls-user-b@panelprofits.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"RLS User B"}'::jsonb,
    now(),
    now()
  );

DO $$
DECLARE
  user_a uuid := '10000000-0000-0000-0000-000000000001';
  user_b uuid := '20000000-0000-0000-0000-000000000002';
  user_a_collection uuid;
  visible_count integer;
BEGIN
  SELECT id INTO user_a_collection
  FROM public.collections
  WHERE user_id = user_a AND is_default;

  IF user_a_collection IS NULL THEN
    RAISE EXCEPTION 'User A default collection was not created';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO visible_count
  FROM public.collections;

  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'User A expected exactly one visible collection, found %', visible_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.collections WHERE user_id = user_b
  ) THEN
    RAISE EXCEPTION 'User A can read User B collection data';
  END IF;

  BEGIN
    INSERT INTO public.watchlist_items (user_id, comic_id)
    SELECT user_b, id FROM public.comics LIMIT 1;
    RAISE EXCEPTION 'User A inserted a watchlist row owned by User B';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      NULL;
  END;

  RESET ROLE;
END;
$$;

ROLLBACK;
