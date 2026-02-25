/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import { ContactEnrichmentPanel } from "@/components/enrichment/contact-enrichment-panel";

const card = "bg-[#111827] rounded-xl border border-slate-800 p-6";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*, companies(*)")
    .eq("id", id)
    .single();

  if (error || !contact) return notFound();

  const c = contact as any;

  const [
    { data: scores },
    { data: activities },
    { data: relationships },
    { data: tags },
    { data: pipeline },
    { data: properties },
  ] = await Promise.all([
    supabase.from("contact_scores").select("*, verticals(name)").eq("contact_id", id),
    supabase.from("activities").select("*").eq("contact_id", id).order("activity_date", { ascending: false }),
    supabase.from("contact_relationships").select("*, related:related_contact_id(id, first_name, last_name, title)").eq("contact_id", id),
    supabase.from("contact_tags").select("*, tags(*)").eq("contact_id", id),
    supabase.from("contact_pipeline").select("*, pipeline_stages(name, color), verticals(name)").eq("contact_id", id),
    c.company_id
      ? supabase.from("properties").select("*").eq("company_id", c.company_id)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const [{ data: reverseRels }, { data: enrichmentProvenance }, { data: enrichmentLogs }] = await Promise.all([
    supabase
      .from("contact_relationships")
      .select("*, contact:contact_id(id, first_name, last_name, title)")
      .eq("related_contact_id", id),
    supabase
      .from("enrichment_field_provenance")
      .select("*")
      .eq("entity_type", "contact")
      .eq("entity_id", id)
      .order("enriched_at", { ascending: false }),
    supabase
      .from("enrichment_logs")
      .select("id, provider, request_type, status, credits_used, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const company = c.companies as any;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block transition-colors">
        &larr; Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className={card}>
            <div className="flex items-start gap-4">
              {c.headshot_url && (
                <img src={c.headshot_url} alt={`${c.first_name} ${c.last_name}`} className="w-16 h-16 rounded-full object-cover ring-2 ring-slate-700" />
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{c.first_name} {c.last_name}</h1>
                {c.title && <p className="text-slate-400 mt-1">{c.title}</p>}
                {company && <p className="text-slate-500 text-sm mt-1">{company.name}</p>}
                <div className="flex gap-2 mt-3">
                  {c.is_current_client && <Badge variant="green">Current Client</Badge>}
                  {c.is_out_of_industry && <Badge variant="yellow">Out of Industry</Badge>}
                  <Badge variant={c.enrichment_status === "complete" ? "green" : c.enrichment_status === "partial" ? "yellow" : "default"}>
                    {c.enrichment_status}
                  </Badge>
                  {c.source && <Badge>{c.source}</Badge>}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className={card}>
            <h2 className="text-lg font-semibold text-white mb-4">Contact Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" value={c.email} />
              <Field label="Work Phone" value={c.work_phone} />
              <Field label="Cell Phone" value={c.cell_phone} />
              <Field label="LinkedIn" value={c.linkedin_url ? <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Profile</a> : null} />
              <Field label="Work Address" value={c.work_address} />
              <Field label="Home Address" value={c.home_address} />
              <Field label="Delivery Address" value={c.delivery_address} />
              <Field label="Assigned To" value={c.assigned_to} />
            </dl>
          </div>

          {c.bio && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-2">Bio</h2>
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{c.bio}</p>
            </div>
          )}

          {c.notes && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-2">Notes</h2>
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{c.notes}</p>
            </div>
          )}

          {c.relationship_notes && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-2">Personal</h2>
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{c.relationship_notes}</p>
            </div>
          )}

          {/* Activity Timeline */}
          {activities && (activities as any[]).length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Activity ({(activities as any[]).length})</h2>
              <div className="space-y-4">
                {(activities as any[]).map((act: any) => (
                  <div key={act.id} className="flex gap-3 pb-4 border-b border-slate-800 last:border-0 last:pb-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-medium">
                      {(act.type as string).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200 capitalize">{(act.type as string).replace("_", " ")}</span>
                        {act.activity_date && <span className="text-xs text-slate-500">{act.activity_date}</span>}
                      </div>
                      {act.notes && <p className="text-sm text-slate-400 mt-1">{act.notes}</p>}
                      {act.created_by && <p className="text-xs text-slate-600 mt-1">by {act.created_by}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ContactEnrichmentPanel
            contactId={id}
            enrichmentStatus={c.enrichment_status}
            emailStatus={c.email_status ?? null}
            emailVerifiedAt={c.email_verified_at ?? null}
            lastEnrichedAt={c.last_enriched_at ?? null}
            provenance={(enrichmentProvenance as any[]) ?? []}
            logs={(enrichmentLogs as any[]) ?? []}
          />

          {scores && (scores as any[]).length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Scores</h2>
              {(scores as any[]).map((s: any) => (
                <div key={s.id} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{s.verticals?.name}</span>
                    <ScoreBadge score={s.composite_score} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {pipeline && (pipeline as any[]).length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Pipeline</h2>
              {(pipeline as any[]).map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 mb-2 last:mb-0">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.pipeline_stages?.color || "#6B7280" }} />
                  <span className="text-sm text-slate-300">{p.pipeline_stages?.name}</span>
                  <span className="text-xs text-slate-500 ml-auto">{p.verticals?.name}</span>
                </div>
              ))}
            </div>
          )}

          {tags && (tags as any[]).length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {(tags as any[]).map((t: any) => (
                  <Badge key={t.tag_id}>{t.tags?.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {company && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Company</h2>
              <dl className="space-y-2">
                <Field label="Name" value={company.name} />
                <Field label="Industry" value={company.industry} />
                <Field label="Website" value={company.website} />
                <Field label="Phone" value={company.phone} />
                <Field label="Address" value={company.hq_address} />
              </dl>
            </div>
          )}

          {((relationships && (relationships as any[]).length > 0) || (reverseRels && (reverseRels as any[]).length > 0)) && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Relationships</h2>
              <div className="space-y-2">
                {(relationships as any[])?.map((rel: any) => (
                  <div key={rel.id} className="flex items-center justify-between">
                    <Link href={`/contacts/${rel.related?.id}`} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                      {rel.related?.first_name} {rel.related?.last_name}
                    </Link>
                    <Badge>{rel.relationship_type}</Badge>
                  </div>
                ))}
                {(reverseRels as any[])?.map((rel: any) => {
                  const reverseType = rel.relationship_type === "assistant" ? "boss of" : rel.relationship_type === "boss" ? "assistant to" : rel.relationship_type;
                  return (
                    <div key={rel.id} className="flex items-center justify-between">
                      <Link href={`/contacts/${rel.contact?.id}`} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                        {rel.contact?.first_name} {rel.contact?.last_name}
                      </Link>
                      <Badge>{reverseType}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {properties && (properties as any[]).length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Properties ({(properties as any[]).length})</h2>
              <div className="space-y-3">
                {(properties as any[]).slice(0, 10).map((prop: any) => (
                  <div key={prop.id} className="border-b border-slate-800 pb-2 last:border-0">
                    <p className="text-sm font-medium text-slate-200">{prop.name}</p>
                    {prop.address && <p className="text-xs text-slate-500">{prop.address}</p>}
                    {prop.square_footage && <p className="text-xs text-slate-600">{prop.square_footage} SF</p>}
                  </div>
                ))}
                {(properties as any[]).length > 10 && (
                  <p className="text-xs text-slate-600">+{(properties as any[]).length - 10} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode | string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase">{label}</dt>
      <dd className="text-sm text-slate-200 mt-0.5 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
