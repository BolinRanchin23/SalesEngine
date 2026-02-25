"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const SOURCES = [
  { value: "", label: "All Sources" },
  { value: "airtable_companies", label: "Companies" },
  { value: "airtable_local_companies", label: "Local Companies" },
  { value: "apollo", label: "Apollo" },
  { value: "manual", label: "Manual" },
];

const inputClass =
  "px-3 py-1.5 text-sm border border-slate-700 rounded-lg bg-slate-900 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-colors";

export function CompanySearch() {
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
      router.push(`/companies?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <input
        type="text"
        placeholder="Search companies..."
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
    </div>
  );
}
