-- ======================================================================
-- CHOUTUPPAL SUPERAPP & MULTI-TOWN FRANCHISE PLATFORM
-- MIGRATION 02: CRM & WHATSAPP AUTOMATION ENGINE SCHEMA
-- ======================================================================

-- 13. WhatsApp Messages History (Territory & Contact-Scoped)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  sender TEXT NOT NULL DEFAULT 'customer' CHECK (sender IN ('customer', 'bot', 'agent', 'system')),
  text TEXT NOT NULL,
  message_text TEXT, -- Alias for text
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'document', 'button', 'interactive', 'location')),
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received')),
  provider_message_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Conversations Aggregation View / Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY, -- e.g. 'conv_{phone}'
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  last_message_text TEXT,
  last_message_direction TEXT CHECK (last_message_direction IN ('INBOUND', 'OUTBOUND')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'archived', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_territory_phone UNIQUE (territory_id, phone)
);

-- 15. WhatsApp Interactive Flows (Multi-Step Bot)
CREATE TABLE IF NOT EXISTS public.whatsapp_flows (
  id TEXT PRIMARY KEY, -- e.g. 'flow_welcome_day1'
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'keyword',
  trigger_keyword TEXT,
  trigger_keywords TEXT[] DEFAULT '{}',
  initial_message TEXT DEFAULT '',
  button_options TEXT[] DEFAULT '{}',
  template_slug TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  type TEXT DEFAULT 'INTERACTIVE_FLOW',
  version INTEGER DEFAULT 1,
  entry_node_id TEXT DEFAULT 'start',
  triggers JSONB DEFAULT '[]'::jsonb,
  nodes JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Automation Rules Engine (179 Verified Rules)
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id TEXT PRIMARY KEY, -- e.g. 'auto_001_welcome'
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('first_inbound_message', 'keyword_match', 'time_based', 'stage_change', 'tag_added')),
  trigger_value TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('send_message', 'add_tag', 'remove_tag', 'assign_staff', 'update_stage', 'notify_admin')),
  action_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft')),
  is_global BOOLEAN DEFAULT TRUE,
  is_supported BOOLEAN DEFAULT TRUE,
  description TEXT,
  template_slug TEXT,
  delay_minutes INTEGER DEFAULT 0,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Automation Execution Logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  automation_id TEXT REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  contact_id TEXT REFERENCES public.contacts(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'SKIPPED', 'QUEUED')),
  details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. CRM Pipelines & Deals
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES public.contacts(id) ON DELETE CASCADE,
  listing_id TEXT REFERENCES public.listings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  tag TEXT,
  value NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'INR',
  stage TEXT NOT NULL DEFAULT 'NEW_LEAD' CHECK (stage IN ('NEW_LEAD', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'DISCOVERY', 'WON', 'LOST')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'WON', 'LOST', 'ABANDONED')),
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Broadcast Campaigns
CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id TEXT PRIMARY KEY,
  territory_id TEXT NOT NULL DEFAULT 'territory_choutuppal' REFERENCES public.territories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_tags TEXT[] DEFAULT '{}',
  message_text TEXT NOT NULL,
  media_url TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')),
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Webhook Events (Idempotent De-duplication & Audit)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'whatsapp' CHECK (provider IN ('whatsapp', 'razorpay', 'custom')),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED', 'DUPLICATE_IGNORED')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_provider_event_id UNIQUE (provider, event_id)
);

-- --------------------------------------------------------------------------
-- INDEXES FOR CRM PERFORMANCE
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_messages_territory ON public.whatsapp_messages (territory_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact ON public.whatsapp_messages (contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_provider_id ON public.whatsapp_messages (provider_message_id);
CREATE INDEX IF NOT EXISTS idx_conversations_territory ON public.conversations (territory_id);
CREATE INDEX IF NOT EXISTS idx_automations_territory ON public.automation_rules (territory_id);
CREATE INDEX IF NOT EXISTS idx_automations_active ON public.automation_rules (is_active);
CREATE INDEX IF NOT EXISTS idx_deals_territory ON public.crm_deals (territory_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON public.crm_deals (contact_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_territory ON public.broadcast_campaigns (territory_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_payload_hash ON public.webhook_events (payload_hash);
