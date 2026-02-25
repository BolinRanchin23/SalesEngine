import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { variant: 'green' | 'red' | 'yellow' | 'default'; label: string }> = {
  valid: { variant: 'green', label: 'Verified' },
  invalid: { variant: 'red', label: 'Invalid' },
  'catch-all': { variant: 'yellow', label: 'Catch-all' },
  spamtrap: { variant: 'red', label: 'Spam Trap' },
  abuse: { variant: 'red', label: 'Abuse' },
  do_not_mail: { variant: 'red', label: 'Do Not Mail' },
  unknown: { variant: 'default', label: 'Unknown' },
};

export function EmailStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const config = statusConfig[status] || { variant: 'default' as const, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
