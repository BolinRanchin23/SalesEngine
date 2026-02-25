export type EntityType = 'contact' | 'company';
export type Provider = 'apollo' | 'proxycurl' | 'zerobounce';
export type Operation = 'enrich_person' | 'enrich_company' | 'verify_email' | 'find_email';
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface PersonEnrichParams {
  first_name?: string;
  last_name?: string;
  email?: string;
  linkedin_url?: string;
  company_name?: string;
  domain?: string;
}

export interface CompanyEnrichParams {
  name?: string;
  domain?: string;
  linkedin_url?: string;
}

export interface EnrichmentResult {
  provider: Provider;
  success: boolean;
  credits_used: number;
  data: Record<string, unknown>;
  cached: boolean;
}

export interface ContactEnrichmentData {
  email?: string;
  email_status?: string;
  title?: string;
  linkedin_url?: string;
  headshot_url?: string;
  bio?: string;
  work_phone?: string;
  cell_phone?: string;
  work_address?: string;
}

export interface CompanyEnrichmentData {
  name?: string;
  industry?: string;
  website?: string;
  phone?: string;
  linkedin_url?: string;
  description?: string;
  hq_address?: string;
  employee_count_range?: string;
  revenue_range?: string;
  founded_year?: number;
  annual_revenue?: number;
  logo_url?: string;
  technologies?: string[];
  keywords?: string[];
}

export interface EmailVerificationResult {
  email: string;
  status: 'valid' | 'invalid' | 'catch-all' | 'spamtrap' | 'abuse' | 'do_not_mail' | 'unknown';
  sub_status?: string;
  free_email?: boolean;
  did_you_mean?: string | null;
  confidence?: string;
  processed_at?: string;
}

export interface MergeRule {
  strategy: 'trust_hierarchy' | 'prefer_non_empty' | 'append';
  providers: Provider[];
}

export type FieldMergeConfig = Record<string, MergeRule>;
