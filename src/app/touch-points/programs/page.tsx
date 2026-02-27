/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function ProgramsListPage() {
  const supabase = await createClient();

  const { data: programs, error } = await supabase
    .from("programs")
    .select("*, program_steps(id)")
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="text-red-400">
        Error loading programs: {error.message}
      </div>
    );
  }

  const rows = (programs || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    is_active: p.is_active,
    is_cycling: p.is_cycling,
    steps_count: Array.isArray(p.program_steps) ? p.program_steps.length : 0,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/touch-points"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              &larr; Touch Points
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">Programs</h1>
          <p className="text-sm text-slate-500 mt-1">
            {rows.length} program{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <NewProgramButton />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-[#111827] rounded-xl border border-slate-800">
          <p className="text-slate-500 text-sm">No programs yet.</p>
          <p className="text-slate-600 text-xs mt-1">
            Create your first touch point program to get started.
          </p>
        </div>
      ) : (
        <div className="bg-[#111827] rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                  Description
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Steps
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Cycling
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((program: any) => (
                <tr
                  key={program.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-200">
                      {program.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-slate-400 line-clamp-1">
                      {program.description || "--"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-slate-300">
                      {program.steps_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={program.is_active ? "green" : "default"}>
                      {program.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {program.is_cycling && (
                      <Badge variant="purple">Cycling</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/touch-points/programs/${program.id}`}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewProgramButton() {
  return (
    <Link
      href="/touch-points/programs/new"
      className="px-4 py-2 text-sm font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/25 transition-colors"
    >
      + New Program
    </Link>
  );
}
