# SalesEngine Phase 2: Enrichment Engine Implementation Plan

**Date:** 2026-02-25
**Status:** Planning
**Stack:** Next.js 16 + Supabase + Tailwind CSS 4

---

## Table of Contents

1. [API Research & Reference](#1-api-research--reference)
   - [Apollo.io API](#11-apolloio-api)
   - [ProxyCurl API](#12-proxycurl-api)
   - [ZeroBounce API](#13-zerobounce-api)
2. [Database Schema Changes](#2-database-schema-changes)
3. [Enrichment Architecture](#3-enrichment-architecture)
   - [Queue System](#31-queue-based-enrichment-system)
   - [Credit Budget Tracking](#32-credit-budget-tracking)
   - [Deduplication](#33-deduplication-logic)
   - [Data Merge Strategy](#34-data-merge-strategy)
4. [API Route Design](#4-api-route-design)
5. [Provider Service Implementations](#5-provider-service-implementations)
6. [UI Components](#6-ui-components)
7. [Environment Variables](#7-environment-variables)
8. [Migration & Rollout Plan](#8-migration--rollout-plan)

---

## 1. API Research & Reference

### 1.1 Apollo.io API

**Base URL:** `https://api.apollo.io`
**Authentication:** API key passed as `x-api-key` header (or `api_key` in the request body for legacy endpoints). API keys are generated in Settings > Integrations > API Keys.

#### 1.1.1 People Enrichment

**Endpoint:** `POST /api/v1/people/match`

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "organization_name": "Acme Corp",
  "email": "john@acme.com",
  "linkedin_url": "https://www.linkedin.com/in/johndoe",
  "domain": "acme.com"
}
```

At minimum, provide `email` or `linkedin_url` or (`first_name` + `last_name` + `organization_name`/`domain`). More parameters yield better match confidence.

**Key Response Fields:**
```json
{
  "person": {
    "id": "apollo_person_id",
    "first_name": "John",
    "last_name": "Doe",
    "name": "John Doe",
    "title": "VP of Sales",
    "headline": "VP of Sales at Acme Corp",
    "linkedin_url": "https://www.linkedin.com/in/johndoe",
    "email": "john@acme.com",
    "email_status": "verified",
    "photo_url": "https://...",
    "city": "Austin",
    "state": "Texas",
    "country": "United States",
    "organization_id": "apollo_org_id",
    "organization": {
      "name": "Acme Corp",
      "website_url": "https://acme.com",
      "industry": "Commercial Real Estate",
      "estimated_num_employees": 250,
      "annual_revenue": 50000000,
      "phone": "+1-512-555-0100",
      "linkedin_url": "https://www.linkedin.com/company/acme-corp"
    },
    "phone_numbers": [
      { "raw_number": "+15125550101", "type": "work_direct" },
      { "raw_number": "+15125550102", "type": "mobile" }
    ],
    "employment_history": [
      {
        "organization_name": "Previous Corp",
        "title": "Director of Sales",
        "start_date": "2018-01-01",
        "end_date": "2022-06-01",
        "current": false
      }
    ],
    "seniority": "vp",
    "departments": ["sales"],
    "subdepartments": ["sales_management"],
    "functions": ["sales"]
  }
}
```

**Unique Data from Apollo (not available elsewhere):**
- `email_status` (verified/unverified/guessed/unavailable)
- `seniority` level classification
- `departments` and `subdepartments` taxonomy
- Employment history with dates
- Organization revenue and employee count estimates
- Direct dial phone numbers

#### 1.1.2 Company Enrichment

**Endpoint:** `POST /api/v1/organizations/enrich`

**Request:**
```json
{
  "domain": "acme.com"
}
```
Can also match by `organization_name`.

**Key Response Fields:**
```json
{
  "organization": {
    "id": "apollo_org_id",
    "name": "Acme Corp",
    "website_url": "https://acme.com",
    "linkedin_url": "https://www.linkedin.com/company/acme-corp",
    "twitter_url": "https://twitter.com/acmecorp",
    "facebook_url": "https://facebook.com/acmecorp",
    "phone": "+1-512-555-0100",
    "founded_year": 2005,
    "industry": "Commercial Real Estate",
    "keywords": ["real estate", "property management"],
    "estimated_num_employees": 250,
    "annual_revenue": 50000000,
    "annual_revenue_printed": "$50M",
    "total_funding": null,
    "total_funding_printed": null,
    "technologies": ["Salesforce", "HubSpot"],
    "city": "Austin",
    "state": "Texas",
    "country": "United States",
    "street_address": "123 Main St",
    "postal_code": "78701",
    "raw_address": "123 Main St, Austin, TX 78701",
    "seo_description": "...",
    "short_description": "...",
    "logo_url": "https://..."
  }
}
```

#### 1.1.3 Email Finder

**Endpoint:** `POST /api/v1/people/match` (same endpoint, but without email provided)

Apollo will attempt to find/guess an email when you provide `first_name`, `last_name`, and `domain`/`organization_name`. The `email_status` field indicates confidence:
- `verified` -- confirmed deliverable
- `guessed` -- algorithmically generated, not confirmed
- `unavailable` -- no email found

For bulk email finding, there is also:
**Endpoint:** `POST /api/v1/people/bulk_match`
```json
{
  "details": [
    { "first_name": "John", "last_name": "Doe", "domain": "acme.com" },
    { "first_name": "Jane", "last_name": "Smith", "domain": "acme.com" }
  ]
}
```
Returns an array of matched people. Max 10 records per request.

#### 1.1.4 Pricing & Credits

| Plan       | Credits/month | Cost/month |
|------------|---------------|------------|
| Free       | 10,000        | $0         |
| Basic      | 60,000        | $49        |
| Professional | 120,000     | $79        |
| Organization | 250,000     | $99        |

**Credit costs per operation:**
- People enrichment (match): **1 credit** per person matched
- Organization enrichment: **1 credit** per company
- Email finding: included in people match (1 credit)
- Phone number reveal: **1 additional credit** if requesting mobile/direct phone
- Bulk match: **1 credit per matched person** in the batch

**Important:** Credits are only consumed when a match is found. No-match responses are free.

#### 1.1.5 Rate Limits

- **Standard:** 100 requests/minute per API key (headers: `x-rate-limit-*`)
- **Bulk endpoints:** 5 requests/minute (each containing up to 10 records)
- On rate limit: HTTP 429 with `Retry-After` header
- Recommended: implement exponential backoff with jitter

---

### 1.2 ProxyCurl API

**Base URL:** `https://nubela.co/proxycurl/api`
**Authentication:** Bearer token in `Authorization: Bearer {api_key}` header. API key is generated in the ProxyCurl dashboard.

#### 1.2.1 Person Profile Enrichment

**Endpoint:** `GET /v2/linkedin`

**Request (query params):**
```
GET /v2/linkedin?linkedin_profile_url=https://www.linkedin.com/in/johndoe
    &use_cache=if-present
    &fallback_to_cache=on-error
    &skills=include
    &inferred_salary=include
    &personal_email=include
    &personal_contact_number=include
    &extra=include
```

**Key Response Fields:**
```json
{
  "public_identifier": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "headline": "VP of Sales at Acme Corp",
  "summary": "Experienced sales leader with 15 years...",
  "city": "Austin",
  "state": "Texas",
  "country_full_name": "United States",
  "profile_pic_url": "https://...",
  "background_cover_image_url": "https://...",
  "occupation": "VP of Sales at Acme Corp",
  "connections": 500,
  "follower_count": 1200,
  "experiences": [
    {
      "starts_at": { "day": 1, "month": 3, "year": 2022 },
      "ends_at": null,
      "company": "Acme Corp",
      "company_linkedin_profile_url": "https://www.linkedin.com/company/acme-corp",
      "title": "VP of Sales",
      "description": "Leading a team of 20...",
      "location": "Austin, TX"
    }
  ],
  "education": [
    {
      "starts_at": { "day": 1, "month": 9, "year": 2002 },
      "ends_at": { "day": 1, "month": 5, "year": 2006 },
      "field_of_study": "Business Administration",
      "degree_name": "Bachelor's",
      "school": "University of Texas at Austin",
      "school_linkedin_profile_url": "https://..."
    }
  ],
  "languages": ["English", "Spanish"],
  "certifications": [],
  "volunteer_work": [],
  "skills": ["Sales Management", "CRM", "B2B Sales"],
  "personal_emails": ["john.doe@gmail.com"],
  "personal_numbers": ["+15125550103"],
  "gender": "male",
  "birth_date": null,
  "industry": "Commercial Real Estate",
  "interests": [],
  "inferred_salary": { "min": 150000, "max": 200000 },
  "extra": {
    "github_profile_id": null,
    "twitter_profile_id": "johndoe_sales",
    "facebook_profile_id": null
  }
}
```

**Unique Data from ProxyCurl (not in Apollo):**
- Full LinkedIn `summary`/bio text
- `education` history with schools and degrees
- `skills` list (LinkedIn skills)
- `languages`
- `certifications` and `volunteer_work`
- `connections` count and `follower_count`
- `inferred_salary` range
- `personal_emails` (non-work emails)
- `personal_numbers` (personal phone)
- Social profiles (GitHub, Twitter, Facebook)
- Profile/background images directly from LinkedIn

#### 1.2.2 Company Profile Enrichment

**Endpoint:** `GET /api/linkedin/company`

**Request (query params):**
```
GET /api/linkedin/company?url=https://www.linkedin.com/company/acme-corp
```

**Key Response Fields:**
```json
{
  "name": "Acme Corp",
  "description": "Leading commercial real estate...",
  "website": "https://acme.com",
  "industry": "Commercial Real Estate",
  "company_size": [201, 500],
  "company_size_on_linkedin": 350,
  "hq": {
    "city": "Austin",
    "state": "Texas",
    "country": "US",
    "postal_code": "78701",
    "line_1": "123 Main St"
  },
  "company_type": "PRIVATELY_HELD",
  "founded_year": 2005,
  "specialities": ["Property Management", "Commercial Leasing"],
  "locations": [],
  "follower_count": 5000,
  "tagline": "Your trusted CRE partner",
  "universal_name_id": "acme-corp",
  "profile_pic_url": "https://...",
  "background_cover_image_url": "https://...",
  "funding_data": [],
  "categories": [],
  "extra": {
    "twitter_profile_url": "https://twitter.com/acmecorp",
    "facebook_profile_url": "https://facebook.com/acmecorp",
    "crunchbase_profile_url": null,
    "yelp_profile_url": null
  }
}
```

#### 1.2.3 Reverse Email Lookup

**Endpoint:** `GET /api/linkedin/profile/resolve/email`

```
GET /api/linkedin/profile/resolve/email?work_email=john@acme.com
    &lookup_depth=deep
```

Returns the LinkedIn profile URL for a given email. Useful for finding LinkedIn URLs for contacts where we only have email. Costs 3 credits for `deep` lookup, 1 credit for `shallow`.

#### 1.2.4 Pricing & Credits

ProxyCurl uses a credit-based system with prepaid credit packs:

| Credit Pack | Credits | Cost     | Per Credit |
|-------------|---------|----------|------------|
| Starter     | 100     | $15      | $0.15      |
| Growth      | 500     | $60      | $0.12      |
| Business    | 2,000   | $200     | $0.10      |
| Enterprise  | 10,000  | $800     | $0.08      |

**Credit costs per operation:**
- Person profile lookup: **1 credit**
- Person profile with `personal_email`: **+1 credit**
- Person profile with `personal_contact_number`: **+1 credit**
- Person profile with `skills`: **included (no extra cost)**
- Person profile with `inferred_salary`: **+1 credit**
- Company profile lookup: **1 credit**
- Reverse email lookup (shallow): **1 credit**
- Reverse email lookup (deep): **3 credits**

Typical per-contact cost with all extras: **3-4 credits ($0.24-$0.60 depending on plan)**

#### 1.2.5 Rate Limits

- **Standard:** 300 requests/minute
- **Burst:** 10 concurrent requests
- On rate limit: HTTP 429, retry after 1 second
- Recommended: keep concurrent requests at or below 5 for reliability
- `use_cache=if-present` reduces cost and latency -- always use it

---

### 1.3 ZeroBounce API

**Base URL:** `https://api.zerobounce.net/v2`
**Authentication:** API key passed as `api_key` query parameter. Key is generated in the ZeroBounce dashboard.

#### 1.3.1 Single Email Verification

**Endpoint:** `GET /v2/validate`

**Request (query params):**
```
GET /v2/validate?api_key=YOUR_KEY&email=john@acme.com&ip_address=
```

The `ip_address` parameter is optional (pass empty string if unknown). When provided, it adds geolocation data to the response.

**Response:**
```json
{
  "address": "john@acme.com",
  "status": "valid",
  "sub_status": "",
  "free_email": false,
  "did_you_mean": null,
  "account": "john",
  "domain": "acme.com",
  "domain_age_days": "5432",
  "smtp_provider": "google",
  "mx_found": "true",
  "mx_record": "aspmx.l.google.com",
  "firstname": "John",
  "lastname": "Doe",
  "gender": "male",
  "country": "United States",
  "region": "Texas",
  "city": "Austin",
  "zipcode": "78701",
  "processed_at": "2026-02-25 10:30:00"
}
```

**Status Values:**

| Status         | Meaning                                                       | Action                     |
|----------------|---------------------------------------------------------------|----------------------------|
| `valid`        | Email is deliverable                                          | Safe to send               |
| `invalid`      | Email is not deliverable                                      | Remove / do not send       |
| `catch-all`    | Domain accepts all emails (can't verify specific mailbox)     | Send with caution          |
| `spamtrap`     | Known spam trap address                                       | Remove immediately         |
| `abuse`        | Known complaint address                                       | Remove / suppress          |
| `do_not_mail`  | Disposable, toxic, or role-based (info@, admin@)              | Do not send                |
| `unknown`      | Could not determine status (timeout, etc.)                    | Retry later                |

**Sub-status Values (selected):**
- `alias_address` -- email is an alias/forwarded
- `role_based` -- generic role address (info@, sales@)
- `disposable` -- throwaway email service
- `toxic` -- known complainer/litigator
- `mailbox_not_found` -- specific mailbox does not exist
- `mail_server_temporary_error` -- try again later
- `possible_typo` -- with suggestion in `did_you_mean`

#### 1.3.2 Batch Email Verification

**Endpoint:** `POST /v2/sendfile`

Upload a CSV file for batch processing.

**Request:**
```
POST /v2/sendfile
Content-Type: multipart/form-data

- api_key: YOUR_KEY
- file: (CSV file with emails)
- email_address_column: 1 (1-indexed column number)
- has_header_row: true
- return_url: https://yourapp.com/api/webhooks/zerobounce (optional callback)
```

**Check batch status:**
```
GET /v2/filestatus?api_key=YOUR_KEY&file_id=FILE_ID_FROM_UPLOAD
```

Response:
```json
{
  "success": true,
  "file_id": "abc-123",
  "file_name": "emails.csv",
  "upload_date": "2026-02-25",
  "file_status": "Complete",
  "complete_percentage": "100%",
  "return_url": null
}
```

`file_status` values: `Queued`, `Processing`, `Complete`

**Download results:**
```
GET /v2/getfile?api_key=YOUR_KEY&file_id=FILE_ID
```

Returns a CSV with the original data plus validation columns appended.

#### 1.3.3 Batch Validation (JSON-based, Inline)

**Endpoint:** `POST /v2/validatebatch`

For smaller batches (up to ~50 emails) without file upload:

**Request:**
```json
{
  "api_key": "YOUR_KEY",
  "email_batch": [
    { "email_address": "john@acme.com", "ip_address": "" },
    { "email_address": "jane@acme.com", "ip_address": "" }
  ]
}
```

**Response:**
```json
{
  "email_batch": [
    {
      "address": "john@acme.com",
      "status": "valid",
      "sub_status": "",
      "free_email": false,
      ...
    },
    {
      "address": "jane@acme.com",
      "status": "valid",
      "sub_status": "",
      "free_email": false,
      ...
    }
  ],
  "errors": []
}
```

#### 1.3.4 Credits Check

**Endpoint:** `GET /v2/getcredits?api_key=YOUR_KEY`

Returns: `{ "Credits": "2500" }`

Use this to check remaining credits before running batch jobs.

#### 1.3.5 Pricing

| Plan       | Credits/month | Cost/month | Per Email   |
|------------|---------------|------------|-------------|
| Free       | 100           | $0         | $0.00       |
| Starter    | 2,000         | $16        | $0.008      |
| Growth     | 5,000         | $35        | $0.007      |
| Business   | 10,000        | $65        | $0.0065     |
| Enterprise | 100,000+      | Custom     | ~$0.004     |

**Credit costs per operation:**
- Single validation: **1 credit**
- Batch validation: **1 credit per email**
- AI Scoring (optional add-on): **1 additional credit**

Credits roll over month-to-month on paid plans. Batch file processing has a 100,000 email maximum per file.

#### 1.3.6 Rate Limits

- **Single validation:** No strict per-minute limit, but recommended max ~100/second
- **Batch validation (JSON):** Max 50 emails per request
- **File-based batch:** Asynchronous, no rate limit concern (just upload and poll)
- On error: HTTP 400 with error message in response body

---

## 2. Database Schema Changes

### 2.1 New Migration: `002_enrichment_engine.sql`

```sql
-- ============================================================
-- ENRICHMENT QUEUE
-- ============================================================
CREATE TABLE enrichment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('contact', 'company')),
  entity_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('apollo', 'proxycurl', 'zerobounce')),
  operation text NOT NULL CHECK (operation IN (
    'people_enrich', 'company_enrich', 'email_find', 'email_verify', 'linkedin_enrich', 'linkedin_resolve'
  )),
  priority int NOT NULL DEFAULT 50,  -- 1 = highest, 100 = lowest
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  last_error text,
  scheduled_after timestamptz DEFAULT now(),
  locked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_enrichment_queue_status ON enrichment_queue (status, priority, scheduled_after);
CREATE INDEX idx_enrichment_queue_entity ON enrichment_queue (entity_type, entity_id);
CREATE UNIQUE INDEX idx_enrichment_queue_dedup
  ON enrichment_queue (entity_type, entity_id, provider, operation)
  WHERE status IN ('pending', 'processing');

-- ============================================================
-- CREDIT BUDGETS
-- ============================================================
CREATE TABLE enrichment_credit_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('apollo', 'proxycurl', 'zerobounce')),
  period_type text NOT NULL CHECK (period_type IN ('daily', 'monthly')),
  max_credits int NOT NULL,
  current_credits_used int NOT NULL DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider, period_type, period_start)
);

CREATE INDEX idx_credit_budgets_provider ON enrichment_credit_budgets (provider, period_type, period_start);

-- ============================================================
-- ENRICHMENT CACHE (deduplication layer)
-- ============================================================
CREATE TABLE enrichment_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,  -- e.g., "apollo:people_enrich:email:john@acme.com"
  provider text NOT NULL,
  operation text NOT NULL,
  response_payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_enrichment_cache_key ON enrichment_cache (cache_key);
CREATE INDEX idx_enrichment_cache_expires ON enrichment_cache (expires_at);

-- ============================================================
-- DATA PROVENANCE (tracks which provider supplied which field)
-- ============================================================
CREATE TABLE enrichment_field_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('contact', 'company')),
  entity_id uuid NOT NULL,
  field_name text NOT NULL,
  provider text NOT NULL,
  value text,
  confidence text CHECK (confidence IN ('high', 'medium', 'low')),
  enriched_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id, field_name, provider)
);

CREATE INDEX idx_provenance_entity ON enrichment_field_provenance (entity_type, entity_id);

-- ============================================================
-- ADD email_status COLUMN TO CONTACTS
-- ============================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_status text
  CHECK (email_status IN ('valid', 'invalid', 'catch-all', 'spamtrap', 'abuse', 'do_not_mail', 'unknown', 'unverified'));

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_enriched_at timestamptz;

-- ============================================================
-- ADD ENRICHMENT COLUMNS TO COMPANIES
-- ============================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_enriched_at timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year int;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS annual_revenue bigint;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS technologies text[];
ALTER TABLE companies ADD COLUMN IF NOT EXISTS keywords text[];

-- ============================================================
-- HELPER FUNCTION: Reset daily credit budgets
-- ============================================================
CREATE OR REPLACE FUNCTION reset_expired_credit_budgets()
RETURNS void AS $$
BEGIN
  -- Create new daily budget rows if current day has no row
  INSERT INTO enrichment_credit_budgets (provider, period_type, max_credits, period_start, period_end)
  SELECT
    p.provider,
    'daily',
    CASE p.provider
      WHEN 'apollo' THEN 1000
      WHEN 'proxycurl' THEN 200
      WHEN 'zerobounce' THEN 500
    END,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 day'
  FROM (VALUES ('apollo'), ('proxycurl'), ('zerobounce')) AS p(provider)
  ON CONFLICT (provider, period_type, period_start) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 Updated TypeScript Types

Add to `src/types/database.ts`:

```typescript
export type EnrichmentQueueItem = {
  id: string;
  entity_type: 'contact' | 'company';
  entity_id: string;
  provider: 'apollo' | 'proxycurl' | 'zerobounce';
  operation: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  scheduled_after: string;
  locked_until: string | null;
  created_at: string;
  completed_at: string | null;
};

export type EnrichmentCreditBudget = {
  id: string;
  provider: 'apollo' | 'proxycurl' | 'zerobounce';
  period_type: 'daily' | 'monthly';
  max_credits: number;
  current_credits_used: number;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
};

export type EnrichmentCache = {
  id: string;
  cache_key: string;
  provider: string;
  operation: string;
  response_payload: Record<string, unknown>;
  expires_at: string;
  created_at: string;
};

export type EnrichmentFieldProvenance = {
  id: string;
  entity_type: 'contact' | 'company';
  entity_id: string;
  field_name: string;
  provider: string;
  value: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  enriched_at: string;
};
```

---

## 3. Enrichment Architecture

### 3.1 Queue-Based Enrichment System

#### 3.1.1 Priority Calculation

Contacts are prioritized for enrichment based on a composite priority score (lower = higher priority):

```typescript
// src/lib/enrichment/priority.ts

type PriorityFactors = {
  hasEmail: boolean;
  hasLinkedIn: boolean;
  hasCompany: boolean;
  compositeScore: number | null;  // from contact_scores
  enrichmentStatus: 'pending' | 'partial' | 'complete';
  isCurrentClient: boolean;
  pipelineStage: string | null;   // 'Pursuing' and 'Engaged' get higher priority
};

export function calculatePriority(factors: PriorityFactors): number {
  let priority = 50; // default middle priority

  // Contacts already in active pipeline stages get highest priority
  if (factors.pipelineStage === 'Pursuing') priority -= 20;
  if (factors.pipelineStage === 'Engaged') priority -= 15;
  if (factors.pipelineStage === 'Reviewed') priority -= 10;

  // Current clients get a boost
  if (factors.isCurrentClient) priority -= 10;

  // High ICP scores get priority
  if (factors.compositeScore && factors.compositeScore > 0.8) priority -= 15;
  else if (factors.compositeScore && factors.compositeScore > 0.6) priority -= 10;

  // Contacts with more identifiers are easier to enrich (higher success rate)
  if (factors.hasEmail && factors.hasLinkedIn) priority -= 5;

  // Partial enrichment means we already have some data, prioritize completing it
  if (factors.enrichmentStatus === 'partial') priority -= 5;

  return Math.max(1, Math.min(100, priority));
}
```

#### 3.1.2 Enrichment Pipeline Flow

The enrichment pipeline runs in a deterministic order per contact:

```
1. Apollo People Enrich (if email or name+company available)
       |
       v
2. ProxyCurl LinkedIn Enrich (if linkedin_url available, or use Apollo's linkedin_url)
       |
       v
3. ZeroBounce Email Verify (if email available from step 1 or already on record)
       |
       v
4. Merge & Update Contact Record
       |
       v
5. Apollo Company Enrich (if company domain available and company not recently enriched)
```

#### 3.1.3 Queue Processing

The queue processor runs as a Next.js API route triggered by a cron job (Vercel Cron or external). It processes items in batches.

```typescript
// src/lib/enrichment/queue-processor.ts

const BATCH_SIZE = 10;           // Process 10 queue items per invocation
const LOCK_DURATION_MS = 60000;  // 60 second lock per item
const MAX_RETRIES = 3;
const RETRY_DELAYS = [60, 300, 900]; // seconds: 1min, 5min, 15min

export async function processQueue() {
  // 1. Claim a batch of pending items using SELECT ... FOR UPDATE SKIP LOCKED
  // 2. For each item:
  //    a. Check credit budget -- skip if budget exhausted
  //    b. Check dedup cache -- skip if recently enriched
  //    c. Call provider API
  //    d. Log to enrichment_logs
  //    e. Update enrichment_cache
  //    f. Merge data into contact/company
  //    g. Update enrichment_field_provenance
  //    h. Decrement credit budget
  //    i. Mark queue item completed (or failed with retry)
}
```

**Queue claiming SQL (prevents double-processing):**
```sql
UPDATE enrichment_queue
SET status = 'processing',
    locked_until = NOW() + INTERVAL '60 seconds',
    attempts = attempts + 1
WHERE id IN (
  SELECT id FROM enrichment_queue
  WHERE status = 'pending'
    AND scheduled_after <= NOW()
    AND (locked_until IS NULL OR locked_until < NOW())
    AND attempts < max_attempts
  ORDER BY priority ASC, created_at ASC
  LIMIT 10
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

#### 3.1.4 Batch Sizes Per Provider

| Provider    | Batch Strategy                          | Max Concurrent |
|-------------|----------------------------------------|----------------|
| Apollo      | Individual requests, 10 per cron tick   | 5              |
| ProxyCurl   | Individual requests, 5 per cron tick    | 3              |
| ZeroBounce  | JSON batch endpoint, 50 per batch       | 1              |

#### 3.1.5 Cron Schedule

- **Primary queue processor:** Every 2 minutes during business hours (8am-8pm CT)
- **Off-hours:** Every 10 minutes
- **Budget reset:** Daily at midnight CT
- **Cache cleanup:** Daily at 3am CT (delete expired entries)

```json
// vercel.json cron configuration
{
  "crons": [
    {
      "path": "/api/enrichment/process-queue",
      "schedule": "*/2 8-20 * * 1-5"
    },
    {
      "path": "/api/enrichment/process-queue",
      "schedule": "*/10 0-7,21-23 * * *"
    },
    {
      "path": "/api/enrichment/reset-budgets",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/enrichment/cleanup-cache",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### 3.2 Credit Budget Tracking

#### 3.2.1 Budget Configuration

```typescript
// src/lib/enrichment/budget.ts

export const DEFAULT_BUDGETS = {
  apollo: {
    daily: 1000,     // credits per day
    monthly: 15000,  // credits per month
  },
  proxycurl: {
    daily: 200,
    monthly: 3000,
  },
  zerobounce: {
    daily: 500,
    monthly: 8000,
  },
} as const;
```

#### 3.2.2 Budget Check Before Each API Call

```typescript
export async function checkBudget(
  supabase: SupabaseClient,
  provider: 'apollo' | 'proxycurl' | 'zerobounce',
  creditsNeeded: number
): Promise<{ allowed: boolean; dailyRemaining: number; monthlyRemaining: number }> {
  // Check daily budget
  const { data: daily } = await supabase
    .from('enrichment_credit_budgets')
    .select('*')
    .eq('provider', provider)
    .eq('period_type', 'daily')
    .eq('period_start', new Date().toISOString().split('T')[0])
    .single();

  if (!daily) {
    // Budget row doesn't exist yet, create it
    await ensureBudgetExists(supabase, provider);
    return { allowed: true, dailyRemaining: DEFAULT_BUDGETS[provider].daily, monthlyRemaining: DEFAULT_BUDGETS[provider].monthly };
  }

  const dailyRemaining = daily.max_credits - daily.current_credits_used;

  // Check monthly budget
  const monthStart = new Date();
  monthStart.setDate(1);
  const { data: monthly } = await supabase
    .from('enrichment_credit_budgets')
    .select('*')
    .eq('provider', provider)
    .eq('period_type', 'monthly')
    .eq('period_start', monthStart.toISOString().split('T')[0])
    .single();

  const monthlyRemaining = monthly
    ? monthly.max_credits - monthly.current_credits_used
    : DEFAULT_BUDGETS[provider].monthly;

  return {
    allowed: dailyRemaining >= creditsNeeded && monthlyRemaining >= creditsNeeded,
    dailyRemaining,
    monthlyRemaining,
  };
}
```

#### 3.2.3 Budget Consumption (Atomic Update)

```typescript
export async function consumeCredits(
  supabase: SupabaseClient,
  provider: string,
  credits: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date();
  monthStart.setDate(1);

  // Atomic increment for daily budget
  await supabase.rpc('increment_credit_usage', {
    p_provider: provider,
    p_period_type: 'daily',
    p_period_start: today,
    p_credits: credits,
  });

  // Atomic increment for monthly budget
  await supabase.rpc('increment_credit_usage', {
    p_provider: provider,
    p_period_type: 'monthly',
    p_period_start: monthStart.toISOString().split('T')[0],
    p_credits: credits,
  });
}
```

**Supabase RPC function:**
```sql
CREATE OR REPLACE FUNCTION increment_credit_usage(
  p_provider text,
  p_period_type text,
  p_period_start date,
  p_credits int
)
RETURNS void AS $$
BEGIN
  UPDATE enrichment_credit_budgets
  SET current_credits_used = current_credits_used + p_credits,
      updated_at = now()
  WHERE provider = p_provider
    AND period_type = p_period_type
    AND period_start = p_period_start;
END;
$$ LANGUAGE plpgsql;
```

### 3.3 Deduplication Logic

#### 3.3.1 Cache Key Strategy

Each enrichment operation generates a deterministic cache key:

```typescript
// src/lib/enrichment/cache.ts

export function buildCacheKey(
  provider: string,
  operation: string,
  identifiers: Record<string, string>
): string {
  // Sort keys for deterministic ordering
  const sorted = Object.entries(identifiers)
    .filter(([, v]) => v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v.toLowerCase().trim()}`)
    .join('|');
  return `${provider}:${operation}:${sorted}`;
}

// Examples:
// "apollo:people_enrich:email:john@acme.com"
// "proxycurl:linkedin_enrich:linkedin_url:https://www.linkedin.com/in/johndoe"
// "zerobounce:email_verify:email:john@acme.com"
```

#### 3.3.2 Cache TTLs

| Provider    | Operation          | Cache TTL  |
|-------------|-------------------|------------|
| Apollo      | people_enrich      | 30 days    |
| Apollo      | company_enrich     | 60 days    |
| ProxyCurl   | linkedin_enrich    | 30 days    |
| ProxyCurl   | linkedin_resolve   | 90 days    |
| ZeroBounce  | email_verify       | 90 days    |

#### 3.3.3 Dedup Check Flow

```typescript
export async function checkCache(
  supabase: SupabaseClient,
  cacheKey: string
): Promise<{ hit: boolean; data: Record<string, unknown> | null }> {
  const { data } = await supabase
    .from('enrichment_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (data) {
    return { hit: true, data: data.response_payload };
  }
  return { hit: false, data: null };
}
```

#### 3.3.4 Queue-Level Dedup

The unique partial index on `enrichment_queue` prevents duplicate pending/processing entries:

```sql
CREATE UNIQUE INDEX idx_enrichment_queue_dedup
  ON enrichment_queue (entity_type, entity_id, provider, operation)
  WHERE status IN ('pending', 'processing');
```

This means if a contact already has a pending Apollo enrichment, attempting to insert another will fail gracefully (use `ON CONFLICT DO NOTHING`).

#### 3.3.5 Skip Recently Enriched Contacts

Before enqueuing, check the `last_enriched_at` timestamp:

```typescript
export function shouldEnrich(
  contact: Contact,
  provider: string,
  minDaysBetween: number = 30
): boolean {
  if (!contact.last_enriched_at) return true;
  const daysSinceEnrich = Math.floor(
    (Date.now() - new Date(contact.last_enriched_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceEnrich >= minDaysBetween;
}
```

### 3.4 Data Merge Strategy

#### 3.4.1 Provider Trust Hierarchy

When multiple providers return conflicting values for the same field, we use a provider trust hierarchy:

```typescript
// src/lib/enrichment/merge.ts

const PROVIDER_TRUST: Record<string, Record<string, number>> = {
  // Field name -> provider -> trust score (higher = more trusted)
  email: { apollo: 90, proxycurl: 60 },
  title: { apollo: 80, proxycurl: 85 },     // ProxyCurl is more current (direct from LinkedIn)
  linkedin_url: { proxycurl: 95, apollo: 70 },
  bio: { proxycurl: 95, apollo: 40 },        // ProxyCurl gets full LinkedIn summary
  headshot_url: { proxycurl: 90, apollo: 70 },
  work_phone: { apollo: 90, proxycurl: 50 },
  cell_phone: { proxycurl: 80, apollo: 70 },
  work_address: { apollo: 80, proxycurl: 60 },

  // Company fields
  industry: { apollo: 85, proxycurl: 75 },
  employee_count_range: { apollo: 80, proxycurl: 70 },
  revenue_range: { apollo: 90, proxycurl: 30 },   // Apollo has better revenue data
  website: { apollo: 85, proxycurl: 80 },
  description: { proxycurl: 85, apollo: 75 },
};
```

#### 3.4.2 Merge Rules

```typescript
type MergeRule = 'trust_hierarchy' | 'prefer_non_empty' | 'prefer_newest' | 'append';

const FIELD_MERGE_RULES: Record<string, MergeRule> = {
  // Contact fields
  email: 'trust_hierarchy',
  title: 'trust_hierarchy',
  linkedin_url: 'trust_hierarchy',
  bio: 'trust_hierarchy',
  headshot_url: 'prefer_non_empty',
  work_phone: 'trust_hierarchy',
  cell_phone: 'trust_hierarchy',
  work_address: 'prefer_non_empty',
  home_address: 'prefer_non_empty',

  // Company fields
  industry: 'trust_hierarchy',
  employee_count_range: 'trust_hierarchy',
  revenue_range: 'trust_hierarchy',
  website: 'trust_hierarchy',
  description: 'trust_hierarchy',
  technologies: 'append',  // array fields: merge unique values
  keywords: 'append',
};
```

#### 3.4.3 Merge Algorithm

```typescript
export function mergeField(
  fieldName: string,
  currentValue: string | null,
  newValue: string | null,
  newProvider: string,
  existingProvenance: EnrichmentFieldProvenance | null
): { value: string | null; shouldUpdate: boolean } {
  // Rule 1: Never overwrite manually entered data
  if (existingProvenance?.provider === 'manual') {
    return { value: currentValue, shouldUpdate: false };
  }

  // Rule 2: If current value is null/empty, always accept new value
  if (!currentValue && newValue) {
    return { value: newValue, shouldUpdate: true };
  }

  // Rule 3: If new value is null/empty, keep current
  if (!newValue) {
    return { value: currentValue, shouldUpdate: false };
  }

  // Rule 4: Apply merge rule
  const rule = FIELD_MERGE_RULES[fieldName] || 'prefer_non_empty';

  switch (rule) {
    case 'trust_hierarchy': {
      const trustScores = PROVIDER_TRUST[fieldName] || {};
      const newTrust = trustScores[newProvider] || 50;
      const existingTrust = existingProvenance
        ? (trustScores[existingProvenance.provider] || 50)
        : 0;
      return {
        value: newTrust >= existingTrust ? newValue : currentValue,
        shouldUpdate: newTrust >= existingTrust,
      };
    }
    case 'prefer_non_empty':
      return { value: currentValue || newValue, shouldUpdate: !currentValue };
    case 'prefer_newest':
      return { value: newValue, shouldUpdate: true };
    case 'append':
      // For array fields stored as text[]
      return { value: newValue, shouldUpdate: true };
    default:
      return { value: currentValue, shouldUpdate: false };
  }
}
```

#### 3.4.4 Full Contact Merge Orchestration

```typescript
export async function mergeEnrichmentData(
  supabase: SupabaseClient,
  contactId: string,
  provider: string,
  enrichedData: Partial<Contact>
): Promise<void> {
  // 1. Fetch current contact
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  // 2. Fetch existing provenance for this contact
  const { data: provenance } = await supabase
    .from('enrichment_field_provenance')
    .select('*')
    .eq('entity_type', 'contact')
    .eq('entity_id', contactId);

  const provenanceMap = new Map(
    (provenance || []).map(p => [p.field_name, p])
  );

  // 3. Merge each field
  const updates: Record<string, unknown> = {};
  const provenanceUpserts: Array<Partial<EnrichmentFieldProvenance>> = [];

  for (const [field, newValue] of Object.entries(enrichedData)) {
    if (newValue === undefined) continue;

    const result = mergeField(
      field,
      (contact as any)?.[field] ?? null,
      String(newValue),
      provider,
      provenanceMap.get(field) || null
    );

    if (result.shouldUpdate) {
      updates[field] = result.value;
      provenanceUpserts.push({
        entity_type: 'contact',
        entity_id: contactId,
        field_name: field,
        provider,
        value: String(result.value),
        confidence: 'high',
      });
    }
  }

  // 4. Update contact
  if (Object.keys(updates).length > 0) {
    updates.last_enriched_at = new Date().toISOString();
    updates.enrichment_status = determineEnrichmentStatus(contact, updates);

    await supabase.from('contacts').update(updates).eq('id', contactId);
  }

  // 5. Upsert provenance records
  for (const p of provenanceUpserts) {
    await supabase.from('enrichment_field_provenance').upsert(p, {
      onConflict: 'entity_type,entity_id,field_name,provider',
    });
  }
}

function determineEnrichmentStatus(
  contact: any,
  updates: Record<string, unknown>
): 'pending' | 'partial' | 'complete' {
  const merged = { ...contact, ...updates };
  const hasEmail = !!merged.email;
  const hasTitle = !!merged.title;
  const hasPhone = !!merged.work_phone || !!merged.cell_phone;
  const hasLinkedIn = !!merged.linkedin_url;
  const hasEmailVerified = merged.email_status === 'valid';

  if (hasEmail && hasTitle && hasPhone && hasLinkedIn && hasEmailVerified) {
    return 'complete';
  }
  if (hasEmail || hasTitle || hasPhone || hasLinkedIn) {
    return 'partial';
  }
  return 'pending';
}
```

---

## 4. API Route Design

### 4.1 Route Overview

All enrichment API routes live under `/api/enrichment/`.

```
src/app/api/enrichment/
  process-queue/route.ts       -- Cron: process pending queue items
  reset-budgets/route.ts       -- Cron: reset daily credit budgets
  cleanup-cache/route.ts       -- Cron: purge expired cache entries

  enqueue/route.ts             -- POST: add contacts/companies to enrichment queue
  enqueue-batch/route.ts       -- POST: bulk enqueue by filter criteria

  contact/[id]/route.ts        -- POST: manually trigger enrichment for one contact
  company/[id]/route.ts        -- POST: manually trigger enrichment for one company

  status/route.ts              -- GET: queue stats, credit budgets, recent activity
  history/[entityId]/route.ts  -- GET: enrichment history for a contact or company

  budgets/route.ts             -- GET: current credit budgets; PUT: update budget limits
  providers/route.ts           -- GET: provider health/status check
```

### 4.2 Route Specifications

#### `POST /api/enrichment/enqueue`

Enqueue one or more entities for enrichment.

**Request:**
```json
{
  "items": [
    {
      "entity_type": "contact",
      "entity_id": "uuid-here",
      "providers": ["apollo", "proxycurl", "zerobounce"],
      "priority": 10
    }
  ]
}
```

**Response:**
```json
{
  "queued": 3,
  "skipped": 0,
  "errors": [],
  "items": [
    { "id": "queue-uuid", "provider": "apollo", "operation": "people_enrich", "status": "pending" }
  ]
}
```

**Implementation logic:**
1. For each item, determine which operations to enqueue based on available data:
   - Has email or (name + company) -> Apollo `people_enrich`
   - Has linkedin_url -> ProxyCurl `linkedin_enrich`
   - Has email -> ZeroBounce `email_verify`
2. Check dedup (skip if identical pending/processing entry exists)
3. Check last_enriched_at (skip if within TTL)
4. Insert into enrichment_queue with ON CONFLICT DO NOTHING

#### `POST /api/enrichment/enqueue-batch`

Bulk enqueue based on filter criteria.

**Request:**
```json
{
  "filters": {
    "enrichment_status": ["pending", "partial"],
    "source": ["airtable_people"],
    "has_email": true,
    "max_count": 500
  },
  "providers": ["apollo", "zerobounce"],
  "priority_override": null
}
```

**Response:**
```json
{
  "total_contacts_matched": 347,
  "total_queue_items_created": 694,
  "skipped_recently_enriched": 42,
  "skipped_already_queued": 15
}
```

#### `POST /api/enrichment/contact/[id]`

Manually trigger enrichment for a single contact. Bypasses priority queue -- processes immediately.

**Request:**
```json
{
  "providers": ["apollo", "proxycurl", "zerobounce"],
  "force": false
}
```

If `force: true`, ignores cache TTL and re-enriches even if recently enriched.

**Response:**
```json
{
  "contact_id": "uuid",
  "results": {
    "apollo": {
      "status": "success",
      "credits_used": 1,
      "fields_updated": ["email", "title", "work_phone", "linkedin_url"],
      "fields_skipped": ["bio"]
    },
    "proxycurl": {
      "status": "success",
      "credits_used": 3,
      "fields_updated": ["bio", "headshot_url"],
      "fields_skipped": []
    },
    "zerobounce": {
      "status": "success",
      "credits_used": 1,
      "email_status": "valid",
      "fields_updated": ["email_verified", "email_status", "email_verified_at"]
    }
  },
  "enrichment_status": "complete"
}
```

#### `GET /api/enrichment/status`

Dashboard stats for the enrichment system.

**Response:**
```json
{
  "queue": {
    "pending": 234,
    "processing": 5,
    "completed_today": 189,
    "failed_today": 3,
    "total_in_queue": 239
  },
  "budgets": {
    "apollo": {
      "daily": { "used": 423, "limit": 1000, "remaining": 577 },
      "monthly": { "used": 8934, "limit": 15000, "remaining": 6066 }
    },
    "proxycurl": {
      "daily": { "used": 87, "limit": 200, "remaining": 113 },
      "monthly": { "used": 1456, "limit": 3000, "remaining": 1544 }
    },
    "zerobounce": {
      "daily": { "used": 201, "limit": 500, "remaining": 299 },
      "monthly": { "used": 4102, "limit": 8000, "remaining": 3898 }
    }
  },
  "contacts": {
    "total": 2847,
    "pending_enrichment": 1204,
    "partial_enrichment": 892,
    "complete_enrichment": 751,
    "emails_verified": 1423,
    "emails_invalid": 67
  },
  "recent_activity": [
    {
      "id": "log-uuid",
      "contact_name": "John Doe",
      "provider": "apollo",
      "operation": "people_enrich",
      "status": "success",
      "credits_used": 1,
      "created_at": "2026-02-25T10:30:00Z"
    }
  ]
}
```

#### `GET /api/enrichment/history/[entityId]`

Full enrichment history for a specific contact or company.

**Query params:** `?entity_type=contact`

**Response:**
```json
{
  "entity_id": "uuid",
  "entity_type": "contact",
  "enrichment_status": "complete",
  "last_enriched_at": "2026-02-25T10:30:00Z",
  "logs": [
    {
      "id": "log-uuid",
      "provider": "apollo",
      "request_type": "people_enrich",
      "status": "success",
      "credits_used": 1,
      "created_at": "2026-02-25T10:30:00Z",
      "fields_updated": ["email", "title", "work_phone"]
    }
  ],
  "provenance": {
    "email": { "provider": "apollo", "confidence": "high", "enriched_at": "..." },
    "title": { "provider": "proxycurl", "confidence": "high", "enriched_at": "..." },
    "bio": { "provider": "proxycurl", "confidence": "high", "enriched_at": "..." }
  }
}
```

#### `GET /api/enrichment/process-queue`

Cron endpoint. Must verify a secret token to prevent unauthorized access.

**Headers:** `Authorization: Bearer CRON_SECRET`

**Response:**
```json
{
  "processed": 10,
  "succeeded": 8,
  "failed": 1,
  "skipped_budget": 1,
  "duration_ms": 4523
}
```

#### `GET /api/enrichment/budgets` and `PUT /api/enrichment/budgets`

Get and update credit budget limits.

**PUT Request:**
```json
{
  "provider": "apollo",
  "period_type": "daily",
  "max_credits": 1500
}
```

#### `GET /api/enrichment/providers`

Health check for all providers. Calls each provider's lightweight endpoint to verify API keys and connectivity.

**Response:**
```json
{
  "apollo": { "status": "healthy", "latency_ms": 234, "credits_remaining": null },
  "proxycurl": { "status": "healthy", "latency_ms": 189, "credits_remaining": 1544 },
  "zerobounce": { "status": "healthy", "latency_ms": 112, "credits_remaining": "2500" }
}
```

### 4.3 Cron Security

All cron-triggered routes verify the `CRON_SECRET` environment variable:

```typescript
// src/lib/enrichment/auth.ts

export function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  return token === process.env.CRON_SECRET;
}

// Usage in route handler:
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... process queue
}
```

---

## 5. Provider Service Implementations

### 5.1 File Structure

```
src/lib/enrichment/
  providers/
    apollo.ts          -- Apollo API client
    proxycurl.ts       -- ProxyCurl API client
    zerobounce.ts      -- ZeroBounce API client
    base.ts            -- Shared provider interface/types
  queue-processor.ts   -- Queue processing logic
  priority.ts          -- Priority calculation
  budget.ts            -- Credit budget management
  cache.ts             -- Dedup cache logic
  merge.ts             -- Data merge strategy
  auth.ts              -- Cron auth verification
  types.ts             -- Enrichment-specific types
  mappers.ts           -- Map provider responses to our schema
```

### 5.2 Provider Base Interface

```typescript
// src/lib/enrichment/providers/base.ts

export interface EnrichmentResult {
  success: boolean;
  provider: string;
  operation: string;
  creditsUsed: number;
  rawResponse: Record<string, unknown>;
  mappedData: Partial<Contact> | Partial<Company>;
  fieldsUpdated: string[];
  error?: string;
}

export interface EnrichmentProvider {
  name: string;
  enrichPerson(params: PersonEnrichParams): Promise<EnrichmentResult>;
  enrichCompany(params: CompanyEnrichParams): Promise<EnrichmentResult>;
}

export interface PersonEnrichParams {
  firstName?: string;
  lastName?: string;
  email?: string;
  linkedinUrl?: string;
  companyName?: string;
  companyDomain?: string;
}

export interface CompanyEnrichParams {
  name?: string;
  domain?: string;
  linkedinUrl?: string;
}
```

### 5.3 Apollo Service

```typescript
// src/lib/enrichment/providers/apollo.ts

const APOLLO_BASE_URL = 'https://api.apollo.io';

export class ApolloProvider implements EnrichmentProvider {
  name = 'apollo';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY!;
    if (!this.apiKey) throw new Error('APOLLO_API_KEY not configured');
  }

  async enrichPerson(params: PersonEnrichParams): Promise<EnrichmentResult> {
    const body: Record<string, string> = {};
    if (params.firstName) body.first_name = params.firstName;
    if (params.lastName) body.last_name = params.lastName;
    if (params.email) body.email = params.email;
    if (params.linkedinUrl) body.linkedin_url = params.linkedinUrl;
    if (params.companyName) body.organization_name = params.companyName;
    if (params.companyDomain) body.domain = params.companyDomain;

    const response = await fetch(`${APOLLO_BASE_URL}/api/v1/people/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      throw new RateLimitError('apollo', response.headers.get('Retry-After'));
    }

    if (!response.ok) {
      throw new ProviderError('apollo', `HTTP ${response.status}`, await response.text());
    }

    const data = await response.json();
    const person = data.person;

    if (!person) {
      return {
        success: false,
        provider: 'apollo',
        operation: 'people_enrich',
        creditsUsed: 0, // no match = no credit
        rawResponse: data,
        mappedData: {},
        fieldsUpdated: [],
        error: 'No match found',
      };
    }

    const mapped = mapApolloPersonToContact(person);

    return {
      success: true,
      provider: 'apollo',
      operation: 'people_enrich',
      creditsUsed: 1,
      rawResponse: data,
      mappedData: mapped.contact,
      fieldsUpdated: mapped.fieldsPopulated,
    };
  }

  async enrichCompany(params: CompanyEnrichParams): Promise<EnrichmentResult> {
    const body: Record<string, string> = {};
    if (params.domain) body.domain = params.domain;
    if (params.name) body.organization_name = params.name;

    const response = await fetch(`${APOLLO_BASE_URL}/api/v1/organizations/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      throw new RateLimitError('apollo', response.headers.get('Retry-After'));
    }

    if (!response.ok) {
      throw new ProviderError('apollo', `HTTP ${response.status}`, await response.text());
    }

    const data = await response.json();
    const org = data.organization;

    if (!org) {
      return {
        success: false,
        provider: 'apollo',
        operation: 'company_enrich',
        creditsUsed: 0,
        rawResponse: data,
        mappedData: {},
        fieldsUpdated: [],
        error: 'No match found',
      };
    }

    const mapped = mapApolloOrgToCompany(org);

    return {
      success: true,
      provider: 'apollo',
      operation: 'company_enrich',
      creditsUsed: 1,
      rawResponse: data,
      mappedData: mapped.company,
      fieldsUpdated: mapped.fieldsPopulated,
    };
  }
}
```

### 5.4 ProxyCurl Service

```typescript
// src/lib/enrichment/providers/proxycurl.ts

const PROXYCURL_BASE_URL = 'https://nubela.co/proxycurl/api';

export class ProxyCurlProvider implements EnrichmentProvider {
  name = 'proxycurl';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.PROXYCURL_API_KEY!;
    if (!this.apiKey) throw new Error('PROXYCURL_API_KEY not configured');
  }

  async enrichPerson(params: PersonEnrichParams): Promise<EnrichmentResult> {
    if (!params.linkedinUrl) {
      // Try reverse email lookup first
      if (params.email) {
        const linkedinUrl = await this.resolveEmailToLinkedIn(params.email);
        if (linkedinUrl) {
          params.linkedinUrl = linkedinUrl;
        } else {
          return {
            success: false,
            provider: 'proxycurl',
            operation: 'linkedin_enrich',
            creditsUsed: 1, // reverse lookup still costs a credit
            rawResponse: {},
            mappedData: {},
            fieldsUpdated: [],
            error: 'No LinkedIn URL available and email reverse lookup failed',
          };
        }
      } else {
        return {
          success: false,
          provider: 'proxycurl',
          operation: 'linkedin_enrich',
          creditsUsed: 0,
          rawResponse: {},
          mappedData: {},
          fieldsUpdated: [],
          error: 'No LinkedIn URL or email available for ProxyCurl lookup',
        };
      }
    }

    const queryParams = new URLSearchParams({
      linkedin_profile_url: params.linkedinUrl,
      use_cache: 'if-present',
      fallback_to_cache: 'on-error',
      skills: 'include',
      inferred_salary: 'exclude',  // save credits
      personal_email: 'include',
      personal_contact_number: 'include',
      extra: 'include',
    });

    const response = await fetch(`${PROXYCURL_BASE_URL}/v2/linkedin?${queryParams}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (response.status === 429) {
      throw new RateLimitError('proxycurl', '1');
    }

    if (response.status === 404) {
      return {
        success: false,
        provider: 'proxycurl',
        operation: 'linkedin_enrich',
        creditsUsed: 0, // 404 = not charged
        rawResponse: {},
        mappedData: {},
        fieldsUpdated: [],
        error: 'LinkedIn profile not found',
      };
    }

    if (!response.ok) {
      throw new ProviderError('proxycurl', `HTTP ${response.status}`, await response.text());
    }

    const data = await response.json();
    const mapped = mapProxyCurlPersonToContact(data);

    // Credits: 1 base + 1 personal_email + 1 personal_contact_number = 3
    return {
      success: true,
      provider: 'proxycurl',
      operation: 'linkedin_enrich',
      creditsUsed: 3,
      rawResponse: data,
      mappedData: mapped.contact,
      fieldsUpdated: mapped.fieldsPopulated,
    };
  }

  private async resolveEmailToLinkedIn(email: string): Promise<string | null> {
    const queryParams = new URLSearchParams({
      work_email: email,
      lookup_depth: 'deep',
    });

    const response = await fetch(
      `${PROXYCURL_BASE_URL}/linkedin/profile/resolve/email?${queryParams}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.url || null;
  }

  async enrichCompany(params: CompanyEnrichParams): Promise<EnrichmentResult> {
    if (!params.linkedinUrl) {
      return {
        success: false,
        provider: 'proxycurl',
        operation: 'company_enrich',
        creditsUsed: 0,
        rawResponse: {},
        mappedData: {},
        fieldsUpdated: [],
        error: 'No LinkedIn company URL available',
      };
    }

    const queryParams = new URLSearchParams({
      url: params.linkedinUrl,
      use_cache: 'if-present',
    });

    const response = await fetch(
      `${PROXYCURL_BASE_URL}/linkedin/company?${queryParams}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );

    if (!response.ok) {
      throw new ProviderError('proxycurl', `HTTP ${response.status}`, await response.text());
    }

    const data = await response.json();
    const mapped = mapProxyCurlCompanyToCompany(data);

    return {
      success: true,
      provider: 'proxycurl',
      operation: 'company_enrich',
      creditsUsed: 1,
      rawResponse: data,
      mappedData: mapped.company,
      fieldsUpdated: mapped.fieldsPopulated,
    };
  }
}
```

### 5.5 ZeroBounce Service

```typescript
// src/lib/enrichment/providers/zerobounce.ts

const ZEROBOUNCE_BASE_URL = 'https://api.zerobounce.net/v2';

export class ZeroBounceProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ZEROBOUNCE_API_KEY!;
    if (!this.apiKey) throw new Error('ZEROBOUNCE_API_KEY not configured');
  }

  async verifySingle(email: string): Promise<EmailVerificationResult> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      email: email,
      ip_address: '',
    });

    const response = await fetch(`${ZEROBOUNCE_BASE_URL}/validate?${params}`);

    if (!response.ok) {
      throw new ProviderError('zerobounce', `HTTP ${response.status}`, await response.text());
    }

    const data = await response.json();

    return {
      email: data.address,
      status: data.status,
      subStatus: data.sub_status,
      freeEmail: data.free_email,
      didYouMean: data.did_you_mean,
      smtpProvider: data.smtp_provider,
      mxFound: data.mx_found === 'true',
      firstName: data.firstname,
      lastName: data.lastname,
      creditsUsed: 1,
      rawResponse: data,
    };
  }

  async verifyBatch(emails: string[]): Promise<EmailVerificationResult[]> {
    if (emails.length > 50) {
      throw new Error('ZeroBounce batch limit is 50 emails per request');
    }

    const response = await fetch(`${ZEROBOUNCE_BASE_URL}/validatebatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: this.apiKey,
        email_batch: emails.map(email => ({
          email_address: email,
          ip_address: '',
        })),
      }),
    });

    if (!response.ok) {
      throw new ProviderError('zerobounce', `HTTP ${response.status}`, await response.text());
    }

    const data = await response.json();

    return (data.email_batch || []).map((item: any) => ({
      email: item.address,
      status: item.status,
      subStatus: item.sub_status,
      freeEmail: item.free_email,
      didYouMean: item.did_you_mean,
      smtpProvider: item.smtp_provider,
      mxFound: item.mx_found === 'true',
      firstName: item.firstname,
      lastName: item.lastname,
      creditsUsed: 1,
      rawResponse: item,
    }));
  }

  async getCredits(): Promise<number> {
    const params = new URLSearchParams({ api_key: this.apiKey });
    const response = await fetch(`${ZEROBOUNCE_BASE_URL}/getcredits?${params}`);
    const data = await response.json();
    return parseInt(data.Credits, 10);
  }
}

export interface EmailVerificationResult {
  email: string;
  status: 'valid' | 'invalid' | 'catch-all' | 'spamtrap' | 'abuse' | 'do_not_mail' | 'unknown';
  subStatus: string;
  freeEmail: boolean;
  didYouMean: string | null;
  smtpProvider: string;
  mxFound: boolean;
  firstName: string | null;
  lastName: string | null;
  creditsUsed: number;
  rawResponse: Record<string, unknown>;
}
```

### 5.6 Response Mappers

```typescript
// src/lib/enrichment/mappers.ts

import type { Contact, Company } from '@/types/database';

type MappedResult<T> = {
  contact?: Partial<T>;
  company?: Partial<T>;
  fieldsPopulated: string[];
};

export function mapApolloPersonToContact(
  person: Record<string, any>
): { contact: Partial<Contact>; fieldsPopulated: string[] } {
  const contact: Partial<Contact> = {};
  const fields: string[] = [];

  if (person.email) { contact.email = person.email; fields.push('email'); }
  if (person.title) { contact.title = person.title; fields.push('title'); }
  if (person.linkedin_url) { contact.linkedin_url = person.linkedin_url; fields.push('linkedin_url'); }
  if (person.photo_url) { contact.headshot_url = person.photo_url; fields.push('headshot_url'); }

  // Phone numbers
  const phones = person.phone_numbers || [];
  const workPhone = phones.find((p: any) => p.type === 'work_direct' || p.type === 'work_hq');
  const mobilePhone = phones.find((p: any) => p.type === 'mobile');
  if (workPhone) { contact.work_phone = workPhone.raw_number; fields.push('work_phone'); }
  if (mobilePhone) { contact.cell_phone = mobilePhone.raw_number; fields.push('cell_phone'); }

  // Address from organization
  if (person.city && person.state) {
    contact.work_address = [person.city, person.state, person.country].filter(Boolean).join(', ');
    fields.push('work_address');
  }

  return { contact, fieldsPopulated: fields };
}

export function mapApolloOrgToCompany(
  org: Record<string, any>
): { company: Partial<Company>; fieldsPopulated: string[] } {
  const company: Partial<any> = {};
  const fields: string[] = [];

  if (org.name) { company.name = org.name; fields.push('name'); }
  if (org.industry) { company.industry = org.industry; fields.push('industry'); }
  if (org.website_url) { company.website = org.website_url; fields.push('website'); }
  if (org.phone) { company.phone = org.phone; fields.push('phone'); }
  if (org.linkedin_url) { company.linkedin_url = org.linkedin_url; fields.push('linkedin_url'); }
  if (org.short_description || org.seo_description) {
    company.description = org.short_description || org.seo_description;
    fields.push('description');
  }
  if (org.raw_address) { company.hq_address = org.raw_address; fields.push('hq_address'); }
  if (org.estimated_num_employees) {
    company.employee_count_range = categorizeEmployeeCount(org.estimated_num_employees);
    fields.push('employee_count_range');
  }
  if (org.annual_revenue) {
    company.revenue_range = categorizeRevenue(org.annual_revenue);
    company.annual_revenue = org.annual_revenue;
    fields.push('revenue_range');
  }
  if (org.founded_year) { company.founded_year = org.founded_year; fields.push('founded_year'); }
  if (org.logo_url) { company.logo_url = org.logo_url; fields.push('logo_url'); }
  if (org.technologies) { company.technologies = org.technologies; fields.push('technologies'); }
  if (org.keywords) { company.keywords = org.keywords; fields.push('keywords'); }

  return { company, fieldsPopulated: fields };
}

export function mapProxyCurlPersonToContact(
  data: Record<string, any>
): { contact: Partial<Contact>; fieldsPopulated: string[] } {
  const contact: Partial<Contact> = {};
  const fields: string[] = [];

  if (data.headline || data.occupation) {
    // Extract title from current experience if available
    const currentJob = (data.experiences || []).find((e: any) => !e.ends_at);
    if (currentJob?.title) {
      contact.title = currentJob.title;
      fields.push('title');
    }
  }
  if (data.summary) { contact.bio = data.summary; fields.push('bio'); }
  if (data.profile_pic_url) { contact.headshot_url = data.profile_pic_url; fields.push('headshot_url'); }
  if (data.public_identifier) {
    contact.linkedin_url = `https://www.linkedin.com/in/${data.public_identifier}`;
    fields.push('linkedin_url');
  }
  if (data.personal_emails?.length > 0) {
    // Store personal email in notes if work email already exists, otherwise use it
    contact.email = data.personal_emails[0];
    fields.push('email');
  }
  if (data.personal_numbers?.length > 0) {
    contact.cell_phone = data.personal_numbers[0];
    fields.push('cell_phone');
  }
  if (data.city && data.state) {
    contact.work_address = [data.city, data.state, data.country_full_name].filter(Boolean).join(', ');
    fields.push('work_address');
  }

  return { contact, fieldsPopulated: fields };
}

export function mapProxyCurlCompanyToCompany(
  data: Record<string, any>
): { company: Partial<Company>; fieldsPopulated: string[] } {
  const company: Partial<any> = {};
  const fields: string[] = [];

  if (data.name) { company.name = data.name; fields.push('name'); }
  if (data.industry) { company.industry = data.industry; fields.push('industry'); }
  if (data.website) { company.website = data.website; fields.push('website'); }
  if (data.description) { company.description = data.description; fields.push('description'); }
  if (data.universal_name_id) {
    company.linkedin_url = `https://www.linkedin.com/company/${data.universal_name_id}`;
    fields.push('linkedin_url');
  }
  if (data.hq) {
    const hq = data.hq;
    company.hq_address = [hq.line_1, hq.city, hq.state, hq.postal_code, hq.country]
      .filter(Boolean).join(', ');
    fields.push('hq_address');
  }
  if (data.company_size) {
    company.employee_count_range = `${data.company_size[0]}-${data.company_size[1]}`;
    fields.push('employee_count_range');
  }
  if (data.founded_year) { company.founded_year = data.founded_year; fields.push('founded_year'); }
  if (data.profile_pic_url) { company.logo_url = data.profile_pic_url; fields.push('logo_url'); }

  return { company, fieldsPopulated: fields };
}

// Helpers

function categorizeEmployeeCount(count: number): string {
  if (count <= 10) return '1-10';
  if (count <= 50) return '11-50';
  if (count <= 200) return '51-200';
  if (count <= 500) return '201-500';
  if (count <= 1000) return '501-1000';
  if (count <= 5000) return '1001-5000';
  return '5000+';
}

function categorizeRevenue(revenue: number): string {
  if (revenue < 1_000_000) return '<$1M';
  if (revenue < 10_000_000) return '$1M-$10M';
  if (revenue < 50_000_000) return '$10M-$50M';
  if (revenue < 100_000_000) return '$50M-$100M';
  if (revenue < 500_000_000) return '$100M-$500M';
  if (revenue < 1_000_000_000) return '$500M-$1B';
  return '$1B+';
}
```

### 5.7 Error Handling Classes

```typescript
// src/lib/enrichment/errors.ts

export class ProviderError extends Error {
  constructor(
    public provider: string,
    public statusMessage: string,
    public responseBody?: string
  ) {
    super(`${provider} error: ${statusMessage}`);
  }
}

export class RateLimitError extends Error {
  constructor(
    public provider: string,
    public retryAfter: string | null
  ) {
    super(`${provider} rate limited. Retry after: ${retryAfter || 'unknown'}`);
  }
}

export class BudgetExhaustedError extends Error {
  constructor(
    public provider: string,
    public periodType: 'daily' | 'monthly',
    public remaining: number
  ) {
    super(`${provider} ${periodType} budget exhausted (${remaining} credits remaining)`);
  }
}
```

---

## 6. UI Components

### 6.1 New Pages

#### 6.1.1 Enrichment Dashboard Page

**Path:** `src/app/enrichment/page.tsx`

This is the main enrichment control center showing:
- Queue status (pending/processing/completed/failed counts)
- Credit budget gauges for each provider (daily + monthly)
- Recent enrichment activity feed
- Quick actions: "Enrich All Pending", "Verify All Emails", "Pause Queue"

**Layout:**
```
+------------------------------------------------------------------+
|  Enrichment Dashboard                                  [Enrich All Pending]
+------------------------------------------------------------------+
|  Queue Status              |  Credit Budgets                     |
|  +---------+----------+    |  Apollo    [====------] 423/1000    |
|  | Pending | 234      |    |  ProxyCurl [===-------] 87/200     |
|  | Active  | 5        |    |  ZeroBounce[====------] 201/500    |
|  | Today   | 189 ok   |    |  --- Monthly ---                   |
|  | Failed  | 3        |    |  Apollo    [======----] 8934/15000  |
|  +---------+----------+    |  ProxyCurl [====------] 1456/3000  |
|                            |  ZeroBounce[=====-----] 4102/8000  |
+------------------------------------------------------------------+
|  Contact Enrichment Status                                       |
|  [===========] 751 Complete  [=======] 892 Partial  [====] 1204  |
|  Emails: 1423 verified / 67 invalid / 1357 unverified            |
+------------------------------------------------------------------+
|  Recent Activity                                                 |
|  10:30 AM  John Doe       Apollo    people_enrich  success  1cr  |
|  10:30 AM  Jane Smith     ZeroBounce email_verify  success  1cr  |
|  10:29 AM  Acme Corp      Apollo    company_enrich success  1cr  |
|  10:28 AM  Bob Johnson    ProxyCurl linkedin_enrich success 3cr  |
|  ...                                                             |
+------------------------------------------------------------------+
```

#### 6.1.2 Enrichment Settings Page

**Path:** `src/app/enrichment/settings/page.tsx`

Configure:
- Daily and monthly budget limits per provider
- Cache TTLs
- Provider API key status (healthy/error -- never show actual keys)
- Default enrichment pipeline (which providers to use and in what order)
- Auto-enrich toggle (whether new contacts are automatically queued)

### 6.2 Components to Build

```
src/components/enrichment/
  enrichment-dashboard.tsx       -- Main dashboard layout
  credit-budget-gauge.tsx        -- Visual gauge for credit usage (bar with percentage)
  queue-status-card.tsx          -- Queue pending/processing/completed/failed
  enrichment-activity-feed.tsx   -- Real-time feed of recent enrichment actions
  contact-enrichment-panel.tsx   -- Panel on contact detail page showing enrichment status
  enrichment-trigger-button.tsx  -- "Enrich Now" button with provider selection
  email-status-badge.tsx         -- Badge showing email verification status
  field-provenance-tooltip.tsx   -- Tooltip showing which provider supplied a field
  batch-enrich-dialog.tsx        -- Modal for bulk enrichment with filter options
  provider-status-indicator.tsx  -- Green/yellow/red dot for provider health
  budget-settings-form.tsx       -- Form to edit budget limits
```

### 6.3 Contact Detail Page Enrichment Panel

Add to the existing `src/app/contacts/[id]/page.tsx` sidebar:

```
+----------------------------------+
|  Enrichment Status               |
|  Status: Partial                 |
|  Last enriched: Feb 25, 2026     |
|                                  |
|  [Enrich Now v]                  |
|   - Apollo (1 credit)            |
|   - ProxyCurl (3 credits)        |
|   - ZeroBounce (1 credit)        |
|   - All Providers (5 credits)    |
|                                  |
|  Email: valid (verified Feb 25)  |
|                                  |
|  Field Sources:                  |
|  email     <- Apollo (high)      |
|  title     <- ProxyCurl (high)   |
|  bio       <- ProxyCurl (high)   |
|  phone     <- Apollo (high)      |
|                                  |
|  History:                        |
|  Feb 25  Apollo    success  1cr  |
|  Feb 25  ProxyCurl success  3cr  |
|  Feb 24  ZeroBounce success 1cr  |
+----------------------------------+
```

### 6.4 Contacts Table Enrichment Column

Add a column to the existing contacts table showing enrichment status with a quick-action button:

```typescript
// In contacts-table.tsx, add column:
{
  header: 'Enrichment',
  cell: (contact) => (
    <div className="flex items-center gap-2">
      <EnrichmentStatusBadge status={contact.enrichment_status} />
      <EmailStatusBadge status={contact.email_status} />
    </div>
  )
}
```

### 6.5 Email Status Badge Component

```typescript
// src/components/enrichment/email-status-badge.tsx

const STATUS_CONFIG = {
  valid:       { color: 'green',  label: 'Verified' },
  invalid:     { color: 'red',    label: 'Invalid' },
  'catch-all': { color: 'yellow', label: 'Catch-All' },
  spamtrap:    { color: 'red',    label: 'Spam Trap' },
  abuse:       { color: 'red',    label: 'Abuse' },
  do_not_mail: { color: 'orange', label: 'Do Not Mail' },
  unknown:     { color: 'gray',   label: 'Unknown' },
  unverified:  { color: 'gray',   label: 'Unverified' },
} as const;
```

### 6.6 Suppression List Integration

When ZeroBounce returns `spamtrap`, `abuse`, or `do_not_mail`, automatically add the email to the `suppression_list` table:

```typescript
async function handleVerificationResult(
  supabase: SupabaseClient,
  contactId: string,
  result: EmailVerificationResult
) {
  // Update contact
  await supabase.from('contacts').update({
    email_status: result.status,
    email_verified: result.status === 'valid',
    email_verified_at: new Date().toISOString(),
  }).eq('id', contactId);

  // Auto-suppress dangerous emails
  if (['spamtrap', 'abuse', 'do_not_mail'].includes(result.status)) {
    await supabase.from('suppression_list').upsert({
      email: result.email,
      reason: `ZeroBounce: ${result.status} (${result.subStatus})`,
    }, { onConflict: 'email' });
  }
}
```

---

## 7. Environment Variables

Add to `.env.local`:

```bash
# Enrichment Provider API Keys
APOLLO_API_KEY=your_apollo_api_key_here
PROXYCURL_API_KEY=your_proxycurl_api_key_here
ZEROBOUNCE_API_KEY=your_zerobounce_api_key_here

# Cron Security
CRON_SECRET=a_random_secure_string_for_cron_auth

# Enrichment Configuration (optional overrides)
ENRICHMENT_ENABLED=true
ENRICHMENT_AUTO_QUEUE_NEW_CONTACTS=false
ENRICHMENT_APOLLO_DAILY_BUDGET=1000
ENRICHMENT_APOLLO_MONTHLY_BUDGET=15000
ENRICHMENT_PROXYCURL_DAILY_BUDGET=200
ENRICHMENT_PROXYCURL_MONTHLY_BUDGET=3000
ENRICHMENT_ZEROBOUNCE_DAILY_BUDGET=500
ENRICHMENT_ZEROBOUNCE_MONTHLY_BUDGET=8000
```

---

## 8. Migration & Rollout Plan

### 8.1 Implementation Order

**Week 1: Foundation**
1. Run database migration `002_enrichment_engine.sql`
2. Update TypeScript types in `src/types/database.ts`
3. Implement provider base interfaces and error classes
4. Implement Apollo provider service + mapper
5. Implement cache and dedup logic
6. Build `POST /api/enrichment/contact/[id]` route (manual single enrichment)
7. Test against a handful of real contacts

**Week 2: Queue & Budget**
1. Implement credit budget tracking (table, functions, check/consume logic)
2. Implement queue processor
3. Implement priority calculation
4. Build `POST /api/enrichment/enqueue` and `enqueue-batch` routes
5. Build `GET /api/enrichment/process-queue` cron route
6. Build `GET /api/enrichment/status` route
7. Test queue processing with 50 contacts

**Week 3: Additional Providers**
1. Implement ProxyCurl provider service + mapper
2. Implement ZeroBounce provider service + mapper
3. Implement data merge strategy with provenance tracking
4. Implement suppression list integration
5. Build `GET /api/enrichment/history/[entityId]` route
6. Build budget reset and cache cleanup cron routes
7. Test full pipeline with all three providers

**Week 4: UI**
1. Build enrichment dashboard page (`/enrichment`)
2. Build credit budget gauge and queue status components
3. Build enrichment panel for contact detail page
4. Build "Enrich Now" button with provider dropdown
5. Build email status badge and field provenance tooltip
6. Build batch enrichment dialog
7. Add enrichment column to contacts table
8. Build enrichment settings page

**Week 5: Hardening**
1. Add comprehensive error handling and retry logic
2. Add logging and monitoring (track success rates per provider)
3. Load test with full contact database
4. Set up Vercel Cron schedules
5. Configure production budget limits
6. Write operational runbook (how to pause, debug, reset)

### 8.2 Estimated Credit Costs

Assuming ~2,800 contacts in the database:

| Provider   | Operation            | Per Contact | Total Cost (credits) | Estimated $ |
|------------|---------------------|-------------|---------------------|-------------|
| Apollo     | People enrichment    | 1           | 2,800               | Included in plan |
| Apollo     | Company enrichment   | 1           | ~500 unique companies| Included in plan |
| ProxyCurl  | LinkedIn enrichment  | 3           | 8,400               | $672-$840   |
| ZeroBounce | Email verification   | 1           | 2,800               | $18-$22     |

**Recommendation:** Start with Apollo (free tier has 10,000 credits/month) and ZeroBounce (cheap) first. Add ProxyCurl selectively for high-priority contacts only, gated by ICP score > 0.6.

### 8.3 Rollback Plan

If issues arise:
1. Set `ENRICHMENT_ENABLED=false` to stop all enrichment
2. The queue processor checks this flag before processing
3. All enrichment data is additive (never deletes existing fields)
4. The `enrichment_logs` table provides full audit trail
5. The `enrichment_field_provenance` table allows reverting any field to its pre-enrichment value

### 8.4 Monitoring Queries

```sql
-- Enrichment success rate by provider (last 7 days)
SELECT
  provider,
  COUNT(*) FILTER (WHERE status = 'success') as successes,
  COUNT(*) FILTER (WHERE status = 'error') as errors,
  COUNT(*) FILTER (WHERE status = 'rate_limited') as rate_limited,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'success')::numeric / NULLIF(COUNT(*), 0) * 100, 1
  ) as success_rate
FROM enrichment_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider;

-- Credit consumption by day
SELECT
  provider,
  DATE(created_at) as day,
  SUM(credits_used) as credits_consumed
FROM enrichment_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY provider, DATE(created_at)
ORDER BY day DESC, provider;

-- Queue health
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(attempts) as max_attempts_seen
FROM enrichment_queue
GROUP BY status;

-- Contacts still needing enrichment
SELECT
  enrichment_status,
  COUNT(*) as count
FROM contacts
GROUP BY enrichment_status;
```
