"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const card = "bg-[#111827] rounded-xl border border-slate-800 p-6";

export default function NewProgramPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isCycling, setIsCycling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/touch-points/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          is_active: isActive,
          is_cycling: isCycling,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        router.push(`/touch-points/programs/${json.data.id}`);
      } else {
        const json = await res.json();
        setError(json.error || "Failed to create program");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link
        href="/touch-points/programs"
        className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block transition-colors"
      >
        &larr; Back to Programs
      </Link>

      <h1 className="text-2xl font-bold text-white mb-6">New Program</h1>

      <div className={card}>
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., New Client Onboarding"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What is this program for?"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
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

          <div className="flex justify-end pt-2">
            <button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/25 transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Program"}
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 mt-4">
        After creating the program, you can add steps on the program detail
        page.
      </p>
    </div>
  );
}
