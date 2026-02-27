"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type OpportunityFormProps = {
  mode: "create" | "edit";
  opportunity?: {
    id: string;
    name: string;
    stage_id: string;
    property_id: string | null;
    company_id: string | null;
    primary_contact_id: string | null;
    estimated_cleanable_sqft: string | null;
    possible_cleanable_sqft: string | null;
    estimated_value: number | null;
    close_date: string | null;
    probability: number | null;
    next_steps: string | null;
    notes: string | null;
    source: string | null;
  };
  stages: { id: string; name: string; position: number }[];
  properties: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  contacts: { id: string; first_name: string; last_name: string }[];
};

const inputClass =
  "w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder-slate-500";

const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabel = options.find((o) => o.id === value)?.label || "";

  return (
    <div className="relative">
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          type="text"
          className={inputClass}
          placeholder={placeholder || `Search ${label.toLowerCase()}...`}
          value={open ? search : selectedLabel}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          onBlur={() => {
            // Delay to allow click on option
            setTimeout(() => setOpen(false), 200);
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSearch("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
          >
            Clear
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">
              No results found
            </div>
          ) : (
            filtered.slice(0, 50).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-800 transition-colors ${
                  opt.id === value
                    ? "text-blue-400 bg-blue-500/10"
                    : "text-slate-300"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.id);
                  setSearch("");
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function OpportunityForm({
  mode,
  opportunity,
  stages,
  properties,
  companies,
  contacts,
}: OpportunityFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(opportunity?.name || "");
  const [stageId, setStageId] = useState(
    opportunity?.stage_id || stages[0]?.id || ""
  );
  const [propertyId, setPropertyId] = useState(
    opportunity?.property_id || ""
  );
  const [companyId, setCompanyId] = useState(
    opportunity?.company_id || ""
  );
  const [primaryContactId, setPrimaryContactId] = useState(
    opportunity?.primary_contact_id || ""
  );
  const [estimatedCleanableSqft, setEstimatedCleanableSqft] = useState(
    opportunity?.estimated_cleanable_sqft || ""
  );
  const [possibleCleanableSqft, setPossibleCleanableSqft] = useState(
    opportunity?.possible_cleanable_sqft || ""
  );
  const [estimatedValue, setEstimatedValue] = useState(
    opportunity?.estimated_value?.toString() || ""
  );
  const [closeDate, setCloseDate] = useState(
    opportunity?.close_date
      ? opportunity.close_date.substring(0, 10)
      : ""
  );
  const [probability, setProbability] = useState(
    opportunity?.probability ?? 50
  );
  const [nextSteps, setNextSteps] = useState(
    opportunity?.next_steps || ""
  );
  const [notes, setNotes] = useState(opportunity?.notes || "");
  const [source, setSource] = useState(opportunity?.source || "");

  const propertyOptions = properties.map((p) => ({
    id: p.id,
    label: p.name,
  }));
  const companyOptions = companies.map((c) => ({
    id: c.id,
    label: c.name,
  }));
  const contactOptions = contacts.map((c) => ({
    id: c.id,
    label: `${c.first_name} ${c.last_name}`,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!stageId) {
      setError("Stage is required.");
      return;
    }

    setSubmitting(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      stage_id: stageId,
      property_id: propertyId || null,
      company_id: companyId || null,
      primary_contact_id: primaryContactId || null,
      estimated_cleanable_sqft: estimatedCleanableSqft || null,
      possible_cleanable_sqft: possibleCleanableSqft || null,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      close_date: closeDate || null,
      probability,
      next_steps: nextSteps || null,
      notes: notes || null,
      source: source || null,
    };

    try {
      const url =
        mode === "create"
          ? "/api/opportunities"
          : `/api/opportunities/${opportunity!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save opportunity");
      }

      const result = await res.json();

      if (mode === "create") {
        router.push("/opportunities");
      } else {
        router.push(`/opportunities/${opportunity!.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-[#111827] rounded-xl border border-slate-800 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">
          Opportunity Details
        </h2>

        <div>
          <label className={labelClass}>
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Downtown Office Complex Cleaning"
            required
          />
        </div>

        <div>
          <label className={labelClass}>
            Stage <span className="text-red-400">*</span>
          </label>
          <select
            className={inputClass}
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            required
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <SearchableSelect
            label="Property"
            value={propertyId}
            onChange={setPropertyId}
            options={propertyOptions}
            placeholder="Search properties..."
          />

          <SearchableSelect
            label="Company"
            value={companyId}
            onChange={setCompanyId}
            options={companyOptions}
            placeholder="Search companies..."
          />
        </div>

        <SearchableSelect
          label="Primary Contact"
          value={primaryContactId}
          onChange={setPrimaryContactId}
          options={contactOptions}
          placeholder="Search contacts..."
        />

        <div>
          <label className={labelClass}>Source</label>
          <input
            type="text"
            className={inputClass}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g., Referral, Cold Outreach, Website"
          />
        </div>
      </div>

      <div className="bg-[#111827] rounded-xl border border-slate-800 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">
          Financials & Sizing
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Estimated Cleanable Sqft</label>
            <input
              type="text"
              className={inputClass}
              value={estimatedCleanableSqft}
              onChange={(e) => setEstimatedCleanableSqft(e.target.value)}
              placeholder="e.g., 50,000"
            />
          </div>

          <div>
            <label className={labelClass}>Possible Cleanable Sqft</label>
            <input
              type="text"
              className={inputClass}
              value={possibleCleanableSqft}
              onChange={(e) => setPossibleCleanableSqft(e.target.value)}
              placeholder="e.g., 75,000"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Estimated Value ($)</label>
            <input
              type="number"
              className={inputClass}
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="e.g., 120000"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className={labelClass}>Close Date</label>
            <input
              type="date"
              className={inputClass}
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Probability ({probability}%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={probability}
            onChange={(e) => setProbability(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] rounded-xl border border-slate-800 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">Notes</h2>

        <div>
          <label className={labelClass}>Next Steps</label>
          <textarea
            className={inputClass + " min-h-[80px] resize-y"}
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            placeholder="What needs to happen next?"
            rows={3}
          />
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            className={inputClass + " min-h-[100px] resize-y"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="General notes about this opportunity..."
            rows={4}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting
            ? "Saving..."
            : mode === "create"
              ? "Create Opportunity"
              : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
