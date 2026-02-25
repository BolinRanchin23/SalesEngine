import { ContactEnrichmentData, CompanyEnrichmentData } from '../types';

// ─── Helpers ────────────────────────────────────────

export function categorizeEmployeeCount(count: number | null | undefined): string | undefined {
  if (count == null) return undefined;
  if (count <= 10) return '1-10';
  if (count <= 50) return '11-50';
  if (count <= 200) return '51-200';
  if (count <= 500) return '201-500';
  if (count <= 1000) return '501-1000';
  if (count <= 5000) return '1001-5000';
  if (count <= 10000) return '5001-10000';
  return '10001+';
}

export function categorizeRevenue(revenue: number | null | undefined): string | undefined {
  if (revenue == null) return undefined;
  if (revenue < 1_000_000) return 'Under $1M';
  if (revenue < 10_000_000) return '$1M-$10M';
  if (revenue < 50_000_000) return '$10M-$50M';
  if (revenue < 100_000_000) return '$50M-$100M';
  if (revenue < 500_000_000) return '$100M-$500M';
  if (revenue < 1_000_000_000) return '$500M-$1B';
  return '$1B+';
}

function buildAddress(parts: {
  city?: string;
  state?: string;
  country?: string;
  street?: string;
  postal_code?: string;
}): string | undefined {
  const segments = [parts.street, parts.city, parts.state, parts.postal_code, parts.country]
    .filter(Boolean);
  return segments.length > 0 ? segments.join(', ') : undefined;
}

// ─── Apollo Mappers ─────────────────────────────────

export function mapApolloPersonToContact(
  person: Record<string, unknown>
): ContactEnrichmentData {
  const phones = (person.phone_numbers as Array<{ raw_number: string; type: string }>) ?? [];
  const workPhone = phones.find((p) => p.type === 'work_direct' || p.type === 'work_hq');
  const cellPhone = phones.find((p) => p.type === 'mobile');

  return {
    email: person.email as string | undefined,
    email_status: person.email_status as string | undefined,
    title: person.title as string | undefined,
    linkedin_url: person.linkedin_url as string | undefined,
    headshot_url: person.photo_url as string | undefined,
    work_phone: workPhone?.raw_number,
    cell_phone: cellPhone?.raw_number,
    work_address: buildAddress({
      city: person.city as string | undefined,
      state: person.state as string | undefined,
      country: person.country as string | undefined,
    }),
  };
}

export function mapApolloOrgToCompany(
  org: Record<string, unknown>
): CompanyEnrichmentData {
  const employeeCount = org.estimated_num_employees as number | undefined;
  const revenue = org.annual_revenue as number | undefined;

  return {
    name: org.name as string | undefined,
    industry: org.industry as string | undefined,
    website: org.website_url as string | undefined,
    phone: org.phone as string | undefined,
    linkedin_url: org.linkedin_url as string | undefined,
    description: (org.short_description || org.seo_description) as string | undefined,
    hq_address: buildAddress({
      street: org.street_address as string | undefined,
      city: org.city as string | undefined,
      state: org.state as string | undefined,
      postal_code: org.postal_code as string | undefined,
      country: org.country as string | undefined,
    }),
    employee_count_range: categorizeEmployeeCount(employeeCount),
    revenue_range: categorizeRevenue(revenue),
    founded_year: org.founded_year as number | undefined,
    annual_revenue: revenue,
    logo_url: org.logo_url as string | undefined,
    technologies: org.technologies as string[] | undefined,
    keywords: org.keywords as string[] | undefined,
  };
}

// ─── ProxyCurl Mappers ──────────────────────────────

export function mapProxyCurlPersonToContact(
  profile: Record<string, unknown>
): ContactEnrichmentData {
  // Get current title from experiences
  const experiences = (profile.experiences as Array<Record<string, unknown>>) ?? [];
  const current = experiences.find((e) => e.ends_at == null);
  const title = current?.title as string | undefined;

  const personalEmails = (profile.personal_emails as string[]) ?? [];
  const personalNumbers = (profile.personal_numbers as string[]) ?? [];

  const linkedinUrl = profile.public_identifier
    ? `https://www.linkedin.com/in/${profile.public_identifier}`
    : undefined;

  return {
    title,
    bio: profile.summary as string | undefined,
    headshot_url: profile.profile_pic_url as string | undefined,
    linkedin_url: linkedinUrl,
    email: personalEmails[0],
    cell_phone: personalNumbers[0],
    work_address: buildAddress({
      city: profile.city as string | undefined,
      state: profile.state as string | undefined,
      country: profile.country_full_name as string | undefined,
    }),
  };
}

export function mapProxyCurlCompanyToCompany(
  company: Record<string, unknown>
): CompanyEnrichmentData {
  const hq = company.hq as Record<string, unknown> | null;
  const companySize = company.company_size as [number, number] | null;
  const midpoint = companySize ? Math.round((companySize[0] + companySize[1]) / 2) : null;

  return {
    name: company.name as string | undefined,
    industry: company.industry as string | undefined,
    website: company.website as string | undefined,
    description: company.description as string | undefined,
    linkedin_url: company.universal_name_id
      ? `https://www.linkedin.com/company/${company.universal_name_id}`
      : undefined,
    hq_address: hq
      ? buildAddress({
          street: hq.line_1 as string | undefined,
          city: hq.city as string | undefined,
          state: hq.state as string | undefined,
          postal_code: hq.postal_code as string | undefined,
          country: hq.country as string | undefined,
        })
      : undefined,
    employee_count_range: categorizeEmployeeCount(midpoint),
    founded_year: company.founded_year as number | undefined,
    logo_url: company.profile_pic_url as string | undefined,
  };
}
