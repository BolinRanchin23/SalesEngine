/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { OpportunityForm } from "@/components/opportunity-form";
import Link from "next/link";

export default async function NewOpportunityPage() {
  const supabase = await createClient();

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
        href="/opportunities"
        className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block transition-colors"
      >
        &larr; Back to Opportunities
      </Link>

      <h1 className="text-2xl font-bold text-white mb-6">
        New Opportunity
      </h1>

      <OpportunityForm
        mode="create"
        stages={(stages as any[]) || []}
        properties={(properties as any[]) || []}
        companies={(companies as any[]) || []}
        contacts={(contacts as any[]) || []}
      />
    </div>
  );
}
