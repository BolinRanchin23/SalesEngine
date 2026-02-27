/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const days = searchParams.get("days");
    const contactId = searchParams.get("contact_id");

    let query = supabase
      .from("touch_point_tasks")
      .select(
        "*, contact_programs(*, programs(name)), contacts:contact_id(id, first_name, last_name)"
      )
      .order("due_date", { ascending: true });

    if (status) {
      query = query.eq("status", status);
    }

    if (days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + parseInt(days, 10));
      query = query.lte("due_date", cutoff.toISOString().split("T")[0]);
    }

    if (contactId) {
      query = query.eq("contact_id", contactId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the response for convenience
    const tasks = (data || []).map((t: any) => ({
      id: t.id,
      contact_program_id: t.contact_program_id,
      program_step_id: t.program_step_id,
      contact_id: t.contact_id,
      contact_name: t.contacts
        ? `${t.contacts.first_name} ${t.contacts.last_name}`
        : "Unknown",
      activity_type: t.activity_type,
      label: t.label,
      due_date: t.due_date,
      status: t.status,
      notes: t.notes,
      completed_at: t.completed_at,
      skipped_at: t.skipped_at,
      activity_id: t.activity_id,
      program_name: t.contact_programs?.programs?.name || "Unknown",
    }));

    return NextResponse.json({ data: tasks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
