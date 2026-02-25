/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { PipelineBoard } from "@/components/pipeline-board";

export default async function PipelinePage() {
  const supabase = await createClient();

  const { data: verticals } = await supabase
    .from("verticals")
    .select("*")
    .eq("is_active", true)
    .order("name");

  const creVertical = (verticals as any[])?.find(
    (v: any) => v.name === "Commercial Real Estate"
  );

  if (!creVertical) {
    return <div className="text-red-400">No active verticals found.</div>;
  }

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("vertical_id", creVertical.id)
    .order("position");

  if (!stages) return <div className="text-red-400">Error loading pipeline stages.</div>;

  const { data: pipelineContacts } = await supabase
    .from("contact_pipeline")
    .select("*, contacts(id, first_name, last_name, title, companies(name))")
    .eq("vertical_id", creVertical.id);

  // Transform to flat structure for client component
  const flatContacts = ((pipelineContacts as any[]) || []).map((pc: any) => ({
    id: pc.id,
    contact_id: pc.contacts?.id || "",
    pipeline_stage_id: pc.pipeline_stage_id,
    first_name: pc.contacts?.first_name || "",
    last_name: pc.contacts?.last_name || "",
    title: pc.contacts?.title || null,
    company_name: pc.contacts?.companies?.name || null,
  }));

  const stagesList = (stages as any[]).map((s: any) => ({
    id: s.id as string,
    name: s.name as string,
    color: s.color as string | null,
    position: s.position as number,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            {creVertical.name} &mdash; {flatContacts.length} contacts
          </p>
        </div>
      </div>

      <PipelineBoard
        stages={stagesList}
        initialContacts={flatContacts}
        verticalId={creVertical.id}
      />
    </div>
  );
}
