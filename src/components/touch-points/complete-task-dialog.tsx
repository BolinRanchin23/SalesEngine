"use client";

import { useState } from "react";

type Props = {
  taskId: string;
  action: "complete" | "skip";
  onDone: () => void;
};

export function CompleteTaskDialog({ taskId, action, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const endpoint =
        action === "complete"
          ? `/api/touch-points/tasks/${taskId}/complete`
          : `/api/touch-points/tasks/${taskId}/skip`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || undefined }),
      });

      if (res.ok) {
        setOpen(false);
        setNotes("");
        onDone();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          action === "complete"
            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
        }`}
      >
        {action === "complete" ? "Complete" : "Skip"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] rounded-xl border border-slate-800 p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-1">
          {action === "complete" ? "Complete Task" : "Skip Task"}
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          {action === "complete"
            ? "Mark this task as completed. Optionally add notes."
            : "Skip this task and move to the next one. Optionally add notes."}
        </p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)..."
          rows={3}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 resize-none mb-4"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setOpen(false);
              setNotes("");
            }}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
              action === "complete"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
            }`}
          >
            {loading
              ? "Saving..."
              : action === "complete"
              ? "Complete"
              : "Skip"}
          </button>
        </div>
      </div>
    </div>
  );
}
