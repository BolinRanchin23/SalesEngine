export type EntityType = 'contact' | 'company';
export type Provider = 'apollo' | 'pdl' | 'zerobounce' | 'brightdata' | 'websearch';
export type Operation = 'enrich_person' | 'enrich_company' | 'verify_email' | 'find_email' | 'web_search';
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type EnrichmentDepth = 'quick' | 'standard' | 'deep';

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

export interface WebResearchItem {
  title: string;
  url: string;
  snippet: string;
  category: 'article' | 'press_release' | 'board_membership' | 'community' | 'award' | 'publication' | 'other';
  found_at: string;
}

export interface ContactEnrichmentData {
  email?: string;
  email_status?: string;
  title?: string;
  headline?: string;
  linkedin_url?: string;
  headshot_url?: string;
  bio?: string;
  work_phone?: string;
  cell_phone?: string;
  work_address?: string;
  work_history?: Record<string, unknown>[];
  education?: Record<string, unknown>[];
  skills?: string[];
  certifications?: string[];
  languages?: Record<string, unknown>[];
  seniority?: string;
  department?: string;
  pdl_id?: string;
  social_profiles?: Record<string, string>;
  personal_emails?: string[];
  interests?: string[];
  inferred_salary?: string;
  inferred_years_experience?: number;
  followers?: number;
  connections?: number;
  recommendations?: Record<string, unknown>[];
  volunteer_experience?: Record<string, unknown>[];
  publications?: Record<string, unknown>[];
  honors_and_awards?: Record<string, unknown>[];
  projects?: Record<string, unknown>[];
  web_research?: WebResearchItem[];
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
