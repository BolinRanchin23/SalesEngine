-- Phase 4: Add Bright Data as PDL fallback provider
-- Bright Data LinkedIn Profile Scraper provides headshots + enrichment
-- when PDL credits are exhausted. Requires LinkedIn URL on contact.

-- ============================================================
-- 1. Drop existing CHECK constraints
-- ============================================================
ALTER TABLE enrichment_queue DROP CONSTRAINT IF EXISTS enrichment_queue_provider_check;
ALTER TABLE enrichment_credit_budgets DROP CONSTRAINT IF EXISTS enrichment_credit_budgets_provider_check;
ALTER TABLE enrichment_logs DROP CONSTRAINT IF EXISTS enrichment_logs_provider_check;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_source_check;

-- ============================================================
-- 2. Recreate CHECK constraints with 'brightdata' included
-- ============================================================
ALTER TABLE enrichment_queue
  ADD CONSTRAINT enrichment_queue_provider_check
  CHECK (provider IN ('apollo', 'pdl', 'zerobounce', 'brightdata'));

ALTER TABLE enrichment_credit_budgets
  ADD CONSTRAINT enrichment_credit_budgets_provider_check
  CHECK (provider IN ('apollo', 'pdl', 'zerobounce', 'brightdata'));

ALTER TABLE enrichment_logs
  ADD CONSTRAINT enrichment_logs_provider_check
  CHECK (provider IN ('apollo', 'proxycurl', 'clearbit', 'zerobounce', 'pdl', 'brightdata'));

ALTER TABLE contacts
  ADD CONSTRAINT contacts_source_check
  CHECK (source IN ('airtable_people', 'airtable_community_partners', 'apollo', 'pdl', 'brightdata', 'manual'));

-- ============================================================
-- 3. Update reset_expired_credit_budgets() with Bright Data budgets
-- ============================================================
CREATE OR REPLACE FUNCTION reset_expired_credit_budgets()
RETURNS void AS $$
DECLARE
  prov TEXT;
  daily_limit INTEGER;
  monthly_limit INTEGER;
BEGIN
  FOR prov, daily_limit, monthly_limit IN
    VALUES ('apollo', 100, 2000), ('pdl', 50, 350), ('zerobounce', 200, 5000), ('brightdata', 100, 1000)
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

-- ============================================================
-- 4. Initialize Bright Data budget rows
-- ============================================================
SELECT reset_expired_credit_budgets();
