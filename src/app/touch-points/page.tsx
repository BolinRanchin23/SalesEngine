/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { TouchPointsDashboard } from "@/components/touch-points/touch-points-dashboard";
import Link from "next/link";

export default async function TouchPointsPage() {
  const supabase = await createClient();

  // Fetch all pending tasks with contact and program info
  const { data: rawTasks, error } = await supabase
    .from("touch_point_tasks")
    .select(
      "*, contact_programs(*, programs(name)), contacts:contact_id(id, first_name, last_name)"
    )
    .eq("status", "pending")
    .order("due_date", { ascending: true });

  if (error) {
    return (
      <div className="text-red-400">
        Error loading tasks: {error.message}
      </div>
    );
  }

  const tasks = (rawTasks || []).map((t: any) => ({
    id: t.id,
    contact_id: t.contact_id,
    contact_name: t.contacts
      ? `${t.contacts.first_name} ${t.contacts.last_name}`
      : "Unknown",
    activity_type: t.activity_type,
    label: t.label || null,
    due_date: t.due_date,
    program_name: t.contact_programs?.programs?.name || "Unknown",
    status: t.status,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Touch Points</h1>
          <p className="text-sm text-slate-500 mt-1">
            {tasks.length} pending task{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/touch-points/programs"
          className="px-4 py-2 text-sm font-medium bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
        >
          Manage Programs
        </Link>
      </div>

      <TouchPointsDashboard tasks={tasks} />
    </div>
  );
}
