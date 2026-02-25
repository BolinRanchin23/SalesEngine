import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import { EmailStatusBadge } from "@/components/enrichment/email-status-badge";

type ContactRow = {
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
};

export function ContactsTable({ contacts }: { contacts: ContactRow[] }) {
  if (contacts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No contacts found matching your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#111827]">
      <table className="min-w-full divide-y divide-slate-800">
        <thead>
          <tr className="bg-slate-900/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              Company
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              Email Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              Source
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              Score
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {contacts.map((contact) => {
            const score = contact.contact_scores?.[0]?.composite_score ?? null;
            const sourceLabel =
              contact.source === "airtable_people"
                ? "People"
                : contact.source === "airtable_community_partners"
                  ? "Community"
                  : contact.source || "\u2014";

            return (
              <tr
                key={contact.id}
                className="hover:bg-slate-800/40 transition-colors"
              >
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {contact.first_name} {contact.last_name}
                  </Link>
                  {contact.is_current_client && (
                    <Badge variant="green" className="ml-2">
                      Client
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">
                  {contact.title || "\u2014"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">
                  {contact.companies?.name || "\u2014"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 font-mono text-xs">
                  {contact.email || "\u2014"}
                </td>
                <td className="px-4 py-3 text-sm">
                  <EmailStatusBadge status={contact.email_status} />
                </td>
                <td className="px-4 py-3 text-sm">
                  <Badge>{sourceLabel}</Badge>
                </td>
                <td className="px-4 py-3 text-sm">
                  <Badge
                    variant={
                      contact.enrichment_status === "complete"
                        ? "green"
                        : contact.enrichment_status === "partial"
                          ? "yellow"
                          : "default"
                    }
                  >
                    {contact.enrichment_status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">
                  <ScoreBadge score={score} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
