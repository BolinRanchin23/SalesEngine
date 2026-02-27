import { NextRequest, NextResponse } from "next/server";
import { assignProgram } from "@/lib/touch-points";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contact_id, program_id } = body;

    if (!contact_id || !program_id) {
      return NextResponse.json(
        { error: "Missing required fields: contact_id, program_id" },
        { status: 400 }
      );
    }

    const result = await assignProgram(contact_id, program_id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
