'use client';

import { useState } from 'react';

type Props = {
  entityType: 'contact' | 'company';
  entityId: string;
};

export function EnrichmentTriggerButton({ entityType, entityId }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  async function handleEnrich(providers: string[]) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/enrichment/${entityType}/${entityId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers }),
      });
      const data = await res.json();
      if (data.ok) {
        const succeeded = data.results.filter((r: { success: boolean }) => r.success).length;
        setResult(`${succeeded}/${data.results.length} providers succeeded`);
        // Refresh after a short delay
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch {
      setResult('Network error');
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Enriching...' : 'Enrich Now'}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 py-1 min-w-[160px]">
          <button
            onClick={() => handleEnrich(['apollo'])}
            className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-slate-800 transition-colors"
          >
            Apollo
          </button>
          <button
            onClick={() => handleEnrich(['pdl'])}
            className="w-full text-left px-3 py-2 text-sm text-purple-400 hover:bg-slate-800 transition-colors"
          >
            PDL
          </button>
          {entityType === 'contact' && (
            <button
              onClick={() => handleEnrich(['zerobounce'])}
              className="w-full text-left px-3 py-2 text-sm text-emerald-400 hover:bg-slate-800 transition-colors"
            >
              ZeroBounce (Verify Email)
            </button>
          )}
          <div className="border-t border-slate-700 my-1" />
          <button
            onClick={() => handleEnrich(entityType === 'contact' ? ['apollo', 'pdl', 'zerobounce'] : ['apollo'])}
            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-800 transition-colors"
          >
            All Providers
          </button>
        </div>
      )}

      {result && (
        <p className="text-xs text-slate-400 mt-1">{result}</p>
      )}
    </div>
  );
}
