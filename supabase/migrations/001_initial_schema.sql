-- SalesEngine Phase 1 Schema
-- Run against Supabase via SQL Editor or supabase db push

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id text,
  name text NOT NULL,
  industry text,
  employee_count_range text,
  revenue_range text,
  website text,
  phone text,
  fax text,
  hq_address text,
  description text,
  linkedin_url text,
  enrichment_status text DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'partial', 'complete')),
  source text CHECK (source IN ('airtable_companies', 'airtable_local_companies', 'apollo', 'manual')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_companies_name ON companies (name);
CREATE INDEX idx_companies_enrichment_status ON companies (enrichment_status);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id text,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text,
  email text,
  email_verified boolean DEFAULT false,
  work_phone text,
  cell_phone text,
  linkedin_url text,
  bio text,
  headshot_url text,
  work_address text,
  home_address text,
  delivery_address text,
  notes text,
  relationship_notes text,
  is_current_client boolean DEFAULT false,
  is_out_of_industry boolean DEFAULT false,
  source text CHECK (source IN ('airtable_people', 'airtable_community_partners', 'apollo', 'proxycurl', 'manual')),
  enrichment_status text DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'partial', 'complete')),
  assigned_to text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_contacts_email ON contacts (email);
CREATE INDEX idx_contacts_company_id ON contacts (company_id);
CREATE INDEX idx_contacts_enrichment_status ON contacts (enrichment_status);
CREATE INDEX idx_contacts_source ON contacts (source);

-- ============================================================
-- PROPERTIES (CRE-specific)
-- ============================================================
CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id text,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  name text NOT NULL,
  address text,
  square_footage text,
  current_csf text,
  property_manager text,
  engineers text,
  lat decimal,
  lng decimal,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- VERTICALS
-- ============================================================
CREATE TABLE verticals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed verticals
INSERT INTO verticals (name, description) VALUES
  ('Commercial Real Estate', 'CRE clients and prospects in Austin area'),
  ('Defense Tech', 'Defense technology companies in Austin'),
  ('Manufacturing', 'Manufacturing companies in Austin area');

-- ============================================================
-- ICP PROFILES (scoring weights per vertical)
-- ============================================================
CREATE TABLE icp_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id uuid NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  name text,
  target_titles text[],
  target_company_sizes text[],
  target_geographies text[],
  target_industries text[],
  title_weight decimal DEFAULT 0.3,
  company_weight decimal DEFAULT 0.2,
  geo_weight decimal DEFAULT 0.25,
  industry_weight decimal DEFAULT 0.25,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CONTACT SCORES
-- ============================================================
CREATE TABLE contact_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  vertical_id uuid NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  fit_score decimal,
  confidence_score decimal,
  relevance_score decimal,
  composite_score decimal,
  score_details jsonb,
  scored_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, vertical_id)
);

CREATE INDEX idx_contact_scores_composite ON contact_scores (composite_score DESC);
CREATE INDEX idx_contact_scores_vertical ON contact_scores (vertical_id);

-- ============================================================
-- PIPELINE STAGES
-- ============================================================
CREATE TABLE pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id uuid NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL,
  color text
);

-- Seed pipeline stages for each vertical
INSERT INTO pipeline_stages (vertical_id, name, position, color)
SELECT v.id, s.name, s.position, s.color
FROM verticals v
CROSS JOIN (VALUES
  ('Discovered', 1, '#6B7280'),
  ('Enriched', 2, '#3B82F6'),
  ('Reviewed', 3, '#F59E0B'),
  ('Pursuing', 4, '#8B5CF6'),
  ('Engaged', 5, '#10B981')
) AS s(name, position, color);

-- ============================================================
-- CONTACT PIPELINE
-- ============================================================
CREATE TABLE contact_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  pipeline_stage_id uuid NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  vertical_id uuid NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  moved_at timestamptz DEFAULT now(),
  moved_by text,
  UNIQUE(contact_id, vertical_id)
);

-- ============================================================
-- ACTIVITIES
-- ============================================================
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id text,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('coffee', 'lunch', 'happy_hour', 'cold_call', 'email', 'meeting', 'event', 'other')),
  notes text,
  activity_date date,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ENRICHMENT LOGS
-- ============================================================
CREATE TABLE enrichment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('apollo', 'proxycurl', 'clearbit', 'zerobounce')),
  request_type text,
  request_payload jsonb,
  response_payload jsonb,
  status text CHECK (status IN ('success', 'error', 'rate_limited')),
  credits_used int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_enrichment_logs_contact ON enrichment_logs (contact_id);
CREATE INDEX idx_enrichment_logs_company ON enrichment_logs (company_id);
CREATE INDEX idx_enrichment_logs_provider ON enrichment_logs (provider);

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text
);

CREATE TABLE contact_tags (
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- ============================================================
-- SUPPRESSION LIST
-- ============================================================
CREATE TABLE suppression_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CONTACT RELATIONSHIPS
-- ============================================================
CREATE TABLE contact_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  related_contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  relationship_type text CHECK (relationship_type IN ('assistant', 'boss', 'colleague'))
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
