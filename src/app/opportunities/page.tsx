/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { OpportunityBoard } from "@/components/opportunity-board";
import Link from "next/link";

export default async function OpportunitiesPage() {
  const supabase = await createClient();

  const { data: stages, error: stagesError } = await supabase
    .from("opportunity_stages")
    .select("*")
    .order("position");

  if (stagesError || !stages) {
    return (
      <div className="text-red-400">
        Error loading stages: {stagesError?.message || "Unknown error"}
      </div>
    );
  }

  const { data: opportunities, error: oppsError } = await supabase
    .from("opportunities")
    .select("*, companies(name), properties(name)")
    .order("created_at", { ascending: false });

  if (oppsError) {
    return (
      <div className="text-red-400">
        Error loading opportunities: {oppsError.message}
      </div>
    );
  }

  const stagesList = (stages as any[]).map((s: any) => ({
    id: s.id as string,
    name: s.name as string,
    color: s.color as string | null,
    position: s.position as number,
  }));

  const opportunitiesList = ((opportunities as any[]) || []).map((o: any) => ({
    id: o.id as string,
    name: o.name as string,
    stage_id: o.stage_id as string,
    estimated_value: o.estimated_value as number | null,
    close_date: o.close_date as string | null,
    company_name: (o.companies?.name as string) || null,
    property_name: (o.properties?.name as string) || null,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Opportunities</h1>
          <p className="text-sm text-slate-500 mt-1">
            {opportunitiesList.length} total opportunities
          </p>
        </div>
        <Link
          href="/opportunities/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Opportunity
        </Link>
      </div>

      <OpportunityBoard
        stages={stagesList}
        initialOpportunities={opportunitiesList}
      />
    </div>
  );
}
