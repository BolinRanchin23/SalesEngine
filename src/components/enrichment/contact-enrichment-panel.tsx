import { Badge } from '@/components/ui/badge';
import { EmailStatusBadge } from './email-status-badge';
import { EnrichmentTriggerButton } from './enrichment-trigger-button';

type Props = {
  contactId: string;
  enrichmentStatus: string;
  emailStatus: string | null;
  emailVerifiedAt: string | null;
  lastEnrichedAt: string | null;
  provenance: Array<{
    id: string;
    field_name: string;
    provider: string;
    value: string | null;
    enriched_at: string;
  }>;
  logs: Array<{
    id: string;
    provider: string;
    request_type: string | null;
    status: string | null;
    credits_used: number;
    created_at: string;
  }>;
};

const card = "bg-[#111827] rounded-xl border border-slate-800 p-6";

export function ContactEnrichmentPanel({
  contactId,
  enrichmentStatus,
  emailStatus,
  emailVerifiedAt,
  lastEnrichedAt,
  provenance,
  logs,
}: Props) {
  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Enrichment</h2>
        <EnrichmentTriggerButton entityType="contact" entityId={contactId} />
      </div>

      {/* Status Overview */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Enrichment Status</span>
          <Badge
            variant={
              enrichmentStatus === 'complete' ? 'green' : enrichmentStatus === 'partial' ? 'yellow' : 'default'
            }
          >
            {enrichmentStatus}
          </Badge>
        </div>

        {emailStatus && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Email Status</span>
            <EmailStatusBadge status={emailStatus} />
          </div>
        )}

        {emailVerifiedAt && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Email Verified</span>
            <span className="text-xs text-slate-400">
              {new Date(emailVerifiedAt).toLocaleDateString()}
            </span>
          </div>
        )}

        {lastEnrichedAt && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Last Enriched</span>
            <span className="text-xs text-slate-400">
              {new Date(lastEnrichedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Field Provenance */}
      {provenance.length > 0 && (
        <div className="border-t border-slate-800 pt-4 mb-4">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Field Sources
          </h3>
          <div className="space-y-1.5">
            {provenance.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{p.field_name.replace(/_/g, ' ')}</span>
                <Badge
                  variant={
                    p.provider === 'apollo' ? 'blue' : p.provider === 'pdl' ? 'purple' : 'green'
                  }
                >
                  {p.provider}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Enrichment History */}
      {logs.length > 0 && (
        <div className="border-t border-slate-800 pt-4">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            History
          </h3>
          <div className="space-y-2">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-xs">
                <Badge
                  variant={
                    log.provider === 'apollo' ? 'blue' : log.provider === 'pdl' ? 'purple' : 'green'
                  }
                >
                  {log.provider}
                </Badge>
                <span className="text-slate-500 flex-1">{log.request_type?.replace(/_/g, ' ')}</span>
                <Badge variant={log.status === 'success' ? 'green' : 'red'}>{log.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
