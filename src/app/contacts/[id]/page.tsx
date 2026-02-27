/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import { ContactEnrichmentPanel } from "@/components/enrichment/contact-enrichment-panel";
import { ContactDetailClient } from "./contact-detail-client";

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

  const [
    { data: reverseRels },
    { data: enrichmentProvenance },
    { data: enrichmentLogs },
    { data: opportunities },
    { data: contactPrograms },
    { data: pendingTasks },
    { data: allPrograms },
  ] = await Promise.all([
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
    supabase
      .from("opportunity_contacts")
      .select("*, opportunities(id, name, estimated_value, opportunity_stages(name, color))")
      .eq("contact_id", id),
    supabase
      .from("contact_programs")
      .select("*, touch_point_programs(name)")
      .eq("contact_id", id)
      .eq("is_active", true),
    supabase
      .from("touch_point_tasks")
      .select("*, program_steps(label, activity_type)")
      .eq("contact_id", id)
      .eq("status", "pending")
      .order("due_date", { ascending: true })
      .limit(5),
    supabase.from("touch_point_programs").select("id, name").eq("is_active", true),
  ]);

  // Also check opportunities where this contact is the primary
  const { data: primaryOpps } = await supabase
    .from("opportunities")
    .select("id, name, estimated_value, opportunity_stages(name, color)")
    .eq("primary_contact_id", id);

  const company = c.companies as any;
  const workHistory = (c.work_history as any[]) ?? [];
  const education = (c.education as any[]) ?? [];
  const socialProfiles = (c.social_profiles as Record<string, string>) ?? {};
  const webResearch = (c.web_research as any[]) ?? [];
  const recommendations = (c.recommendations as any[]) ?? [];
  const volunteerExperience = (c.volunteer_experience as any[]) ?? [];
  const publications = (c.publications as any[]) ?? [];
  const honorsAndAwards = (c.honors_and_awards as any[]) ?? [];
  const projects = (c.projects as any[]) ?? [];

  // Merge opportunity lists (primary + additional)
  const allOpps = [
    ...(primaryOpps ?? []).map((o: any) => ({ ...o, role: 'Primary Contact' })),
    ...(opportunities ?? []).map((oc: any) => ({ ...oc.opportunities, role: oc.role || 'Contact' })),
  ];

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block transition-colors">
        &larr; Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Header with Edit Button */}
          <ContactDetailClient contact={c} />

          {/* Professional Profile */}
          {(c.headline || c.seniority || c.department || (c.skills && c.skills.length > 0) || (c.certifications && c.certifications.length > 0)) && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Professional Profile</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Headline" value={c.headline} />
                <Field label="Seniority" value={c.seniority} />
                <Field label="Department" value={c.department} />
                {c.inferred_salary && <Field label="Est. Salary" value={c.inferred_salary} />}
                {c.inferred_years_experience && <Field label="Years Experience" value={`${c.inferred_years_experience} years`} />}
              </dl>
              {c.skills && c.skills.length > 0 && (
                <div className="mt-4">
                  <dt className="text-xs font-medium text-slate-500 uppercase mb-2">Skills</dt>
                  <div className="flex flex-wrap gap-1.5">
                    {(c.skills as string[]).slice(0, 20).map((skill: string) => (
                      <span key={skill} className="text-xs px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-full">
                        {skill}
                      </span>
                    ))}
                    {c.skills.length > 20 && <span className="text-xs text-slate-500">+{c.skills.length - 20} more</span>}
                  </div>
                </div>
              )}
              {c.certifications && c.certifications.length > 0 && (
                <div className="mt-4">
                  <dt className="text-xs font-medium text-slate-500 uppercase mb-2">Certifications</dt>
                  <div className="flex flex-wrap gap-1.5">
                    {(c.certifications as string[]).map((cert: string) => (
                      <span key={cert} className="text-xs px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-full">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contact Details */}
          <div className={card}>
            <h2 className="text-lg font-semibold text-white mb-4">Contact Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" value={c.email ? (
                <span>
                  {c.email}
                  {c.email_status && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      c.email_status === 'valid' ? 'bg-emerald-500/10 text-emerald-400' :
                      c.email_status === 'invalid' ? 'bg-red-500/10 text-red-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    }`}>{c.email_status}</span>
                  )}
                </span>
              ) : null} />
              <Field label="Work Phone" value={c.work_phone} />
              <Field label="Cell Phone" value={c.cell_phone} />
              <Field label="LinkedIn" value={c.linkedin_url ? <a href={c.linkedin_url.startsWith('http') ? c.linkedin_url : `https://${c.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Profile</a> : null} />
              <Field label="Work Address" value={c.work_address} />
              <Field label="Home Address" value={c.home_address} />
              <Field label="Delivery Address" value={c.delivery_address} />
              <Field label="Assigned To" value={c.assigned_to} />
              {c.personal_emails && (c.personal_emails as string[]).length > 0 && (
                <Field label="Personal Emails" value={(c.personal_emails as string[]).join(', ')} />
              )}
            </dl>
          </div>

          {/* Social Profiles */}
          {Object.keys(socialProfiles).length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Social Profiles</h2>
              <div className="space-y-2">
                {socialProfiles.twitter_url && (
                  <a href={socialProfiles.twitter_url.startsWith('http') ? socialProfiles.twitter_url : `https://${socialProfiles.twitter_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                    <span className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center text-xs">X</span>
                    Twitter/X
                  </a>
                )}
                {socialProfiles.facebook_url && (
                  <a href={socialProfiles.facebook_url.startsWith('http') ? socialProfiles.facebook_url : `https://${socialProfiles.facebook_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                    <span className="w-5 h-5 rounded bg-blue-600/20 flex items-center justify-center text-xs">f</span>
                    Facebook
                  </a>
                )}
                {socialProfiles.github_url && (
                  <a href={socialProfiles.github_url.startsWith('http') ? socialProfiles.github_url : `https://${socialProfiles.github_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                    <span className="w-5 h-5 rounded bg-slate-600/40 flex items-center justify-center text-xs">G</span>
                    GitHub
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Work History */}
          {workHistory.length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Work History ({workHistory.length})</h2>
              <div className="space-y-4">
                {workHistory.map((job: any, i: number) => (
                  <div key={i} className="flex gap-3 pb-4 border-b border-slate-800 last:border-0 last:pb-0">
                    <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{job.title?.name || job.title || 'Unknown Title'}</p>
                      <p className="text-sm text-slate-400">{job.company?.name || job.company || 'Unknown Company'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {job.start_date || '?'} &mdash; {job.end_date || 'Present'}
                      </p>
                      {job.location && <p className="text-xs text-slate-600 mt-0.5">{job.location}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Education ({education.length})</h2>
              <div className="space-y-4">
                {education.map((edu: any, i: number) => (
                  <div key={i} className="flex gap-3 pb-4 border-b border-slate-800 last:border-0 last:pb-0">
                    <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-purple-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{edu.school?.name || edu.school || 'Unknown School'}</p>
                      {edu.degrees && (edu.degrees as string[]).length > 0 && <p className="text-sm text-slate-400">{(edu.degrees as string[]).join(', ')}</p>}
                      {edu.majors && (edu.majors as string[]).length > 0 && <p className="text-sm text-slate-500">{(edu.majors as string[]).join(', ')}</p>}
                      <p className="text-xs text-slate-500 mt-0.5">
                        {edu.start_date || '?'} &mdash; {edu.end_date || 'Present'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {c.bio && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-2">Bio</h2>
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{c.bio}</p>
            </div>
          )}

          {/* Personal Intel */}
          {((c.interests && c.interests.length > 0) || (c.languages && c.languages.length > 0) || volunteerExperience.length > 0 || recommendations.length > 0) && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Personal Intel</h2>
              {c.interests && c.interests.length > 0 && (
                <div className="mb-4">
                  <dt className="text-xs font-medium text-slate-500 uppercase mb-2">Interests</dt>
                  <div className="flex flex-wrap gap-1.5">
                    {(c.interests as string[]).map((interest: string) => (
                      <span key={interest} className="text-xs px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {c.languages && c.languages.length > 0 && (
                <div className="mb-4">
                  <dt className="text-xs font-medium text-slate-500 uppercase mb-2">Languages</dt>
                  <div className="flex flex-wrap gap-1.5">
                    {(c.languages as any[]).map((lang: any, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">
                        {lang.name || lang}{lang.proficiency ? ` (${lang.proficiency})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {volunteerExperience.length > 0 && (
                <div className="mb-4">
                  <dt className="text-xs font-medium text-slate-500 uppercase mb-2">Volunteer Experience</dt>
                  <div className="space-y-2">
                    {volunteerExperience.map((v: any, i: number) => (
                      <div key={i} className="text-sm">
                        <span className="text-slate-200">{v.role || 'Volunteer'}</span>
                        {v.organization && <span className="text-slate-400"> at {v.organization}</span>}
                        {v.cause && <span className="text-slate-500"> ({v.cause})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {recommendations.length > 0 && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase mb-2">Recommendations ({recommendations.length})</dt>
                  <div className="space-y-3">
                    {recommendations.slice(0, 3).map((rec: any, i: number) => (
                      <div key={i} className="text-sm border-l-2 border-slate-700 pl-3">
                        <p className="text-slate-300 italic">&ldquo;{typeof rec === 'string' ? rec : (rec.text || '')}&rdquo;</p>
                        {rec.author && <p className="text-slate-500 mt-1">&mdash; {rec.author}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Web Research */}
          {webResearch.length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Web Research ({webResearch.length})</h2>
              <div className="space-y-3">
                {webResearch.map((item: any, i: number) => (
                  <div key={i} className="pb-3 border-b border-slate-800 last:border-0 last:pb-0">
                    <div className="flex items-start gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5 ${
                        item.category === 'article' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                        item.category === 'press_release' ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' :
                        item.category === 'board_membership' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                        item.category === 'community' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
                        item.category === 'award' ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' :
                        'bg-slate-700 text-slate-300 border-slate-600'
                      }`}>
                        {item.category}
                      </span>
                      <div>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                          {item.title}
                        </a>
                        {item.snippet && <p className="text-xs text-slate-500 mt-0.5">{(item.snippet as string).replace(/<[^>]*>/g, '')}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publications & Awards */}
          {(publications.length > 0 || honorsAndAwards.length > 0 || projects.length > 0) && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Publications, Awards & Projects</h2>
              {publications.length > 0 && (
                <div className="mb-4">
                  <dt className="text-xs font-medium text-slate-500 uppercase mb-2">Publications</dt>
                  <div className="space-y-2">
                    {publications.map((pub: any, i: number) => (
                      <div key={i} className="text-sm">
                        <span className="text-slate-200">{pub.title}</span>
                        {pub.publisher && <span className="text-slate-500"> — {pub.publisher}</span>}
                        {pub.url && (
                          <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2 text-xs">
                            Link
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {honorsAndAwards.length > 0 && (
                <div className="mb-4">
                  <dt className="text-xs font-medium text-slate-500 uppercase mb-2">Honors & Awards</dt>
                  <div className="space-y-2">
                    {honorsAndAwards.map((award: any, i: number) => (
                      <div key={i} className="text-sm">
                        <span className="text-slate-200">{award.title}</span>
                        {award.issuer && <span className="text-slate-500"> — {award.issuer}</span>}
                        {award.date && <span className="text-slate-600"> ({award.date})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {projects.length > 0 && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase mb-2">Projects</dt>
                  <div className="space-y-2">
                    {projects.map((proj: any, i: number) => (
                      <div key={i} className="text-sm">
                        <span className="text-slate-200">{proj.title}</span>
                        {proj.description && <p className="text-slate-500 text-xs mt-0.5">{proj.description}</p>}
                        {proj.url && (
                          <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs">
                            Link
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

          {/* Opportunities */}
          {allOpps.length > 0 && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Opportunities ({allOpps.length})</h2>
              <div className="space-y-3">
                {allOpps.map((opp: any) => (
                  <Link key={opp.id} href={`/opportunities/${opp.id}`} className="block pb-3 border-b border-slate-800 last:border-0 last:pb-0 hover:opacity-80 transition-opacity">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200">{opp.name}</span>
                      <Badge>{opp.role}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {opp.opportunity_stages && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: (opp.opportunity_stages.color || '#6B7280') + '20', color: opp.opportunity_stages.color || '#6B7280' }}>
                          {opp.opportunity_stages.name}
                        </span>
                      )}
                      {opp.estimated_value && (
                        <span className="text-xs text-slate-500">${Number(opp.estimated_value).toLocaleString()}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Touch Points */}
          {((contactPrograms as any[])?.length > 0 || (pendingTasks as any[])?.length > 0) && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">Touch Points</h2>
              {(contactPrograms as any[])?.map((cp: any) => (
                <div key={cp.id} className="mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm text-slate-200">{cp.touch_point_programs?.name}</span>
                    <span className="text-xs text-slate-500">Step {cp.current_step_position}</span>
                  </div>
                </div>
              ))}
              {(pendingTasks as any[])?.length > 0 && (
                <div className="mt-3">
                  <dt className="text-xs font-medium text-slate-500 uppercase mb-2">Upcoming Tasks</dt>
                  <div className="space-y-2">
                    {(pendingTasks as any[]).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${
                            task.activity_type === 'call' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                            task.activity_type === 'email' ? 'bg-green-500/10 text-green-300 border-green-500/20' :
                            task.activity_type === 'meeting' ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' :
                            'bg-slate-700 text-slate-300 border-slate-600'
                          }`}>
                            {task.activity_type}
                          </span>
                          <span className="text-xs text-slate-400">{task.program_steps?.label}</span>
                        </div>
                        <span className="text-xs text-slate-500">{task.due_date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LinkedIn Stats */}
          {(c.followers || c.connections) && (
            <div className={card}>
              <h2 className="text-lg font-semibold text-white mb-4">LinkedIn Stats</h2>
              <dl className="space-y-2">
                {c.followers && <Field label="Followers" value={Number(c.followers).toLocaleString()} />}
                {c.connections && <Field label="Connections" value={Number(c.connections).toLocaleString()} />}
              </dl>
            </div>
          )}

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
