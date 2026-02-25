import { createAdminClient } from '@/lib/supabase/admin';

interface PriorityFactors {
  pipelineStage?: string;
  compositeScore?: number | null;
  isCurrentClient?: boolean;
  dataCompleteness?: number;
}

export function calculatePriority(factors: PriorityFactors): number {
  let priority = 50;

  // Pipeline stage boost
  const stageBoosts: Record<string, number> = {
    Pursuing: 30,
    Engaged: 25,
    Reviewed: 15,
    Enriched: 5,
    Discovered: 0,
  };
  if (factors.pipelineStage && stageBoosts[factors.pipelineStage] != null) {
    priority += stageBoosts[factors.pipelineStage];
  }

  // ICP score boost (0-100 → 0-20 points)
  if (factors.compositeScore != null) {
    priority += Math.round(factors.compositeScore / 5);
  }

  // Current client boost
  if (factors.isCurrentClient) {
    priority += 10;
  }

  // Lower completeness = higher enrichment priority
  if (factors.dataCompleteness != null) {
    priority += Math.round((1 - factors.dataCompleteness) * 10);
  }

  return Math.min(100, Math.max(0, priority));
}

export function calculateDataCompleteness(
  entity: Record<string, unknown>,
  fields: string[]
): number {
  const filled = fields.filter((f) => entity[f] != null && entity[f] !== '').length;
  return filled / fields.length;
}

const CONTACT_COMPLETENESS_FIELDS = [
  'email', 'title', 'linkedin_url', 'bio', 'headshot_url',
  'work_phone', 'cell_phone', 'work_address',
];

const COMPANY_COMPLETENESS_FIELDS = [
  'industry', 'website', 'phone', 'linkedin_url', 'description',
  'hq_address', 'employee_count_range', 'revenue_range',
];

export async function calculateContactPriority(contactId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data: contact } = await supabase
    .from('contacts')
    .select('*, contact_scores(composite_score), contact_pipeline(pipeline_stages(name))')
    .eq('id', contactId)
    .single();

  if (!contact) return 50;

  const c = contact as Record<string, unknown>;
  const scores = (c.contact_scores as Array<{ composite_score: number | null }>) ?? [];
  const pipelines = (c.contact_pipeline as Array<{ pipeline_stages: { name: string } | null }>) ?? [];

  return calculatePriority({
    pipelineStage: pipelines[0]?.pipeline_stages?.name,
    compositeScore: scores[0]?.composite_score,
    isCurrentClient: c.is_current_client as boolean,
    dataCompleteness: calculateDataCompleteness(c, CONTACT_COMPLETENESS_FIELDS),
  });
}

export async function calculateCompanyPriority(companyId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (!company) return 50;

  return calculatePriority({
    dataCompleteness: calculateDataCompleteness(
      company as Record<string, unknown>,
      COMPANY_COMPLETENESS_FIELDS
    ),
  });
}
