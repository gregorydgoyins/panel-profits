-- Migration: 20260918000000_accounts_collections_watchlist.sql
-- Description: Production Account, Collection, and Watchlist foundation for Panel Profits

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Collections Table
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single default collection constraint per user
CREATE UNIQUE INDEX IF NOT EXISTS collections_user_default_idx 
  ON public.collections (user_id) 
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS collections_user_id_idx 
  ON public.collections (user_id);

-- 3. Collection Items Table
CREATE TABLE IF NOT EXISTS public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comic_id TEXT NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  grade TEXT,
  grading_company TEXT,
  certification_number TEXT,
  acquisition_date DATE,
  acquisition_cost NUMERIC(12, 2) CHECK (acquisition_cost >= 0),
  notes TEXT,
  ownership_status TEXT DEFAULT 'owned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate entries of the same comic in the same collection
CREATE UNIQUE INDEX IF NOT EXISTS collection_items_collection_comic_idx 
  ON public.collection_items (collection_id, comic_id);

CREATE INDEX IF NOT EXISTS collection_items_user_id_idx 
  ON public.collection_items (user_id);

CREATE INDEX IF NOT EXISTS collection_items_collection_id_idx 
  ON public.collection_items (collection_id);

CREATE INDEX IF NOT EXISTS collection_items_comic_id_idx 
  ON public.collection_items (comic_id);

CREATE INDEX IF NOT EXISTS collection_items_created_at_idx 
  ON public.collection_items (created_at);

-- 4. Watchlist Items Table
CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comic_id TEXT NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate watchlist entries for the same user and comic
CREATE UNIQUE INDEX IF NOT EXISTS watchlist_items_user_comic_idx 
  ON public.watchlist_items (user_id, comic_id);

CREATE INDEX IF NOT EXISTS watchlist_items_user_id_idx 
  ON public.watchlist_items (user_id);

CREATE INDEX IF NOT EXISTS watchlist_items_comic_id_idx 
  ON public.watchlist_items (comic_id);

CREATE INDEX IF NOT EXISTS watchlist_items_created_at_idx 
  ON public.watchlist_items (created_at);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (id = (SELECT auth.uid())) 
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" 
  ON public.profiles FOR DELETE 
  TO authenticated 
  USING (id = (SELECT auth.uid()));

-- 7. RLS Policies for Collections
DROP POLICY IF EXISTS "Users can view own collections" ON public.collections;
CREATE POLICY "Users can view own collections" 
  ON public.collections FOR SELECT 
  TO authenticated 
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own collections" ON public.collections;
CREATE POLICY "Users can insert own collections" 
  ON public.collections FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own collections" ON public.collections;
CREATE POLICY "Users can update own collections" 
  ON public.collections FOR UPDATE 
  TO authenticated 
  USING (user_id = (SELECT auth.uid())) 
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own collections" ON public.collections;
CREATE POLICY "Users can delete own collections" 
  ON public.collections FOR DELETE 
  TO authenticated 
  USING (user_id = (SELECT auth.uid()));

-- 8. RLS Policies for Collection Items
DROP POLICY IF EXISTS "Users can view own collection items" ON public.collection_items;
CREATE POLICY "Users can view own collection items" 
  ON public.collection_items FOR SELECT 
  TO authenticated 
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own collection items" ON public.collection_items;
CREATE POLICY "Users can insert own collection items" 
  ON public.collection_items FOR INSERT 
  TO authenticated 
  WITH CHECK (
    user_id = (SELECT auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM public.collections c 
      WHERE c.id = collection_id AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own collection items" ON public.collection_items;
CREATE POLICY "Users can update own collection items" 
  ON public.collection_items FOR UPDATE 
  TO authenticated 
  USING (user_id = (SELECT auth.uid())) 
  WITH CHECK (
    user_id = (SELECT auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM public.collections c 
      WHERE c.id = collection_id AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own collection items" ON public.collection_items;
CREATE POLICY "Users can delete own collection items" 
  ON public.collection_items FOR DELETE 
  TO authenticated 
  USING (user_id = (SELECT auth.uid()));

-- 9. RLS Policies for Watchlist Items
DROP POLICY IF EXISTS "Users can view own watchlist items" ON public.watchlist_items;
CREATE POLICY "Users can view own watchlist items" 
  ON public.watchlist_items FOR SELECT 
  TO authenticated 
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own watchlist items" ON public.watchlist_items;
CREATE POLICY "Users can insert own watchlist items" 
  ON public.watchlist_items FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own watchlist items" ON public.watchlist_items;
CREATE POLICY "Users can update own watchlist items" 
  ON public.watchlist_items FOR UPDATE 
  TO authenticated 
  USING (user_id = (SELECT auth.uid())) 
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own watchlist items" ON public.watchlist_items;
CREATE POLICY "Users can delete own watchlist items" 
  ON public.watchlist_items FOR DELETE 
  TO authenticated 
  USING (user_id = (SELECT auth.uid()));

-- 10. Automatic Timestamp Triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_collections_updated_at ON public.collections;
CREATE TRIGGER set_collections_updated_at 
  BEFORE UPDATE ON public.collections 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_collection_items_updated_at ON public.collection_items;
CREATE TRIGGER set_collection_items_updated_at 
  BEFORE UPDATE ON public.collection_items 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 11. Automatic Profile and Default Collection Initialization Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

  INSERT INTO public.collections (user_id, name, description, is_default)
  VALUES (
    NEW.id,
    'My Collection',
    'Default comic collection',
    true
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant appropriate permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist_items TO authenticated;
