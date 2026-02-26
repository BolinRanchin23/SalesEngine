-- Phase 3: Replace ProxyCurl with People Data Labs (PDL)
-- ProxyCurl is defunct; PDL replaces it for person enrichment
-- PDL is person-only (no company enrichment) — Apollo becomes sole company provider

-- ============================================================
-- 1. Add PDL-specific columns to contacts
-- ============================================================
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS seniority TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS pdl_id TEXT;

-- ============================================================
-- 2. Drop ALL old CHECK constraints first (so data can be updated)
-- ============================================================
ALTER TABLE enrichment_queue DROP CONSTRAINT IF EXISTS enrichment_queue_provider_check;
ALTER TABLE enrichment_credit_budgets DROP CONSTRAINT IF EXISTS enrichment_credit_budgets_provider_check;
ALTER TABLE enrichment_logs DROP CONSTRAINT IF EXISTS enrichment_logs_provider_check;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_source_check;

-- ============================================================
-- 3. Migrate existing data: proxycurl → pdl
-- ============================================================
UPDATE enrichment_queue SET provider = 'pdl' WHERE provider = 'proxycurl';
UPDATE enrichment_credit_budgets SET provider = 'pdl' WHERE provider = 'proxycurl';
UPDATE enrichment_field_provenance SET provider = 'pdl' WHERE provider = 'proxycurl';
UPDATE contacts SET source = 'pdl' WHERE source = 'proxycurl';

-- ============================================================
-- 4. Add new CHECK constraints with pdl
-- ============================================================
ALTER TABLE enrichment_queue
  ADD CONSTRAINT enrichment_queue_provider_check
  CHECK (provider IN ('apollo', 'pdl', 'zerobounce'));

ALTER TABLE enrichment_credit_budgets
  ADD CONSTRAINT enrichment_credit_budgets_provider_check
  CHECK (provider IN ('apollo', 'pdl', 'zerobounce'));

-- enrichment_logs: keep proxycurl for historical logs, add pdl
ALTER TABLE enrichment_logs
  ADD CONSTRAINT enrichment_logs_provider_check
  CHECK (provider IN ('apollo', 'proxycurl', 'clearbit', 'zerobounce', 'pdl'));

ALTER TABLE contacts
  ADD CONSTRAINT contacts_source_check
  CHECK (source IN ('airtable_people', 'airtable_community_partners', 'apollo', 'pdl', 'manual'));

-- ============================================================
-- 5. Update budget limits for PDL (was ProxyCurl: 50/1000, PDL: 50/350)
-- ============================================================
UPDATE enrichment_credit_budgets
SET budget_limit = 50
WHERE provider = 'pdl' AND period = 'daily';

UPDATE enrichment_credit_budgets
SET budget_limit = 350
WHERE provider = 'pdl' AND period = 'monthly';

-- ============================================================
-- 6. Update reset_expired_credit_budgets() to use pdl instead of proxycurl
-- ============================================================
CREATE OR REPLACE FUNCTION reset_expired_credit_budgets()
RETURNS void AS $$
DECLARE
  prov TEXT;
  daily_limit INTEGER;
  monthly_limit INTEGER;
BEGIN
  FOR prov, daily_limit, monthly_limit IN
    VALUES ('apollo', 100, 2000), ('pdl', 50, 350), ('zerobounce', 200, 5000)
  LOOP
    INSERT INTO enrichment_credit_budgets (provider, period, period_start, budget_limit)
    VALUES (prov, 'daily', CURRENT_DATE, daily_limit)
    ON CONFLICT (provider, period, period_start) DO NOTHING;

    INSERT INTO enrichment_credit_budgets (provider, period, period_start, budget_limit)
    VALUES (prov, 'monthly', date_trunc('month', CURRENT_DATE)::date, monthly_limit)
    ON CONFLICT (provider, period, period_start) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Re-initialize budgets with new PDL limits
SELECT reset_expired_credit_budgets();
