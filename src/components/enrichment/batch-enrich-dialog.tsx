'use client';

import { useState } from 'react';

export function BatchEnrichDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleBatchEnrich(provider: string, operation: string) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/enrichment/enqueue-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'contact',
          provider,
          operation,
          filter: { enrichment_status: 'pending', limit: 100 },
        }),
      });
      const data = await res.json();
      setResult(data.ok ? `Enqueued ${data.enqueued} contacts` : `Error: ${data.error}`);
    } catch {
      setResult('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmails() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/enrichment/enqueue-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'contact',
          provider: 'zerobounce',
          operation: 'verify_email',
          filter: { limit: 100 },
        }),
      });
      const data = await res.json();
      setResult(data.ok ? `Enqueued ${data.enqueued} verifications` : `Error: ${data.error}`);
    } catch {
      setResult('Network error');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Enrich All Pending
        </button>
        <button
          onClick={handleVerifyEmails}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Working...' : 'Verify All Emails'}
        </button>
        {result && <span className="text-sm text-slate-400 self-center">{result}</span>}
      </div>
    );
  }

  return (
    <div className="bg-[#111827] rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Batch Enrichment</h3>
        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-300 text-sm">
          Close
        </button>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Enqueue all pending contacts for enrichment. Choose a provider:
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleBatchEnrich('apollo', 'enrich_person')}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50"
        >
          Apollo
        </button>
        <button
          onClick={() => handleBatchEnrich('pdl', 'enrich_person')}
          disabled={loading}
          className="px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm rounded-lg hover:bg-purple-600/30 transition-colors disabled:opacity-50"
        >
          PDL
        </button>
        <button
          onClick={handleVerifyEmails}
          disabled={loading}
          className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
        >
          ZeroBounce (Verify)
        </button>
      </div>
      {loading && <p className="text-sm text-slate-500 mt-3">Processing...</p>}
      {result && <p className="text-sm text-slate-400 mt-3">{result}</p>}
    </div>
  );
}
