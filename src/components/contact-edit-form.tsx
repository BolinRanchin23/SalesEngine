'use client';

import { useState } from 'react';

type ContactData = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  work_phone: string | null;
  cell_phone: string | null;
  linkedin_url: string | null;
  work_address: string | null;
  home_address: string | null;
  delivery_address: string | null;
  bio: string | null;
  notes: string | null;
  relationship_notes: string | null;
  is_current_client: boolean;
  is_out_of_industry: boolean;
  assigned_to: string | null;
  headline: string | null;
};

export function ContactEditForm({
  contact,
  onClose,
}: {
  contact: ContactData;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    first_name: contact.first_name,
    last_name: contact.last_name,
    title: contact.title || '',
    headline: contact.headline || '',
    email: contact.email || '',
    work_phone: contact.work_phone || '',
    cell_phone: contact.cell_phone || '',
    linkedin_url: contact.linkedin_url || '',
    work_address: contact.work_address || '',
    home_address: contact.home_address || '',
    delivery_address: contact.delivery_address || '',
    notes: contact.notes || '',
    relationship_notes: contact.relationship_notes || '',
    is_current_client: contact.is_current_client,
    is_out_of_industry: contact.is_out_of_industry,
    assigned_to: contact.assigned_to || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.reload();
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none';
  const labelClass = 'text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 block';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 overflow-y-auto">
      <div className="bg-[#111827] rounded-xl border border-slate-800 p-6 w-full max-w-2xl mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Edit Contact</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First Name</label>
              <input className={inputClass} value={form.first_name} onChange={(e) => handleChange('first_name', e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <input className={inputClass} value={form.last_name} onChange={(e) => handleChange('last_name', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Title</label>
              <input className={inputClass} value={form.title} onChange={(e) => handleChange('title', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Headline</label>
              <input className={inputClass} value={form.headline} onChange={(e) => handleChange('headline', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Work Phone</label>
              <input className={inputClass} value={form.work_phone} onChange={(e) => handleChange('work_phone', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Cell Phone</label>
              <input className={inputClass} value={form.cell_phone} onChange={(e) => handleChange('cell_phone', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass}>LinkedIn URL</label>
            <input className={inputClass} value={form.linkedin_url} onChange={(e) => handleChange('linkedin_url', e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Work Address</label>
            <input className={inputClass} value={form.work_address} onChange={(e) => handleChange('work_address', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Home Address</label>
              <input className={inputClass} value={form.home_address} onChange={(e) => handleChange('home_address', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Delivery Address</label>
              <input className={inputClass} value={form.delivery_address} onChange={(e) => handleChange('delivery_address', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Assigned To</label>
            <input className={inputClass} value={form.assigned_to} onChange={(e) => handleChange('assigned_to', e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Relationship Notes</label>
            <textarea className={inputClass} rows={3} value={form.relationship_notes} onChange={(e) => handleChange('relationship_notes', e.target.value)} />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_current_client}
                onChange={(e) => handleChange('is_current_client', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Current Client</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_out_of_industry}
                onChange={(e) => handleChange('is_out_of_industry', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Out of Industry</span>
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
