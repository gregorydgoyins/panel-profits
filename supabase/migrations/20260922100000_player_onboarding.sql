-- Additive player-facing onboarding state on the existing auth-linked player profile.
-- The current Clean game lineage uses profiles.id for player-owned state.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT NOT NULL DEFAULT 'identity',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.comics TO anon, authenticated;
DO $$
BEGIN
  IF to_regclass('public.market_state') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.market_state TO anon, authenticated';
    EXECUTE 'ALTER TABLE public.market_state ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view current market telemetry" ON public.market_state';
    EXECUTE 'CREATE POLICY "Public can view current market telemetry" ON public.market_state FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END;
$$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_onboarding_step_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_step_check
  CHECK (onboarding_step IN ('identity', 'orientation', 'ready', 'complete'));

CREATE OR REPLACE FUNCTION public.complete_player_onboarding(p_display_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_step TEXT;
  normalized_name TEXT := NULLIF(BTRIM(p_display_name), '');
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF normalized_name IS NULL OR char_length(normalized_name) < 2 THEN
    RAISE EXCEPTION 'Display name must contain at least two characters';
  END IF;

  SELECT onboarding_step
    INTO current_step
    FROM public.profiles
   WHERE id = current_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player profile does not exist';
  END IF;

  IF current_step = 'complete' THEN
    RETURN jsonb_build_object('status', 'already_complete', 'player_id', current_user_id);
  END IF;

  UPDATE public.profiles
     SET username = normalized_name,
         onboarding_step = 'complete',
         onboarding_completed_at = COALESCE(onboarding_completed_at, now())
   WHERE id = current_user_id;

  RETURN jsonb_build_object('status', 'complete', 'player_id', current_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_player_onboarding(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_player_onboarding(TEXT) TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players can view own profile" ON public.profiles;
CREATE POLICY "Players can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Players can update own profile" ON public.profiles;
CREATE POLICY "Players can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DO $$
BEGIN
  IF to_regclass('public.player_alerts') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.player_alerts TO authenticated';
    EXECUTE 'ALTER TABLE public.player_alerts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Players can view own alerts" ON public.player_alerts';
    EXECUTE 'CREATE POLICY "Players can view own alerts" ON public.player_alerts FOR SELECT TO authenticated USING (player_id = (SELECT auth.uid()))';
  END IF;
  IF to_regclass('public.player_holdings') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.player_holdings TO authenticated';
    EXECUTE 'ALTER TABLE public.player_holdings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Players can view own holdings" ON public.player_holdings';
    EXECUTE 'CREATE POLICY "Players can view own holdings" ON public.player_holdings FOR SELECT TO authenticated USING (player_id = (SELECT auth.uid()))';
  END IF;
  IF to_regclass('public.player_points') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.player_points TO authenticated';
    EXECUTE 'ALTER TABLE public.player_points ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Players can view own points" ON public.player_points';
    EXECUTE 'CREATE POLICY "Players can view own points" ON public.player_points FOR SELECT TO authenticated USING (player_id = (SELECT auth.uid()))';
  END IF;
END;
$$;