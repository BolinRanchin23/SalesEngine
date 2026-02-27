'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ContactEditForm } from '@/components/contact-edit-form';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function ContactDetailClient({ contact }: { contact: any }) {
  const [showEdit, setShowEdit] = useState(false);
  const [toggling, setToggling] = useState(false);

  const c = contact;
  const company = c.companies as any;

  async function toggleClient() {
    setToggling(true);
    try {
      await fetch(`/api/contacts/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_current_client: !c.is_current_client }),
      });
      window.location.reload();
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <div className="bg-[#111827] rounded-xl border border-slate-800 p-6">
        <div className="flex items-start gap-4">
          {c.headshot_url && (
            <img src={c.headshot_url} alt={`${c.first_name} ${c.last_name}`} className="w-16 h-16 rounded-full object-cover ring-2 ring-slate-700" />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{c.first_name} {c.last_name}</h1>
                {c.headline && <p className="text-slate-300 mt-0.5">{c.headline}</p>}
                {c.title && <p className="text-slate-400 mt-0.5">{c.title}</p>}
                {company && <p className="text-slate-500 text-sm mt-1">{company.name}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={toggleClient}
                  disabled={toggling}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    c.is_current_client
                      ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {c.is_current_client ? 'Client' : 'Mark Client'}
                </button>
                <button
                  onClick={() => setShowEdit(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {c.is_current_client && <Badge variant="green">Current Client</Badge>}
              {c.is_out_of_industry && <Badge variant="yellow">Out of Industry</Badge>}
              <Badge variant={c.enrichment_status === "complete" ? "green" : c.enrichment_status === "partial" ? "yellow" : "default"}>
                {c.enrichment_status}
              </Badge>
              {c.enrichment_depth && c.enrichment_depth !== 'standard' && (
                <Badge variant={c.enrichment_depth === 'deep' ? "blue" : "default"}>
                  {c.enrichment_depth} enrichment
                </Badge>
              )}
              {c.source && <Badge>{c.source}</Badge>}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <ContactEditForm
          contact={c}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
