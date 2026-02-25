const card = "bg-[#111827] rounded-xl border border-slate-800 p-6";

type QueueCounts = {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
};

export function QueueStatusCard({ counts }: { counts: QueueCounts }) {
  const total = counts.pending + counts.processing + counts.completed + counts.failed;

  return (
    <div className={card}>
      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Queue Status</h3>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Pending" value={counts.pending} color="text-amber-400" />
        <Stat label="Processing" value={counts.processing} color="text-blue-400" />
        <Stat label="Completed" value={counts.completed} color="text-emerald-400" />
        <Stat label="Failed" value={counts.failed} color="text-red-400" />
      </div>
      {total > 0 && (
        <div className="mt-4 h-2 rounded-full bg-slate-800 overflow-hidden flex">
          {counts.completed > 0 && (
            <div className="bg-emerald-500 h-full" style={{ width: `${(counts.completed / total) * 100}%` }} />
          )}
          {counts.processing > 0 && (
            <div className="bg-blue-500 h-full" style={{ width: `${(counts.processing / total) * 100}%` }} />
          )}
          {counts.pending > 0 && (
            <div className="bg-amber-500 h-full" style={{ width: `${(counts.pending / total) * 100}%` }} />
          )}
          {counts.failed > 0 && (
            <div className="bg-red-500 h-full" style={{ width: `${(counts.failed / total) * 100}%` }} />
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
