CREATE TABLE IF NOT EXISTS public.player_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.player_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  grade TEXT,
  acquired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.player_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_alerts_player_created_idx
  ON public.player_alerts(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS player_holdings_player_idx
  ON public.player_holdings(player_id);
CREATE INDEX IF NOT EXISTS player_points_player_created_idx
  ON public.player_points(player_id, created_at DESC);

ALTER TABLE public.player_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_points ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.player_alerts, public.player_holdings, public.player_points FROM anon;
GRANT SELECT ON public.player_alerts, public.player_holdings, public.player_points TO authenticated;

DROP POLICY IF EXISTS "Players can view own alerts" ON public.player_alerts;
CREATE POLICY "Players can view own alerts"
  ON public.player_alerts FOR SELECT TO authenticated
  USING (player_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Players can view own holdings" ON public.player_holdings;
CREATE POLICY "Players can view own holdings"
  ON public.player_holdings FOR SELECT TO authenticated
  USING (player_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Players can view own points" ON public.player_points;
CREATE POLICY "Players can view own points"
  ON public.player_points FOR SELECT TO authenticated
  USING (player_id = (SELECT auth.uid()));