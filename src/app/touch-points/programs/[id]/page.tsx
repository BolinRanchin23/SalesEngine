/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProgramStepEditor } from "@/components/touch-points/program-step-editor";
import { ProgramEditForm } from "./program-edit-form";

const card = "bg-[#111827] rounded-xl border border-slate-800 p-6";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: program, error } = await supabase
    .from("programs")
    .select("*, program_steps(*)")
    .eq("id", id)
    .single();

  if (error || !program) return notFound();

  const p = program as any;

  // Sort steps by position
  const steps = Array.isArray(p.program_steps)
    ? [...p.program_steps].sort(
        (a: any, b: any) => a.position - b.position
      )
    : [];

  // Count active assignments
  const { count: assignmentCount } = await supabase
    .from("contact_programs")
    .select("id", { count: "exact", head: true })
    .eq("program_id", id)
    .eq("is_active", true);

  return (
    <div>
      <Link
        href="/touch-points/programs"
        className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block transition-colors"
      >
        &larr; Back to Programs
      </Link>

      <div className="space-y-6">
        {/* Program Header */}
        <div className={card}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{p.name}</h1>
              {p.description && (
                <p className="text-slate-400 mt-1">{p.description}</p>
              )}
              <div className="flex gap-2 mt-3">
                <Badge variant={p.is_active ? "green" : "default"}>
                  {p.is_active ? "Active" : "Inactive"}
                </Badge>
                {p.is_cycling && <Badge variant="purple">Cycling</Badge>}
                <Badge>
                  {steps.length} step{steps.length !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="blue">
                  {assignmentCount || 0} assigned
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Program Settings */}
        <div className={card}>
          <ProgramEditForm
            programId={id}
            initialName={p.name}
            initialDescription={p.description || ""}
            initialIsActive={p.is_active}
            initialIsCycling={p.is_cycling}
          />
        </div>

        {/* Steps Editor */}
        <div className={card}>
          <ProgramStepEditor
            programId={id}
            initialSteps={steps.map((s: any) => ({
              id: s.id,
              position: s.position,
              activity_type: s.activity_type,
              delay_days: s.delay_days,
              label: s.label,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
