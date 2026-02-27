"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  contactId: string;
  programs: { id: string; name: string }[];
  currentProgramId: string | null;
};

export function ProgramSelector({
  contactId,
  programs,
  currentProgramId,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentProgramId || "");
  const [loading, setLoading] = useState(false);

  async function handleAssign(programId: string) {
    if (!programId) return;
    setLoading(true);

    try {
      // If there is a current program, unassign first
      if (currentProgramId) {
        await fetch("/api/touch-points/unassign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: contactId,
            program_id: currentProgramId,
          }),
        });
      }

      // Assign the new program
      const res = await fetch("/api/touch-points/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          program_id: programId,
        }),
      });

      if (res.ok) {
        setSelected(programId);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUnassign() {
    if (!currentProgramId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/touch-points/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          program_id: currentProgramId,
        }),
      });

      if (res.ok) {
        setSelected("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
        Touch Point Program
      </label>
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => handleAssign(e.target.value)}
          disabled={loading}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
        >
          <option value="">No program assigned</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {currentProgramId && (
          <button
            onClick={handleUnassign}
            disabled={loading}
            className="px-3 py-2 text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/25 transition-colors disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
