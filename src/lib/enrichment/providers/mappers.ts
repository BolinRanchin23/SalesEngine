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

function isRealHeadshot(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes('static.licdn.com/aero-v1/sc/h/')) return undefined;
  if (url.includes('static.licdn.com/sc/h/')) return undefined;
  return url;
}

export function mapApolloPersonToContact(
  person: Record<string, unknown>
): ContactEnrichmentData {
  const phones = (person.phone_numbers as Array<{ raw_number: string; type: string }>) ?? [];
  const workPhone = phones.find((p) => p.type === 'work_direct' || p.type === 'work_hq');
  const cellPhone = phones.find((p) => p.type === 'mobile');

  // Social profiles
  const socialProfiles: Record<string, string> = {};
  if (person.twitter_url) socialProfiles.twitter_url = person.twitter_url as string;
  if (person.facebook_url) socialProfiles.facebook_url = person.facebook_url as string;
  if (person.github_url) socialProfiles.github_url = person.github_url as string;

  // Employment history → work_history
  const employmentHistory = (person.employment_history as Array<Record<string, unknown>>) ?? [];
  const workHistory = employmentHistory.length > 0
    ? employmentHistory.map((exp) => ({
        company: { name: exp.organization_name as string | undefined },
        title: { name: exp.title as string | undefined },
        start_date: exp.start_date as string | undefined,
        end_date: exp.end_date as string | undefined,
        is_primary: exp.current as boolean | undefined,
      }))
    : undefined;

  // Personal emails
  const personalEmails: string[] = [];
  if (person.personal_emails && Array.isArray(person.personal_emails)) {
    personalEmails.push(...(person.personal_emails as string[]));
  }

  return {
    email: person.email as string | undefined,
    email_status: person.email_status as string | undefined,
    title: person.title as string | undefined,
    headline: person.headline as string | undefined,
    seniority: person.seniority as string | undefined,
    linkedin_url: person.linkedin_url as string | undefined,
    headshot_url: isRealHeadshot(person.photo_url as string | undefined),
    work_phone: workPhone?.raw_number,
    cell_phone: cellPhone?.raw_number,
    work_address: buildAddress({
      city: person.city as string | undefined,
      state: person.state as string | undefined,
      country: person.country as string | undefined,
    }),
    social_profiles: Object.keys(socialProfiles).length > 0 ? socialProfiles : undefined,
    work_history: workHistory,
    personal_emails: personalEmails.length > 0 ? personalEmails : undefined,
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

// ─── Bright Data Mappers ─────────────────────────────

export function mapBrightDataPersonToContact(
  person: Record<string, unknown>
): ContactEnrichmentData {
  const headshot = isRealHeadshot(person.avatar as string | undefined);

  // Current position from experience
  const experience = (person.experience as Array<Record<string, unknown>>) ?? [];
  const currentJob = experience.find((e) => !e.end_date) ?? experience[0];
  const title = (currentJob?.title as string | undefined) ?? (person.current_company_position as string | undefined);

  // Work history
  const workHistory = experience.map((exp) => ({
    company: { name: exp.company as string | undefined },
    title: { name: exp.title as string | undefined },
    start_date: exp.start_date as string | undefined,
    end_date: exp.end_date as string | undefined,
    description: exp.description as string | undefined,
    location: exp.location as string | undefined,
  }));

  // Education
  const educationRaw = (person.education as Array<Record<string, unknown>>) ?? [];
  const education = educationRaw.map((edu) => ({
    school: { name: edu.title as string | undefined },
    degrees: edu.degree ? [edu.degree as string] : undefined,
    majors: edu.field_of_study ? [edu.field_of_study as string] : undefined,
    start_date: edu.start_date as string | undefined,
    end_date: edu.end_date as string | undefined,
  }));

  // Certifications
  const certsRaw = (person.certifications as Array<Record<string, unknown>>) ?? [];
  const certifications = certsRaw.map((c) => c.name as string).filter(Boolean);

  // Languages
  const langsRaw = (person.languages as Array<string | Record<string, unknown>>) ?? [];
  const languages = langsRaw.map((l) =>
    typeof l === 'string' ? { name: l } : { name: l.title as string | undefined, proficiency: l.proficiency as string | undefined }
  );

  // Location
  const locationParts = [
    person.city as string | undefined,
    person.country_code as string | undefined,
  ].filter(Boolean);
  const workAddress = locationParts.length > 0 ? locationParts.join(', ') : undefined;

  // LinkedIn URL
  const linkedinUrl = person.url as string | undefined;

  // Skills
  const skillsRaw = (person.skills as Array<string | Record<string, unknown>>) ?? [];
  const skills = skillsRaw.map((s) => typeof s === 'string' ? s : (s.name as string)).filter(Boolean);

  // Headline
  const headline = person.headline as string | undefined;

  // Followers / Connections
  const followers = person.followers_count as number | undefined;
  const connections = person.connections_count as number | undefined;

  // Recommendations
  const recommendationsRaw = (person.recommendations as Array<Record<string, unknown>>) ?? [];
  const recommendations = recommendationsRaw.map((r) => ({
    author: r.author as string | undefined,
    text: r.text as string | undefined,
    relationship: r.relationship as string | undefined,
  }));

  // Volunteer Experience
  const volunteerRaw = (person.volunteer_experience as Array<Record<string, unknown>>) ?? [];
  const volunteerExperience = volunteerRaw.map((v) => ({
    organization: v.organization as string | undefined,
    role: v.role as string | undefined,
    cause: v.cause as string | undefined,
    start_date: v.start_date as string | undefined,
    end_date: v.end_date as string | undefined,
    description: v.description as string | undefined,
  }));

  // Publications
  const pubsRaw = (person.publications as Array<Record<string, unknown>>) ?? [];
  const publications = pubsRaw.map((p) => ({
    title: p.title as string | undefined,
    publisher: p.publisher as string | undefined,
    url: p.url as string | undefined,
    date: p.date as string | undefined,
    description: p.description as string | undefined,
  }));

  // Honors and Awards (from patents + honors_and_awards)
  const patentsRaw = (person.patents as Array<Record<string, unknown>>) ?? [];
  const honorsRaw = (person.honors_and_awards as Array<Record<string, unknown>>) ?? [];
  const honorsAndAwards = [
    ...honorsRaw.map((h) => ({
      title: h.title as string | undefined,
      issuer: h.issuer as string | undefined,
      date: h.date as string | undefined,
      description: h.description as string | undefined,
    })),
    ...patentsRaw.map((p) => ({
      title: p.title as string | undefined,
      issuer: 'Patent',
      date: p.date as string | undefined,
      description: p.description as string | undefined,
    })),
  ];

  // Projects
  const projectsRaw = (person.projects as Array<Record<string, unknown>>) ?? [];
  const projects = projectsRaw.map((p) => ({
    title: p.title as string | undefined,
    url: p.url as string | undefined,
    start_date: p.start_date as string | undefined,
    end_date: p.end_date as string | undefined,
    description: p.description as string | undefined,
  }));

  return {
    headshot_url: headshot,
    title,
    headline,
    bio: person.about as string | undefined,
    linkedin_url: linkedinUrl,
    work_address: workAddress,
    work_history: workHistory.length > 0 ? workHistory : undefined,
    education: education.length > 0 ? education : undefined,
    certifications: certifications.length > 0 ? certifications : undefined,
    languages: languages.length > 0 ? languages : undefined,
    skills: skills.length > 0 ? skills : undefined,
    followers: followers ?? undefined,
    connections: connections ?? undefined,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
    volunteer_experience: volunteerExperience.length > 0 ? volunteerExperience : undefined,
    publications: publications.length > 0 ? publications : undefined,
    honors_and_awards: honorsAndAwards.length > 0 ? honorsAndAwards : undefined,
    projects: projects.length > 0 ? projects : undefined,
  };
}

// ─── PDL Mappers ────────────────────────────────────

export function mapPdlPersonToContact(
  person: Record<string, unknown>
): ContactEnrichmentData {
  // Title from job_title field
  const title = person.job_title as string | undefined;

  // Email: first from emails array
  const emails = Array.isArray(person.emails) ? (person.emails as Array<{ address: string; type?: string }>) : [];
  const email = emails[0]?.address;

  // Personal emails (non-work)
  const personalEmails = emails
    .filter((e) => e.type === 'personal' || e.type === 'current_personal')
    .map((e) => e.address)
    .filter(Boolean);

  // Phone numbers
  const phoneNumbers = Array.isArray(person.phone_numbers) ? (person.phone_numbers as Array<{ number: string; type?: string }>) : [];
  const workPhone = phoneNumbers.find((p) => p.type === 'work')?.number;
  const cellPhone = phoneNumbers.find((p) => p.type === 'mobile' || p.type === 'personal')?.number ?? phoneNumbers[0]?.number;

  // LinkedIn URL
  const linkedinUrl = person.linkedin_url as string | undefined;

  // Work history from experience[]
  const experience = Array.isArray(person.experience) ? (person.experience as Array<Record<string, unknown>>) : [];
  const workHistory = experience.map((exp) => ({
    company: exp.company as Record<string, unknown> | undefined,
    title: exp.title as Record<string, unknown> | undefined,
    start_date: exp.start_date as string | undefined,
    end_date: exp.end_date as string | undefined,
    is_primary: exp.is_primary as boolean | undefined,
    summary: exp.summary as string | undefined,
  }));

  // Education
  const educationRaw = Array.isArray(person.education) ? (person.education as Array<Record<string, unknown>>) : [];
  const education = educationRaw.map((edu) => ({
    school: edu.school as Record<string, unknown> | undefined,
    degrees: edu.degrees as string[] | undefined,
    majors: edu.majors as string[] | undefined,
    start_date: edu.start_date as string | undefined,
    end_date: edu.end_date as string | undefined,
  }));

  // Skills
  const skills = Array.isArray(person.skills) ? (person.skills as string[]) : [];

  // Certifications
  const certifications = Array.isArray(person.certifications) ? (person.certifications as string[]) : [];

  // Languages
  const languagesRaw = Array.isArray(person.languages) ? (person.languages as Array<Record<string, unknown>>) : [];
  const languages = languagesRaw.length > 0 ? languagesRaw : [];

  // Location → work_address
  const locationParts = [
    person.location_locality as string | undefined,
    person.location_region as string | undefined,
    person.location_country as string | undefined,
  ].filter(Boolean);
  const workAddress = locationParts.length > 0 ? locationParts.join(', ') : undefined;

  // Seniority & department
  const seniority = person.job_title_role as string | undefined;
  const department = person.job_company_industry as string | undefined;

  // Social profiles
  const socialProfiles: Record<string, string> = {};
  if (person.twitter_url) socialProfiles.twitter_url = person.twitter_url as string;
  if (person.facebook_url) socialProfiles.facebook_url = person.facebook_url as string;
  if (person.github_url) socialProfiles.github_url = person.github_url as string;

  // Interests
  const interests = Array.isArray(person.interests) ? (person.interests as string[]) : [];

  // Inferred salary & years experience
  const inferredSalary = person.inferred_salary as string | undefined;
  const inferredYearsExperience = person.inferred_years_experience as number | undefined;

  // Headline
  const headline = person.headline as string | undefined;

  return {
    title,
    headline,
    email,
    work_phone: workPhone,
    cell_phone: cellPhone,
    linkedin_url: linkedinUrl,
    bio: person.summary as string | undefined,
    work_address: workAddress,
    work_history: workHistory,
    education,
    skills: skills.length > 0 ? skills : undefined,
    certifications: certifications.length > 0 ? certifications : undefined,
    languages: languages.length > 0 ? languages : undefined,
    seniority,
    department,
    pdl_id: person.id as string | undefined,
    social_profiles: Object.keys(socialProfiles).length > 0 ? socialProfiles : undefined,
    personal_emails: personalEmails.length > 0 ? personalEmails : undefined,
    interests: interests.length > 0 ? interests : undefined,
    inferred_salary: inferredSalary,
    inferred_years_experience: inferredYearsExperience,
  };
}
