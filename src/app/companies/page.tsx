import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { CompanySearch } from "@/components/company-search";
import type { Company } from "@/types/database";
import Link from "next/link";

export default async function CompaniesPage({
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
    .from("companies")
    .select("*", { count: "exact" })
    .order("name")
    .range(offset, offset + pageSize - 1);

  if (params.q) {
    query = query.ilike("name", `%${params.q}%`);
  }
  if (params.source) {
    query = query.eq("source", params.source);
  }

  const { data, count, error } = await query;

  if (error) {
    return (
      <div className="text-red-400">Error: {error.message}</div>
    );
  }

  const companies = (data ?? []) as Company[];
  const totalPages = Math.ceil(((count as number) || 0) / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <p className="text-sm text-slate-500 mt-1">
            {count} total companies
          </p>
        </div>
      </div>

      <CompanySearch />

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#111827]">
        <table className="min-w-full divide-y divide-slate-800">
          <thead>
            <tr className="bg-slate-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Website
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Address
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-slate-200">
                  {company.name}
                </td>
                <td className="px-4 py-3 text-sm">
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="text-slate-600">{"\u2014"}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">
                  {company.phone || <span className="text-slate-600">{"\u2014"}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">
                  {company.hq_address || <span className="text-slate-600">{"\u2014"}</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  <Badge>
                    {company.source === "airtable_companies"
                      ? "Companies"
                      : company.source === "airtable_local_companies"
                        ? "Local"
                        : company.source || "\u2014"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/companies?${new URLSearchParams({ ...params, page: String(page - 1) } as Record<string, string>).toString()}`}
                className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/companies?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>).toString()}`}
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
