import { createAdminClient } from '@/lib/supabase/admin';
import { getBudgetStatus } from '@/lib/enrichment/budget';
import { QueueStatusCard } from '@/components/enrichment/queue-status-card';
import { CreditBudgetGauge } from '@/components/enrichment/credit-budget-gauge';
import { EnrichmentActivityFeed } from '@/components/enrichment/enrichment-activity-feed';
import { BatchEnrichDialog } from '@/components/enrichment/batch-enrich-dialog';

const card = "bg-[#111827] rounded-xl border border-slate-800 p-6";

export default async function EnrichmentDashboardPage() {
  const supabase = createAdminClient();

  // Parallel data fetching
  const [queueData, contactData, budgets, activityData] = await Promise.all([
    supabase.from('enrichment_queue').select('status'),
    supabase.from('contacts').select('enrichment_status'),
    getBudgetStatus(),
    supabase
      .from('enrichment_logs')
      .select('id, provider, request_type, status, credits_used, created_at, contact_id, company_id')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const queueCounts = { pending: 0, processing: 0, completed: 0, failed: 0 };
  for (const item of queueData.data ?? []) {
    const s = item.status as keyof typeof queueCounts;
    if (s in queueCounts) queueCounts[s]++;
  }

  const contactCounts = { pending: 0, partial: 0, complete: 0 };
  for (const item of contactData.data ?? []) {
    const s = item.enrichment_status as keyof typeof contactCounts;
    if (s in contactCounts) contactCounts[s]++;
  }

  const totalContacts = (contactData.data ?? []).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Enrichment Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated data enrichment via Apollo, PDL, and ZeroBounce
          </p>
        </div>
        <BatchEnrichDialog />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <QueueStatusCard counts={queueCounts} />
        <CreditBudgetGauge budgets={budgets} />
      </div>

      {/* Contact Enrichment Breakdown */}
      <div className={`${card} mb-6`}>
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Contact Enrichment Breakdown
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500">Complete</p>
            <p className="text-2xl font-bold text-emerald-400">{contactCounts.complete}</p>
            <p className="text-xs text-slate-600">
              {totalContacts > 0 ? `${Math.round((contactCounts.complete / totalContacts) * 100)}%` : '0%'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Partial</p>
            <p className="text-2xl font-bold text-amber-400">{contactCounts.partial}</p>
            <p className="text-xs text-slate-600">
              {totalContacts > 0 ? `${Math.round((contactCounts.partial / totalContacts) * 100)}%` : '0%'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-2xl font-bold text-slate-400">{contactCounts.pending}</p>
            <p className="text-xs text-slate-600">
              {totalContacts > 0 ? `${Math.round((contactCounts.pending / totalContacts) * 100)}%` : '0%'}
            </p>
          </div>
        </div>
        {totalContacts > 0 && (
          <div className="mt-4 h-2 rounded-full bg-slate-800 overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${(contactCounts.complete / totalContacts) * 100}%` }} />
            <div className="bg-amber-500 h-full" style={{ width: `${(contactCounts.partial / totalContacts) * 100}%` }} />
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className={card}>
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Recent Activity
        </h3>
        <EnrichmentActivityFeed activities={activityData.data ?? []} />
      </div>
    </div>
  );
}
