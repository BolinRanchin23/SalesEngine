import { Badge } from '@/components/ui/badge';

type ActivityItem = {
  id: string;
  provider: string;
  request_type: string | null;
  status: string | null;
  credits_used: number;
  created_at: string;
  contact_id: string | null;
  company_id: string | null;
};

const providerVariant: Record<string, 'blue' | 'purple' | 'green' | 'orange' | 'default'> = {
  apollo: 'blue',
  pdl: 'purple',
  brightdata: 'orange',
  zerobounce: 'green',
};

export function EnrichmentActivityFeed({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No enrichment activity yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((act) => (
        <div key={act.id} className="flex items-center gap-3 text-sm">
          <div className="flex-shrink-0">
            <Badge variant={providerVariant[act.provider] || 'default'}>
              {act.provider}
            </Badge>
          </div>
          <div className="flex-1 min-w-0 text-slate-400 truncate">
            {act.request_type?.replace(/_/g, ' ')}
            {act.credits_used > 0 && (
              <span className="text-slate-600 ml-1">({act.credits_used} cr)</span>
            )}
          </div>
          <Badge variant={act.status === 'success' ? 'green' : act.status === 'error' ? 'red' : 'yellow'}>
            {act.status}
          </Badge>
          <span className="text-xs text-slate-600 flex-shrink-0">
            {new Date(act.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
