/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OpportunityForm } from "@/components/opportunity-form";
import Link from "next/link";

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: opportunity, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !opportunity) return notFound();

  const o = opportunity as any;

  const [
    { data: stages },
    { data: properties },
    { data: companies },
    { data: contacts },
  ] = await Promise.all([
    supabase
      .from("opportunity_stages")
      .select("id, name, position")
      .order("position"),
    supabase
      .from("properties")
      .select("id, name")
      .order("name"),
    supabase
      .from("companies")
      .select("id, name")
      .order("name"),
    supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .order("last_name"),
  ]);

  return (
    <div>
      <Link
        href={`/opportunities/${id}`}
        className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block transition-colors"
      >
        &larr; Back to Opportunity
      </Link>

      <h1 className="text-2xl font-bold text-white mb-6">
        Edit Opportunity
      </h1>

      <OpportunityForm
        mode="edit"
        opportunity={{
          id: o.id,
          name: o.name,
          stage_id: o.stage_id,
          property_id: o.property_id,
          company_id: o.company_id,
          primary_contact_id: o.primary_contact_id,
          estimated_cleanable_sqft: o.estimated_cleanable_sqft,
          possible_cleanable_sqft: o.possible_cleanable_sqft,
          estimated_value: o.estimated_value,
          close_date: o.close_date,
          probability: o.probability,
          next_steps: o.next_steps,
          notes: o.notes,
          source: o.source,
        }}
        stages={(stages as any[]) || []}
        properties={(properties as any[]) || []}
        companies={(companies as any[]) || []}
        contacts={(contacts as any[]) || []}
      />
    </div>
  );
}
