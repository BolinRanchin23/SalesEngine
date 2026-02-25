"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const SOURCES = [
  { value: "", label: "All Sources" },
  { value: "airtable_people", label: "People" },
  { value: "airtable_community_partners", label: "Community Partners" },
  { value: "apollo", label: "Apollo" },
  { value: "manual", label: "Manual" },
];

const ENRICHMENT = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "complete", label: "Complete" },
];

const inputClass =
  "px-3 py-1.5 text-sm border border-slate-700 rounded-lg bg-slate-900 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-colors";

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <input
        type="text"
        placeholder="Search contacts..."
        defaultValue={searchParams.get("q") || ""}
        onChange={(e) => updateParam("q", e.target.value)}
        className={`${inputClass} w-64`}
      />
      <select
        defaultValue={searchParams.get("source") || ""}
        onChange={(e) => updateParam("source", e.target.value)}
        className={inputClass}
      >
        {SOURCES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        defaultValue={searchParams.get("enrichment") || ""}
        onChange={(e) => updateParam("enrichment", e.target.value)}
        className={inputClass}
      >
        {ENRICHMENT.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        defaultValue={searchParams.get("client") || ""}
        onChange={(e) => updateParam("client", e.target.value)}
        className={inputClass}
      >
        <option value="">All Contacts</option>
        <option value="true">Current Clients</option>
        <option value="false">Non-Clients</option>
      </select>
    </div>
  );
}
