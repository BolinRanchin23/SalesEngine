const card = "bg-[#111827] rounded-xl border border-slate-800 p-6";

type Budget = {
  id: string;
  provider: string;
  period: string;
  budget_limit: number;
  credits_used: number;
};

export function CreditBudgetGauge({ budgets }: { budgets: Budget[] }) {
  const providers = ['apollo', 'pdl', 'zerobounce'] as const;
  const providerColors: Record<string, string> = {
    apollo: 'bg-blue-500',
    pdl: 'bg-purple-500',
    zerobounce: 'bg-emerald-500',
  };

  return (
    <div className={card}>
      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Credit Budgets</h3>
      <div className="space-y-4">
        {providers.map((provider) => {
          const daily = budgets.find((b) => b.provider === provider && b.period === 'daily');
          const monthly = budgets.find((b) => b.provider === provider && b.period === 'monthly');

          return (
            <div key={provider} className="space-y-2">
              <p className="text-sm font-medium text-slate-200 capitalize">{provider}</p>
              {daily && (
                <BudgetBar
                  label="Daily"
                  used={daily.credits_used}
                  limit={daily.budget_limit}
                  color={providerColors[provider]}
                />
              )}
              {monthly && (
                <BudgetBar
                  label="Monthly"
                  used={monthly.credits_used}
                  limit={monthly.budget_limit}
                  color={providerColors[provider]}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BudgetBar({
  label,
  used,
  limit,
  color,
}: {
  label: string;
  used: number;
  limit: number;
  color: string;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isHigh = pct > 80;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className={isHigh ? 'text-red-400' : ''}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isHigh ? 'bg-red-500' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
