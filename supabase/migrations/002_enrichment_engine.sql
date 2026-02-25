-- Phase 2: Enrichment Engine Schema
-- Creates queue, budget, cache, and provenance tables
-- Alters contacts and companies with enrichment columns

-- ============================================================
-- 1. Enrichment Queue
-- ============================================================
CREATE TABLE IF NOT EXISTS enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company')),
  entity_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('apollo', 'proxycurl', 'zerobounce')),
  operation TEXT NOT NULL CHECK (operation IN ('enrich_person', 'enrich_company', 'verify_email', 'find_email')),
  priority INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  scheduled_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedup: prevent duplicate pending/processing items for same entity+provider+operation
CREATE UNIQUE INDEX idx_enrichment_queue_dedup
  ON enrichment_queue (entity_type, entity_id, provider, operation)
  WHERE status IN ('pending', 'processing');

-- Query pattern: fetch next batch ordered by priority
CREATE INDEX idx_enrichment_queue_status_priority
  ON enrichment_queue (status, priority DESC, scheduled_after)
  WHERE status = 'pending';

-- ============================================================
-- 2. Enrichment Credit Budgets
-- ============================================================
CREATE TABLE IF NOT EXISTS enrichment_credit_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('apollo', 'proxycurl', 'zerobounce')),
  period TEXT NOT NULL CHECK (period IN ('daily', 'monthly')),
  period_start DATE NOT NULL,
  budget_limit INTEGER NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_credit_budgets_provider_period
  ON enrichment_credit_budgets (provider, period, period_start);

-- ============================================================
-- 3. Enrichment Cache
-- ============================================================
CREATE TABLE IF NOT EXISTS enrichment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  request_params JSONB NOT NULL,
  response_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enrichment_cache_key ON enrichment_cache (cache_key);
CREATE INDEX idx_enrichment_cache_expires ON enrichment_cache (expires_at);

-- ============================================================
-- 4. Enrichment Field Provenance
-- ============================================================
CREATE TABLE IF NOT EXISTS enrichment_field_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company')),
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  value TEXT,
  confidence REAL,
  enriched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_provenance_entity
  ON enrichment_field_provenance (entity_type, entity_id);

CREATE UNIQUE INDEX idx_provenance_entity_field_provider
  ON enrichment_field_provenance (entity_type, entity_id, field_name, provider);

-- ============================================================
-- 5. ALTER contacts
-- ============================================================
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS email_status TEXT CHECK (email_status IN ('valid', 'invalid', 'catch-all', 'spamtrap', 'abuse', 'do_not_mail', 'unknown', NULL)),
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;

-- ============================================================
-- 6. ALTER companies
-- ============================================================
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS annual_revenue BIGINT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS technologies TEXT[],
  ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- ============================================================
-- 7. RPC: Atomic credit consumption
-- ============================================================
CREATE OR REPLACE FUNCTION increment_credit_usage(
  p_provider TEXT,
  p_period TEXT,
  p_period_start DATE,
  p_amount INTEGER DEFAULT 1
)
RETURNS TABLE(new_credits_used INTEGER, budget_limit INTEGER) AS $$
BEGIN
  RETURN QUERY
  UPDATE enrichment_credit_budgets
  SET credits_used = credits_used + p_amount,
      updated_at = now()
  WHERE provider = p_provider
    AND period = p_period
    AND period_start = p_period_start
    AND credits_used + p_amount <= enrichment_credit_budgets.budget_limit
  RETURNING credits_used, enrichment_credit_budgets.budget_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. RPC: Reset expired credit budgets (create new daily rows)
-- ============================================================
CREATE OR REPLACE FUNCTION reset_expired_credit_budgets()
RETURNS void AS $$
DECLARE
  prov TEXT;
  daily_limit INTEGER;
  monthly_limit INTEGER;
BEGIN
  -- Default daily/monthly limits per provider
  FOR prov, daily_limit, monthly_limit IN
    VALUES ('apollo', 100, 2000), ('proxycurl', 50, 1000), ('zerobounce', 200, 5000)
  LOOP
    -- Create daily budget if not exists
    INSERT INTO enrichment_credit_budgets (provider, period, period_start, budget_limit)
    VALUES (prov, 'daily', CURRENT_DATE, daily_limit)
    ON CONFLICT (provider, period, period_start) DO NOTHING;

    -- Create monthly budget if not exists
    INSERT INTO enrichment_credit_budgets (provider, period, period_start, budget_limit)
    VALUES (prov, 'monthly', date_trunc('month', CURRENT_DATE)::date, monthly_limit)
    ON CONFLICT (provider, period, period_start) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. Trigger for updated_at on enrichment_queue
-- ============================================================
CREATE OR REPLACE TRIGGER update_enrichment_queue_updated_at
  BEFORE UPDATE ON enrichment_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. Initialize today's budgets
-- ============================================================
SELECT reset_expired_credit_budgets();
