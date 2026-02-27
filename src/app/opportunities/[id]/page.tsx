/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { OpportunityStageIndicator } from "@/components/opportunity-stage-indicator";

const card = "bg-[#111827] rounded-xl border border-slate-800 p-6";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: opportunity, error } = await supabase
    .from("opportunities")
    .select(
      "*, opportunity_stages(*), properties(*), companies(*), contacts(*), opportunity_contacts(*, contacts(*)), opportunity_activities(*)"
    )
    .eq("id", id)
    .single();

  if (error || !opportunity) return notFound();

  const o = opportunity as any;

  const { data: stages } = await supabase
    .from("opportunity_stages")
    .select("id, name, color, position")
    .order("position");

  const stage = o.opportunity_stages as any;
  const property = o.properties as any;
  const company = o.companies as any;
  const primaryContact = o.contacts as any;
  const oppContacts = ((o.opportunity_contacts as any[]) || []).map(
    (oc: any) => oc.contacts
  ).filter(Boolean);
  const activities = ((o.opportunity_activities as any[]) || []).sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const stagesList = ((stages as any[]) || []).map((s: any) => ({
    id: s.id as string,
    name: s.name as string,
    color: (s.color as string) || "#6B7280",
    position: s.position as number,
  }));

  const isWon = !!o.won_date;
  const isLost = !!o.lost_date;

  return (
    <div>
      <Link
        href="/opportunities"
        className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block transition-colors"
      >
        &larr; Back to Opportunities
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className={card}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-white">{o.name}</h1>
                  {stage && (
                    <Badge
                      variant={
                        isWon
                          ? "green"
                          : isLost
                            ? "red"
                            : "blue"
                      }
                    >
                      {isWon ? "Won" : isLost ? "Lost" : stage.name}
                    </Badge>
                  )}
                </div>
                {property && (
                  <p className="text-slate-400 text-sm">{property.name}</p>
                )}
                {company && (
                  <p className="text-slate-500 text-sm">{company.name}</p>
                )}
                {o.source && (
                  <div className="mt-2">
                    <Badge>{o.source}</Badge>
                  </div>
                )}
              </div>
              <Link
                href={`/opportunities/${id}/edit`}
                className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Edit
              </Link>
            </div>
          </div>

          {/* Notes */}
          {o.notes && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-2">Notes</h2>
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                {o.notes}
              </p>
            </div>
          )}

          {/* Next Steps */}
          {o.next_steps && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-2">
                Next Steps
              </h2>
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                {o.next_steps}
              </p>
            </div>
          )}

          {/* Activity Timeline */}
          {activities.length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">
                Activity ({activities.length})
              </h2>
              <div className="space-y-4">
                {activities.map((act: any) => (
                  <div
                    key={act.id}
                    className="flex gap-3 pb-4 border-b border-slate-800 last:border-0 last:pb-0"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-medium">
                      {act.type === "stage_change"
                        ? "S"
                        : act.type === "note"
                          ? "N"
                          : (act.type as string).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200 capitalize">
                          {(act.type as string).replace(/_/g, " ")}
                        </span>
                        {act.created_at && (
                          <span className="text-xs text-slate-500">
                            {formatDate(act.created_at)}
                          </span>
                        )}
                      </div>
                      {act.description && (
                        <p className="text-sm text-slate-400 mt-1">
                          {act.description}
                        </p>
                      )}
                      {act.created_by && (
                        <p className="text-xs text-slate-600 mt-1">
                          by {act.created_by}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Stage Indicator */}
          {stagesList.length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">
                Pipeline Stage
              </h2>
              <OpportunityStageIndicator
                stages={stagesList}
                currentStageId={o.stage_id}
              />
            </div>
          )}

          {/* Deal Details */}
          <div className={card}>
            <h2 className="text-lg font-semibold text-white mb-4">
              Deal Details
            </h2>
            <dl className="space-y-3">
              {o.estimated_value != null && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">
                    Estimated Value
                  </dt>
                  <dd className="text-sm text-emerald-400 font-semibold mt-0.5">
                    {formatCurrency(o.estimated_value)}
                  </dd>
                </div>
              )}
              {o.probability != null && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">
                    Probability
                  </dt>
                  <dd className="mt-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${o.probability}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-300 font-medium">
                        {o.probability}%
                      </span>
                    </div>
                  </dd>
                </div>
              )}
              {o.estimated_cleanable_sqft && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">
                    Est. Cleanable Sqft
                  </dt>
                  <dd className="text-sm text-slate-200 mt-0.5">
                    {o.estimated_cleanable_sqft}
                  </dd>
                </div>
              )}
              {o.possible_cleanable_sqft && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">
                    Possible Cleanable Sqft
                  </dt>
                  <dd className="text-sm text-slate-200 mt-0.5">
                    {o.possible_cleanable_sqft}
                  </dd>
                </div>
              )}
              {o.close_date && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">
                    Close Date
                  </dt>
                  <dd className="text-sm text-slate-200 mt-0.5">
                    {formatDate(o.close_date)}
                  </dd>
                </div>
              )}
              {o.won_date && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">
                    Won Date
                  </dt>
                  <dd className="text-sm text-emerald-400 mt-0.5">
                    {formatDate(o.won_date)}
                  </dd>
                </div>
              )}
              {o.lost_date && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">
                    Lost Date
                  </dt>
                  <dd className="text-sm text-red-400 mt-0.5">
                    {formatDate(o.lost_date)}
                  </dd>
                </div>
              )}
              {o.lost_reason && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">
                    Lost Reason
                  </dt>
                  <dd className="text-sm text-slate-300 mt-0.5">
                    {o.lost_reason}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Contacts */}
          <div className={card}>
            <h2 className="text-lg font-semibold text-white mb-4">
              Contacts
            </h2>
            {primaryContact && (
              <div className="mb-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/contacts/${primaryContact.id}`}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {primaryContact.first_name} {primaryContact.last_name}
                  </Link>
                  <Badge variant="blue">Primary</Badge>
                </div>
                {primaryContact.title && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {primaryContact.title}
                  </p>
                )}
                {primaryContact.email && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    {primaryContact.email}
                  </p>
                )}
              </div>
            )}
            {oppContacts.length > 0 && (
              <div className="space-y-2">
                {oppContacts
                  .filter(
                    (c: any) => !primaryContact || c.id !== primaryContact.id
                  )
                  .map((c: any) => (
                    <div key={c.id}>
                      <Link
                        href={`/contacts/${c.id}`}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {c.first_name} {c.last_name}
                      </Link>
                      {c.title && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.title}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
            {!primaryContact && oppContacts.length === 0 && (
              <p className="text-sm text-slate-600">No contacts linked.</p>
            )}
          </div>

          {/* Company */}
          {company && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">
                Company
              </h2>
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">
                    Name
                  </dt>
                  <dd className="text-sm text-slate-200 mt-0.5">
                    {company.name}
                  </dd>
                </div>
                {company.industry && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">
                      Industry
                    </dt>
                    <dd className="text-sm text-slate-200 mt-0.5">
                      {company.industry}
                    </dd>
                  </div>
                )}
                {company.website && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">
                      Website
                    </dt>
                    <dd className="text-sm mt-0.5">
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    </dd>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">
                      Phone
                    </dt>
                    <dd className="text-sm text-slate-200 mt-0.5">
                      {company.phone}
                    </dd>
                  </div>
                )}
                {company.hq_address && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">
                      Address
                    </dt>
                    <dd className="text-sm text-slate-200 mt-0.5">
                      {company.hq_address}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Quick Actions */}
          {!isWon && !isLost && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">
                Quick Actions
              </h2>
              <div className="flex gap-2">
                <WonLostButton
                  opportunityId={id}
                  action="won"
                />
                <WonLostButton
                  opportunityId={id}
                  action="lost"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WonLostButton({
  opportunityId,
  action,
}: {
  opportunityId: string;
  action: "won" | "lost";
}) {
  const isWon = action === "won";

  return (
    <form
      action={async () => {
        "use server";
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();

        const field = isWon ? "won_date" : "lost_date";
        await supabase
          .from("opportunities")
          .update({
            [field]: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", opportunityId);

        const { redirect } = await import("next/navigation");
        redirect(`/opportunities/${opportunityId}`);
      }}
    >
      <button
        type="submit"
        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
          isWon
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
            : "bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25"
        }`}
      >
        {isWon ? "Mark Won" : "Mark Lost"}
      </button>
    </form>
  );
}
