import { createAdminClient } from '@/lib/supabase/admin';
import { Provider, ContactEnrichmentData, CompanyEnrichmentData, EntityType } from './types';

// Provider trust hierarchy per field (first = most trusted)
const CONTACT_FIELD_TRUST: Record<keyof ContactEnrichmentData, Provider[]> = {
  email: ['apollo', 'pdl'],
  email_status: ['zerobounce', 'apollo'],
  title: ['apollo', 'pdl', 'brightdata'],
  headline: ['brightdata', 'pdl', 'apollo'],
  linkedin_url: ['pdl', 'apollo', 'brightdata'],
  headshot_url: ['brightdata', 'pdl', 'apollo'],
  bio: ['pdl', 'brightdata'],
  work_phone: ['apollo'],
  cell_phone: ['pdl', 'apollo'],
  work_address: ['apollo', 'pdl', 'brightdata'],
  work_history: ['pdl', 'brightdata'],
  education: ['pdl', 'brightdata'],
  skills: ['pdl', 'brightdata'],
  certifications: ['pdl', 'brightdata'],
  languages: ['pdl', 'brightdata'],
  seniority: ['apollo', 'pdl'],
  department: ['pdl'],
  pdl_id: ['pdl'],
  social_profiles: ['pdl', 'apollo', 'brightdata'],
  personal_emails: ['pdl', 'apollo'],
  interests: ['pdl'],
  inferred_salary: ['pdl'],
  inferred_years_experience: ['pdl'],
  followers: ['brightdata'],
  connections: ['brightdata'],
  recommendations: ['brightdata'],
  volunteer_experience: ['brightdata'],
  publications: ['brightdata'],
  honors_and_awards: ['brightdata'],
  projects: ['brightdata'],
  web_research: ['websearch'],
};

const COMPANY_FIELD_TRUST: Record<keyof CompanyEnrichmentData, Provider[]> = {
  name: ['apollo'],
  industry: ['apollo'],
  website: ['apollo'],
  phone: ['apollo'],
  linkedin_url: ['apollo'],
  description: ['apollo'],
  hq_address: ['apollo'],
  employee_count_range: ['apollo'],
  revenue_range: ['apollo'],
  founded_year: ['apollo'],
  annual_revenue: ['apollo'],
  logo_url: ['apollo'],
  technologies: ['apollo'],
  keywords: ['apollo'],
};

export function mergeContactData(
  existing: Record<string, unknown>,
  incoming: ContactEnrichmentData,
  provider: Provider
): Partial<ContactEnrichmentData> {
  const merged: Partial<ContactEnrichmentData> = {};

  for (const [field, value] of Object.entries(incoming)) {
    if (value == null || value === '') continue;
    const key = field as keyof ContactEnrichmentData;
    const trustOrder = CONTACT_FIELD_TRUST[key];

    if (!trustOrder) continue;

    const existingVal = existing[field];
    if (!existingVal || existingVal === '') {
      // Empty field — always fill
      merged[key] = value as never;
    } else {
      // Field exists — only overwrite if incoming provider is more trusted
      const incomingRank = trustOrder.indexOf(provider);
      if (incomingRank === 0) {
        // Incoming is most trusted — overwrite
        merged[key] = value as never;
      }
    }
  }

  return merged;
}

export function mergeCompanyData(
  existing: Record<string, unknown>,
  incoming: CompanyEnrichmentData,
  provider: Provider
): Partial<CompanyEnrichmentData> {
  const merged: Partial<CompanyEnrichmentData> = {};

  for (const [field, value] of Object.entries(incoming)) {
    if (value == null || value === '') continue;
    const key = field as keyof CompanyEnrichmentData;
    const trustOrder = COMPANY_FIELD_TRUST[key];

    if (!trustOrder) continue;

    const existingVal = existing[field];

    // Array fields: append strategy
    if (key === 'technologies' || key === 'keywords') {
      const existingArr = (existingVal as string[]) ?? [];
      const incomingArr = value as string[];
      const combined = [...new Set([...existingArr, ...incomingArr])];
      if (combined.length > existingArr.length) {
        merged[key] = combined as never;
      }
      continue;
    }

    if (!existingVal || existingVal === '') {
      merged[key] = value as never;
    } else {
      const incomingRank = trustOrder.indexOf(provider);
      if (incomingRank === 0) {
        merged[key] = value as never;
      }
    }
  }

  return merged;
}

export async function writeProvenance(
  entityType: EntityType,
  entityId: string,
  provider: Provider,
  fields: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();
  const rows = Object.entries(fields)
    .filter(([, v]) => v != null && v !== '')
    .map(([field, value]) => ({
      entity_type: entityType,
      entity_id: entityId,
      field_name: field,
      provider,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      enriched_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  await supabase
    .from('enrichment_field_provenance')
    .upsert(rows, { onConflict: 'entity_type,entity_id,field_name,provider' });
}

export function determineEnrichmentStatus(
  entity: Record<string, unknown>,
  fields: string[]
): 'pending' | 'partial' | 'complete' {
  const filled = fields.filter((f) => entity[f] != null && entity[f] !== '').length;
  if (filled === 0) return 'pending';
  if (filled >= fields.length * 0.7) return 'complete';
  return 'partial';
}
