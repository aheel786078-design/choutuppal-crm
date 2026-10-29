-- ======================================================================
-- CHOUTUPPAL SUPERAPP & MULTI-TOWN FRANCHISE PLATFORM
-- MIGRATION 03: CONTENT, DIRECTORY & MONETIZATION SCHEMA
-- ======================================================================

-- 21. Local News Items Table
CREATE TABLE IF NOT EXISTS public.news_items (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  telugu_title TEXT,
  slug TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'local_updates',
  author TEXT NOT NULL DEFAULT 'Mana Choutuppal Desk',
  image_url TEXT,
  cover_image TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  is_featured BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_territory_news_slug UNIQUE (territory_id, slug)
);

-- 22. Short Video Reels (Shorts) Table
CREATE TABLE IF NOT EXISTS public.short_items (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  author_name TEXT NOT NULL,
  author_phone TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. Promotional Homepage Banners Table
CREATE TABLE IF NOT EXISTS public.banner_items (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  target_url TEXT,
  link_url TEXT, -- Alias for target_url
  type TEXT DEFAULT 'hero_main',
  placement TEXT DEFAULT 'home_top' CHECK (placement IN ('home_top', 'directory_top', 'shorts_interstitial', 'footer')),
  is_active BOOLEAN DEFAULT TRUE,
  clicks INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. Breaking News & Headline Tickers Table
CREATE TABLE IF NOT EXISTS public.ticker_items (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  link TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. Official Government Contacts Directory Table
CREATE TABLE IF NOT EXISTS public.government_contacts (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  officer_name TEXT,
  phone TEXT NOT NULL,
  secondary_phone TEXT,
  email TEXT,
  office_address TEXT,
  pincode TEXT DEFAULT '508252',
  service_category TEXT NOT NULL CHECK (service_category IN ('emergency', 'police', 'revenue', 'electricity', 'municipality', 'panchayat', 'health', 'judiciary', 'other')),
  priority_rank INTEGER DEFAULT 100,
  is_emergency BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. Commercial Listing Plans
CREATE TABLE IF NOT EXISTS public.listing_plans (
  id TEXT PRIMARY KEY, -- e.g. 'plan_premium_monthly', 'plan_featured_monthly'
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('free', 'premium', 'featured', 'bundle')),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'quarterly', 'annual', 'one_time')),
  duration_days INTEGER NOT NULL DEFAULT 30,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. Merchant Listing Subscriptions
CREATE TABLE IF NOT EXISTS public.listing_subscriptions (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.listing_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. Featured Listing Boost Promotions
CREATE TABLE IF NOT EXISTS public.featured_promotions (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. Payment Orders & Transactions Tables
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  gateway_order_id TEXT UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'refunded')),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  listing_id TEXT REFERENCES public.listings(id) ON DELETE SET NULL,
  plan_id TEXT REFERENCES public.listing_plans(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  gateway_payment_id TEXT UNIQUE,
  gateway_signature TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING', 'REFUNDED')),
  raw_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- INDEXES FOR CONTENT & MONETIZATION
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_news_territory ON public.news_items (territory_id);
CREATE INDEX IF NOT EXISTS idx_shorts_territory ON public.short_items (territory_id);
CREATE INDEX IF NOT EXISTS idx_banners_territory ON public.banner_items (territory_id);
CREATE INDEX IF NOT EXISTS idx_govt_territory ON public.government_contacts (territory_id);
CREATE INDEX IF NOT EXISTS idx_govt_category ON public.government_contacts (service_category);
CREATE INDEX IF NOT EXISTS idx_subs_listing ON public.listing_subscriptions (listing_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON public.listing_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_orders_territory ON public.payment_orders (territory_id);
CREATE INDEX IF NOT EXISTS idx_orders_gateway ON public.payment_orders (gateway_order_id);
