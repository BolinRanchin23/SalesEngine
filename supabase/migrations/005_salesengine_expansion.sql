-- Phase 5: SalesEngine Expansion
-- Deep enrichment fields, opportunity pipeline, touch point programs,
-- enrichment field config, property tenants

-- ============================================================
-- 1. New enrichment columns on contacts
-- ============================================================
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS social_profiles JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS personal_emails TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS inferred_salary TEXT,
  ADD COLUMN IF NOT EXISTS inferred_years_experience INT,
  ADD COLUMN IF NOT EXISTS followers INT,
  ADD COLUMN IF NOT EXISTS connections INT,
  ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS volunteer_experience JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS publications JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS honors_and_awards JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS web_research JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS enrichment_depth TEXT DEFAULT 'standard';

ALTER TABLE contacts
  ADD CONSTRAINT contacts_enrichment_depth_check
  CHECK (enrichment_depth IN ('quick', 'standard', 'deep'));

-- ============================================================
-- 2. Enrichment field config table
-- ============================================================
CREATE TABLE IF NOT EXISTS enrichment_field_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  provider_sources TEXT[] DEFAULT '{}',
  category TEXT,
  display_order INT
);

-- Seed enrichment field config
INSERT INTO enrichment_field_config (field_name, display_name, provider_sources, category, display_order) VALUES
  ('email', 'Email', '{apollo,pdl}', 'contact', 1),
  ('email_status', 'Email Status', '{zerobounce,apollo}', 'contact', 2),
  ('title', 'Title', '{apollo,pdl,brightdata}', 'contact', 3),
  ('headline', 'Headline', '{brightdata,pdl,apollo}', 'professional', 4),
  ('linkedin_url', 'LinkedIn URL', '{pdl,apollo,brightdata}', 'contact', 5),
  ('headshot_url', 'Headshot', '{brightdata,pdl,apollo}', 'contact', 6),
  ('bio', 'Bio', '{pdl,brightdata}', 'professional', 7),
  ('work_phone', 'Work Phone', '{apollo}', 'contact', 8),
  ('cell_phone', 'Cell Phone', '{pdl,apollo}', 'contact', 9),
  ('work_address', 'Work Address', '{apollo,pdl,brightdata}', 'contact', 10),
  ('seniority', 'Seniority', '{apollo,pdl}', 'professional', 11),
  ('department', 'Department', '{pdl}', 'professional', 12),
  ('work_history', 'Work History', '{pdl,brightdata}', 'history', 13),
  ('education', 'Education', '{pdl,brightdata}', 'history', 14),
  ('skills', 'Skills', '{pdl,brightdata}', 'professional', 15),
  ('certifications', 'Certifications', '{pdl,brightdata}', 'professional', 16),
  ('languages', 'Languages', '{pdl,brightdata}', 'personal', 17),
  ('social_profiles', 'Social Profiles', '{pdl,apollo,brightdata}', 'contact', 18),
  ('personal_emails', 'Personal Emails', '{pdl,apollo}', 'contact', 19),
  ('interests', 'Interests', '{pdl}', 'personal', 20),
  ('inferred_salary', 'Inferred Salary', '{pdl}', 'professional', 21),
  ('inferred_years_experience', 'Years Experience', '{pdl}', 'professional', 22),
  ('followers', 'LinkedIn Followers', '{brightdata}', 'social', 23),
  ('connections', 'LinkedIn Connections', '{brightdata}', 'social', 24),
  ('recommendations', 'Recommendations', '{brightdata}', 'social', 25),
  ('volunteer_experience', 'Volunteer Experience', '{brightdata}', 'personal', 26),
  ('publications', 'Publications', '{brightdata}', 'achievements', 27),
  ('honors_and_awards', 'Honors & Awards', '{brightdata}', 'achievements', 28),
  ('projects', 'Projects', '{brightdata}', 'achievements', 29),
  ('web_research', 'Web Research', '{websearch}', 'research', 30)
