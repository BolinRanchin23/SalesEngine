import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params;
    const body = await request.json();
    const { steps } = body;

    if (!Array.isArray(steps)) {
      return NextResponse.json(
        { error: "Body must include a steps array" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify program exists
    const { data: program, error: progError } = await supabase
      .from("programs")
      .select("id")
      .eq("id", programId)
      .single();

    if (progError || !program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // Delete all existing steps for this program
    await supabase.from("program_steps").delete().eq("program_id", programId);

    // Insert new steps
    if (steps.length > 0) {
      const stepsToInsert = steps.map(
        (step: {
          position: number;
          activity_type: string;
          delay_days: number;
          label?: string | null;
        }) => ({
          program_id: programId,
          position: step.position,
          activity_type: step.activity_type,
          delay_days: step.delay_days,
          label: step.label || null,
        })
      );

      const { data: inserted, error: insertError } = await supabase
        .from("program_steps")
        .insert(stepsToInsert)
        .select();

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: inserted });
    }

    return NextResponse.json({ data: [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
