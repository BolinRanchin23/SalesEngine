import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { pipelineId, newStageId, verticalId } = await request.json();

  if (!pipelineId || !newStageId || !verticalId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("contact_pipeline")
    .update({
      pipeline_stage_id: newStageId,
      moved_at: new Date().toISOString(),
    })
    .eq("id", pipelineId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
