"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ProgramSelector } from "./program-selector";
import { CompleteTaskDialog } from "./complete-task-dialog";

type Program = {
  id: string;
  name: string;
};

type ActiveTask = {
  id: string;
  activity_type: string;
  label: string | null;
  due_date: string;
  status: string;
};

type ActiveAssignment = {
  id: string;
  program_id: string;
  program_name: string;
  current_step_position: number;
  is_active: boolean;
};

type Props = {
  contactId: string;
  programs: Program[];
  activeTasks: ActiveTask[];
  activeAssignment: ActiveAssignment | null;
};

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  call: "blue",
  email: "green",
  meeting: "purple",
  coffee: "yellow",
  lunch: "orange",
  site_visit: "blue",
  gift: "red",
  handwritten_note: "purple",
  social_media: "blue",
  other: "default",
};

export function ContactTouchPoints({
  contactId,
  programs,
  activeTasks,
  activeAssignment,
}: Props) {
  const router = useRouter();

  function handleDone() {
    router.refresh();
  }

  return (
    <div className="bg-[#111827] rounded-xl border border-slate-800 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Touch Points</h2>

      {/* Program assignment */}
      {activeAssignment && (
        <div className="mb-4 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Current Program</span>
            <Badge variant="blue">{activeAssignment.program_name}</Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Step {activeAssignment.current_step_position}
          </p>
        </div>
      )}

      {/* Program selector */}
      <div className="mb-4 pb-4 border-b border-slate-800">
        <ProgramSelector
          contactId={contactId}
          programs={programs}
          currentProgramId={activeAssignment?.program_id || null}
        />
      </div>

      {/* Active tasks */}
      {activeTasks.length > 0 ? (
        <div>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Upcoming Tasks
          </h3>
          <div className="space-y-3">
            {activeTasks.map((task) => {
              const variant = ACTIVITY_TYPE_COLORS[task.activity_type] || "default";
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dueDate = new Date(task.due_date + "T00:00:00");
              const isOverdue = dueDate < today;

              return (
                <div
                  key={task.id}
                  className="bg-slate-900/60 rounded-lg border border-slate-800 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={variant as "blue" | "green" | "purple" | "yellow" | "orange" | "red" | "default"}>
                      {task.activity_type.replace(/_/g, " ")}
                    </Badge>
                    <span
                      className={`text-xs ${
                        isOverdue ? "text-red-400" : "text-slate-500"
                      }`}
                    >
                      {dueDate.toLocaleDateString()}
                    </span>
                  </div>
                  {task.label && (
                    <p className="text-sm text-slate-300 mb-2">{task.label}</p>
                  )}
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
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-600 text-center py-4">
          No upcoming tasks.
          {!activeAssignment && " Assign a program to get started."}
        </p>
      )}
    </div>
  );
}
