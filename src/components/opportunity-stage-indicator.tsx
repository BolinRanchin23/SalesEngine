"use client";

type Stage = {
  id: string;
  name: string;
  color: string;
  position: number;
};

export function OpportunityStageIndicator({
  stages,
  currentStageId,
}: {
  stages: Stage[];
  currentStageId: string;
}) {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  const currentIndex = sorted.findIndex((s) => s.id === currentStageId);

  return (
    <div className="flex items-center w-full">
      {sorted.map((stage, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isFuture = idx > currentIndex;

        return (
          <div
            key={stage.id}
            className="flex items-center flex-1 last:flex-initial"
          >
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                  isCurrent
                    ? "border-blue-500 bg-blue-500/20 text-blue-400"
                    : isCompleted
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                      : "border-slate-700 bg-slate-800 text-slate-600"
                }`}
                style={
                  isCurrent
                    ? { borderColor: stage.color, backgroundColor: stage.color + "30" }
                    : isCompleted
                      ? { borderColor: stage.color, backgroundColor: stage.color + "30" }
                      : undefined
                }
              >
                {isCompleted ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`mt-1.5 text-[10px] font-medium leading-tight text-center max-w-[60px] ${
                  isCurrent
                    ? "text-white"
                    : isCompleted
                      ? "text-slate-400"
                      : "text-slate-600"
                }`}
              >
                {stage.name}
              </span>
            </div>

            {/* Connector line */}
            {idx < sorted.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mt-[-16px] ${
                  isFuture ? "bg-slate-700" : "bg-slate-500"
                }`}
                style={
                  !isFuture
                    ? { backgroundColor: sorted[idx].color || "#6B7280" }
                    : undefined
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