ON CONFLICT (field_name) DO NOTHING;

-- ============================================================
-- 3. Update provider CHECK constraints to include websearch
-- ============================================================
ALTER TABLE enrichment_queue DROP CONSTRAINT IF EXISTS enrichment_queue_provider_check;
ALTER TABLE enrichment_credit_budgets DROP CONSTRAINT IF EXISTS enrichment_credit_budgets_provider_check;
ALTER TABLE enrichment_logs DROP CONSTRAINT IF EXISTS enrichment_logs_provider_check;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_source_check;

ALTER TABLE enrichment_queue
  ADD CONSTRAINT enrichment_queue_provider_check
  CHECK (provider IN ('apollo', 'pdl', 'zerobounce', 'brightdata', 'websearch'));

ALTER TABLE enrichment_credit_budgets
  ADD CONSTRAINT enrichment_credit_budgets_provider_check
  CHECK (provider IN ('apollo', 'pdl', 'zerobounce', 'brightdata', 'websearch'));

ALTER TABLE enrichment_logs
  ADD CONSTRAINT enrichment_logs_provider_check
  CHECK (provider IN ('apollo', 'proxycurl', 'clearbit', 'zerobounce', 'pdl', 'brightdata', 'websearch'));

ALTER TABLE contacts
  ADD CONSTRAINT contacts_source_check
  CHECK (source IN ('airtable_people', 'airtable_community_partners', 'apollo', 'pdl', 'brightdata', 'websearch', 'manual'));

-- ============================================================
-- 4. Opportunity pipeline tables
-- ============================================================
CREATE TABLE IF NOT EXISTS opportunity_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INT NOT NULL,
  color TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO opportunity_stages (name, position, color) VALUES
  ('Prospect', 1, '#6B7280'),
  ('Site Visit', 2, '#3B82F6'),
  ('Bid', 3, '#F59E0B'),
  ('Awarded', 4, '#8B5CF6'),
  ('Active', 5, '#10B981')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  stage_id UUID NOT NULL REFERENCES opportunity_stages(id),
  estimated_cleanable_sqft TEXT,
  possible_cleanable_sqft TEXT,
  estimated_value DECIMAL,
  close_date DATE,
  next_steps TEXT,
  notes TEXT,
  probability INT DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  lost_reason TEXT,
  won_date DATE,
  lost_date DATE,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunity_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(opportunity_id, contact_id)
);

CREATE TABLE IF NOT EXISTS opportunity_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('stage_change', 'note', 'site_visit', 'bid_submitted', 'bid_revised', 'call', 'email', 'meeting', 'other')),
  description TEXT,
  old_stage_id UUID REFERENCES opportunity_stages(id),
  new_stage_id UUID REFERENCES opportunity_stages(id),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. Property tenants table
-- ============================================================
CREATE TABLE IF NOT EXISTS property_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  floor_suite TEXT,
  occupied_sqft TEXT,
  lease_start DATE,
  lease_end DATE,
  is_primary_tenant BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, company_id)
);

-- ============================================================
-- 6. Touch point programs tables
-- ============================================================
CREATE TABLE IF NOT EXISTS touch_point_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_cycling BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO touch_point_programs (name, description, is_cycling) VALUES
  ('High Contact', 'Frequent touch points for high-value prospects', true),
  ('Standard', 'Regular cadence for standard prospects', true),
  ('New Client Onboarding', 'Structured onboarding sequence for new clients', false)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS program_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES touch_point_programs(id) ON DELETE CASCADE,
  position INT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'coffee', 'lunch', 'site_visit', 'gift', 'other')),
  delay_days INT NOT NULL DEFAULT 7,
  label TEXT,
  UNIQUE(program_id, position)
);

