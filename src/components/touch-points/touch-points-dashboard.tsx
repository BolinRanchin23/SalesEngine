"use client";

import { useRouter } from "next/navigation";
import { CompleteTaskDialog } from "./complete-task-dialog";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Task = {
  id: string;
  contact_id: string;
  contact_name: string;
  activity_type: string;
  due_date: string;
  program_name: string;
  status: string;
  label: string | null;
};

type Props = {
  tasks: Task[];
};

const ACTIVITY_TYPE_COLORS: Record<string, { variant: string; label: string }> =
  {
    call: { variant: "blue", label: "Call" },
    email: { variant: "green", label: "Email" },
    meeting: { variant: "purple", label: "Meeting" },
    coffee: { variant: "yellow", label: "Coffee" },
    lunch: { variant: "orange", label: "Lunch" },
    site_visit: { variant: "blue", label: "Site Visit" },
    gift: { variant: "red", label: "Gift" },
    handwritten_note: { variant: "purple", label: "Note" },
    social_media: { variant: "blue", label: "Social" },
    other: { variant: "default", label: "Other" },
  };

function getTimeBucket(
  dueDateStr: string
): "overdue" | "this_week" | "next_week" | "this_month" | "later" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dueDateStr + "T00:00:00");

  if (dueDate < today) return "overdue";

  // End of this week (Sunday)
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));

  if (dueDate <= endOfWeek) return "this_week";

  // End of next week
  const endOfNextWeek = new Date(endOfWeek);
  endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

  if (dueDate <= endOfNextWeek) return "next_week";

  // End of this month
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (dueDate <= endOfMonth) return "this_month";

  return "later";
}

const BUCKET_CONFIG: Record<
  string,
  { label: string; headerClass: string }
> = {
  overdue: {
    label: "Overdue",
    headerClass: "text-red-400",
  },
  this_week: {
    label: "This Week",
    headerClass: "text-amber-400",
  },
  next_week: {
    label: "Next Week",
    headerClass: "text-blue-400",
  },
  this_month: {
    label: "This Month",
    headerClass: "text-slate-300",
  },
  later: {
    label: "Later",
    headerClass: "text-slate-500",
  },
};

export function TouchPointsDashboard({ tasks }: Props) {
  const router = useRouter();

  // Group tasks by time bucket
  const buckets: Record<string, Task[]> = {
    overdue: [],
    this_week: [],
    next_week: [],
    this_month: [],
    later: [],
  };

  for (const task of tasks) {
    const bucket = getTimeBucket(task.due_date);
    buckets[bucket].push(task);
  }

  function handleDone() {
    router.refresh();
  }

  const bucketOrder = ["overdue", "this_week", "next_week", "this_month", "later"];

  return (
    <div className="space-y-8">
      {bucketOrder.map((bucketKey) => {
        const items = buckets[bucketKey];
        if (items.length === 0) return null;

        const config = BUCKET_CONFIG[bucketKey];

        return (
          <div key={bucketKey}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className={`text-lg font-semibold ${config.headerClass}`}>
                {config.label}
              </h2>
              <span className="text-xs text-slate-500 bg-slate-800 rounded-full px-2 py-0.5 border border-slate-700">
                {items.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((task) => {
                const typeConfig =
                  ACTIVITY_TYPE_COLORS[task.activity_type] ||
                  ACTIVITY_TYPE_COLORS.other;

                return (
                  <div
                    key={task.id}
                    className="bg-[#111827] rounded-xl border border-slate-800 p-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/contacts/${task.contact_id}`}
                          className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors truncate block"
                        >
                          {task.contact_name}
                        </Link>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {task.program_name}
                        </p>
                      </div>
                      <Badge variant={typeConfig.variant as "blue" | "green" | "purple" | "yellow" | "orange" | "red" | "default"}>
                        {typeConfig.label}
                      </Badge>
                    </div>

                    {task.label && (
                      <p className="text-sm text-slate-300 mb-2">
                        {task.label}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs ${
                          bucketKey === "overdue"
                            ? "text-red-400"
                            : "text-slate-500"
                        }`}
                      >
                        Due: {new Date(task.due_date + "T00:00:00").toLocaleDateString()}
                      </span>
                      <div className="flex gap-1.5">
                        <CompleteTaskDialog
                          taskId={task.id}
                          action="complete"
                          onDone={handleDone}
                        />
                        <CompleteTaskDialog
                          taskId={task.id}
                          action="skip"
                          onDone={handleDone}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-500 text-sm">No pending tasks.</p>
          <p className="text-slate-600 text-xs mt-1">
            Assign contacts to touch point programs to generate tasks.
          </p>
        </div>
      )}
    </div>
  );
}
