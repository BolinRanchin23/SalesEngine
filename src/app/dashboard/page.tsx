import { createClient } from "@/lib/supabase/server";
import { ContactsTable } from "@/components/contacts-table";
import { FilterBar } from "@/components/filter-bar";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const page = parseInt(params.page || "1", 10);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("contacts")
    .select("*, companies(*), contact_scores(*)", { count: "exact" })
    .order("last_name", { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (params.q) {
    query = query.or(
      `first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%,email.ilike.%${params.q}%`
    );
  }
  if (params.source) {
    query = query.eq("source", params.source);
  }
  if (params.enrichment) {
    query = query.eq("enrichment_status", params.enrichment);
  }
  if (params.client === "true") {
    query = query.eq("is_current_client", true);
  } else if (params.client === "false") {
    query = query.eq("is_current_client", false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, count, error } = await query as any;

  if (error) {
    return (
      <div className="text-red-400">
        Error loading contacts: {(error as { message: string }).message}
      </div>
    );
  }

  const contacts = (data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    title: string | null;
    email: string | null;
    source: string | null;
    enrichment_status: string;
    email_status: string | null;
    is_current_client: boolean;
    companies: { name: string } | null;
    contact_scores: Array<{ composite_score: number | null }>;
  }>;
  const totalPages = Math.ceil(((count as number) || 0) / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-sm text-slate-500 mt-1">
            {count as number} total contacts
          </p>
        </div>
      </div>

      <FilterBar />

      <ContactsTable contacts={contacts} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard?${new URLSearchParams({ ...params, page: String(page - 1) } as Record<string, string>).toString()}`}
                className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dashboard?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>).toString()}`}
                className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
