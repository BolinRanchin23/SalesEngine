'use client';

import { useState } from 'react';

const PROVIDER_COLORS: Record<string, string> = {
  apollo: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pdl: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  brightdata: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  zerobounce: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  websearch: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const CATEGORY_LABELS: Record<string, string> = {
  contact: 'Contact Info',
  professional: 'Professional',
  history: 'History',
  personal: 'Personal',
  social: 'Social',
  achievements: 'Achievements',
  research: 'Research',
};

type FieldConfig = Record<string, unknown>;

export function FieldConfigTable({
  fields,
  grouped,
}: {
  fields: FieldConfig[];
  grouped: Record<string, FieldConfig[]>;
}) {
  const [toggleState, setToggleState] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    for (const f of fields) {
      state[f.id as string] = f.is_active as boolean;
    }
    return state;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleToggle(id: string) {
    setToggleState((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates = Object.entries(toggleState).map(([id, is_active]) => ({ id, is_active }));
      await fetch('/api/enrichment/field-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const categories = Object.keys(grouped);

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category} className="bg-[#111827] rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              {CATEGORY_LABELS[category] || category}
            </h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {(grouped[category] ?? []).map((field) => (
              <div key={field.id as string} className="px-6 py-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-200">
                      {field.display_name as string}
                    </span>
                    <span className="text-xs text-slate-600 font-mono">
                      {field.field_name as string}
                    </span>
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    {((field.provider_sources as string[]) ?? []).map((provider) => (
                      <span
                        key={provider}
                        className={`text-xs px-1.5 py-0.5 rounded border ${PROVIDER_COLORS[provider] || 'bg-slate-700 text-slate-300 border-slate-600'}`}
                      >
                        {provider}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(field.id as string)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    toggleState[field.id as string] ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      toggleState[field.id as string] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {saved && <span className="text-sm text-emerald-400">Saved successfully</span>}
      </div>
    </div>
  );
}
