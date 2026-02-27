'use client';

import { useState } from 'react';

type Props = {
  entityType: 'contact' | 'company';
  entityId: string;
};

type Depth = 'quick' | 'standard' | 'deep';

export function EnrichmentTriggerButton({ entityType, entityId }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  async function handleEnrich(providers: string[], depth?: Depth) {
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = depth ? { depth } : { providers };
      const res = await fetch(`/api/enrichment/${entityType}/${entityId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        const succeeded = data.results.filter((r: { success: boolean }) => r.success).length;
        setResult(`${succeeded}/${data.results.length} providers succeeded`);
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
        <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 py-1 min-w-[180px]">
          <div className="px-3 py-1.5 text-xs text-slate-500 uppercase tracking-wider">Depth</div>
          <button
            onClick={() => handleEnrich([], 'quick')}
            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Quick <span className="text-xs text-slate-500">Apollo only</span>
          </button>
          <button
            onClick={() => handleEnrich([], 'standard')}
            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Standard <span className="text-xs text-slate-500">All providers</span>
          </button>
          <button
            onClick={() => handleEnrich([], 'deep')}
            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Deep <span className="text-xs text-slate-500">+ Web Search</span>
          </button>

          <div className="border-t border-slate-700 my-1" />
          <div className="px-3 py-1.5 text-xs text-slate-500 uppercase tracking-wider">Individual</div>
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
            <>
              <button
                onClick={() => handleEnrich(['brightdata'])}
                className="w-full text-left px-3 py-2 text-sm text-orange-400 hover:bg-slate-800 transition-colors"
              >
                Bright Data
              </button>
              <button
                onClick={() => handleEnrich(['zerobounce'])}
                className="w-full text-left px-3 py-2 text-sm text-emerald-400 hover:bg-slate-800 transition-colors"
              >
                ZeroBounce
              </button>
              <button
                onClick={() => handleEnrich(['websearch'])}
                className="w-full text-left px-3 py-2 text-sm text-cyan-400 hover:bg-slate-800 transition-colors"
              >
                Web Search
              </button>
            </>
          )}
        </div>
      )}

      {result && (
        <p className="text-xs text-slate-400 mt-1">{result}</p>
      )}
    </div>
  );
}
