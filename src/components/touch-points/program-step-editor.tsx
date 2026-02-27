"use client";

import { useState } from "react";

type Step = {
  id: string;
  position: number;
  activity_type: string;
  delay_days: number;
  label: string | null;
};

type Props = {
  programId: string;
  initialSteps: Step[];
};

const ACTIVITY_TYPES = [
  "call",
  "email",
  "meeting",
  "coffee",
  "lunch",
  "site_visit",
  "gift",
  "handwritten_note",
  "social_media",
  "other",
];

export function ProgramStepEditor({ programId, initialSteps }: Props) {
  const [steps, setSteps] = useState<Step[]>(
    initialSteps.length > 0
      ? initialSteps
      : []
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addStep() {
    const maxPosition =
      steps.length > 0 ? Math.max(...steps.map((s) => s.position)) : 0;
    setSteps([
      ...steps,
      {
        id: `new-${Date.now()}`,
        position: maxPosition + 1,
        activity_type: "call",
        delay_days: 7,
        label: null,
      },
    ]);
    setSaved(false);
  }

  function removeStep(index: number) {
    const updated = steps.filter((_, i) => i !== index);
    // Re-number positions
    const renumbered = updated.map((s, i) => ({ ...s, position: i + 1 }));
    setSteps(renumbered);
    setSaved(false);
  }

  function updateStep(index: number, field: string, value: string | number) {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
    setSaved(false);
  }

  function moveStep(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === steps.length - 1) return;

    const updated = [...steps];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];

    // Re-number positions
    const renumbered = updated.map((s, i) => ({ ...s, position: i + 1 }));
    setSteps(renumbered);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const payload = steps.map((s) => ({
        position: s.position,
        activity_type: s.activity_type,
        delay_days: s.delay_days,
        label: s.label || null,
      }));

      const res = await fetch(
        `/api/touch-points/programs/${programId}/steps`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steps: payload }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setSteps(
            json.data.map((s: Step) => ({
              id: s.id,
              position: s.position,
              activity_type: s.activity_type,
              delay_days: s.delay_days,
              label: s.label,
            }))
          );
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Program Steps</h2>
        <div className="flex gap-2">
          <button
            onClick={addStep}
            className="px-3 py-1.5 text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/25 transition-colors"
          >
            + Add Step
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Steps"}
          </button>
        </div>
      </div>

      {saved && (
        <div className="mb-4 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          Steps saved successfully.
        </div>
      )}

      {steps.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">No steps defined yet.</p>
          <p className="text-xs mt-1">
            Click &quot;+ Add Step&quot; to start building this program.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="bg-slate-900/60 rounded-lg border border-slate-800 p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">
                  {step.position}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => moveStep(index, "up")}
                  disabled={index === 0}
                  className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
                  title="Move up"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => moveStep(index, "down")}
                  disabled={index === steps.length - 1}
                  className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
                  title="Move down"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => removeStep(index)}
                  className="p-1 text-red-400/60 hover:text-red-400 transition-colors"
                  title="Remove step"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Activity Type
                  </label>
                  <select
                    value={step.activity_type}
                    onChange={(e) =>
                      updateStep(index, "activity_type", e.target.value)
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Delay (days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={step.delay_days}
                    onChange={(e) =>
                      updateStep(
                        index,
                        "delay_days",
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={step.label || ""}
                    onChange={(e) => updateStep(index, "label", e.target.value)}
                    placeholder="Optional label..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