-- Seed: High Contact steps
INSERT INTO program_steps (program_id, position, activity_type, delay_days, label)
SELECT p.id, s.position, s.activity_type, s.delay_days, s.label
FROM touch_point_programs p,
(VALUES
  (1, 'email', 7, 'Initial Email'),
  (2, 'call', 14, 'Follow-up Call'),
  (3, 'coffee', 21, 'Coffee Meeting'),
  (4, 'email', 21, 'Check-in Email')
) AS s(position, activity_type, delay_days, label)
WHERE p.name = 'High Contact'
ON CONFLICT DO NOTHING;

-- Seed: Standard steps
INSERT INTO program_steps (program_id, position, activity_type, delay_days, label)
SELECT p.id, s.position, s.activity_type, s.delay_days, s.label
FROM touch_point_programs p,
(VALUES
  (1, 'email', 30, 'Monthly Email'),
  (2, 'call', 30, 'Monthly Call'),
  (3, 'lunch', 60, 'Quarterly Lunch')
) AS s(position, activity_type, delay_days, label)
WHERE p.name = 'Standard'
ON CONFLICT DO NOTHING;

-- Seed: New Client Onboarding steps
INSERT INTO program_steps (program_id, position, activity_type, delay_days, label)
SELECT p.id, s.position, s.activity_type, s.delay_days, s.label
FROM touch_point_programs p,
(VALUES
  (1, 'meeting', 0, 'Kickoff Meeting'),
  (2, 'email', 7, 'Welcome Email'),
  (3, 'call', 7, 'Check-in Call'),
  (4, 'coffee', 14, 'Coffee Meet'),
  (5, 'email', 14, 'Progress Update'),
  (6, 'lunch', 14, 'Relationship Lunch'),
  (7, 'meeting', 28, 'Review Meeting')
) AS s(position, activity_type, delay_days, label)
WHERE p.name = 'New Client Onboarding'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS contact_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES touch_point_programs(id) ON DELETE CASCADE,
  current_step_position INT DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT now(),
  paused_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(contact_id, program_id)
);

CREATE TABLE IF NOT EXISTS touch_point_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  contact_program_id UUID NOT NULL REFERENCES contact_programs(id) ON DELETE CASCADE,
  program_step_id UUID NOT NULL REFERENCES program_steps(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  activity_id UUID REFERENCES activities(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. Update budget function with websearch
-- ============================================================
CREATE OR REPLACE FUNCTION reset_expired_credit_budgets()
RETURNS void AS $$
DECLARE
  prov TEXT;
  daily_limit INTEGER;
  monthly_limit INTEGER;
BEGIN
  FOR prov, daily_limit, monthly_limit IN
    VALUES ('apollo', 100, 2000), ('pdl', 50, 350), ('zerobounce', 200, 5000), ('brightdata', 100, 1000), ('websearch', 50, 500)
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

-- Initialize websearch budget rows
SELECT reset_expired_credit_budgets();

-- ============================================================
-- 8. Indexes for new tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_opportunities_stage_id ON opportunities(stage_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_property_id ON opportunities(property_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_primary_contact_id ON opportunities(primary_contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_contacts_opportunity_id ON opportunity_contacts(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_contacts_contact_id ON opportunity_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_activities_opportunity_id ON opportunity_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_property_tenants_property_id ON property_tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_property_tenants_company_id ON property_tenants(company_id);
CREATE INDEX IF NOT EXISTS idx_contact_programs_contact_id ON contact_programs(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_programs_program_id ON contact_programs(program_id);
CREATE INDEX IF NOT EXISTS idx_touch_point_tasks_contact_id ON touch_point_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_touch_point_tasks_contact_program_id ON touch_point_tasks(contact_program_id);
CREATE INDEX IF NOT EXISTS idx_touch_point_tasks_status ON touch_point_tasks(status);
CREATE INDEX IF NOT EXISTS idx_touch_point_tasks_due_date ON touch_point_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_program_steps_program_id ON program_steps(program_id);
