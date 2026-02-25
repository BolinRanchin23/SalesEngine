"use client";

import { cn } from "@/lib/utils";

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <span className="text-xs text-slate-600 italic">No score</span>
    );
  }

  const color =
    score >= 80
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : score >= 60
        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
        : score >= 40
          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
          : "bg-slate-800 text-slate-400 border-slate-700";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums border",
        color
      )}
    >
      {Math.round(score)}
    </span>
  );
}
