"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  programId: string;
  initialName: string;
  initialDescription: string;
  initialIsActive: boolean;
  initialIsCycling: boolean;
};

export function ProgramEditForm({
  programId,
  initialName,
  initialDescription,
  initialIsActive,
  initialIsCycling,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isCycling, setIsCycling] = useState(initialIsCycling);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/touch-points/programs/${programId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          is_active: isActive,
          is_cycling: isCycling,
        }),
      });

      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this program? This will remove all assignments and tasks.")) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/touch-points/programs/${programId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/touch-points/programs");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Settings</h2>

      {saved && (
        <div className="mb-4 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          Program updated successfully.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            placeholder="Optional description..."
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/40 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">Active</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isCycling}
              onChange={(e) => setIsCycling(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/40 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">Cycling</span>
            <span className="text-xs text-slate-600">
              (repeats from step 1 after last step)
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Program"}
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
