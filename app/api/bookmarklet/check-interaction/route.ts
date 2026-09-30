import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bookmarklet-Token",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interactionId = (searchParams.get("interaction_id") || "").trim();

    if (!interactionId) {
      return NextResponse.json(
        { exists: false, error: "Missing interaction_id parameter." },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createClient();

    const { data: existing, error } = await supabase
      .from("evaluations")
      .select("*")
      .eq("interaction_id", interactionId)
      .maybeSingle();

    if (error) {
      console.warn("Check interaction query warning:", error.message);
      return NextResponse.json(
        { exists: false, error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (existing) {
      let assignment = null;
      if (existing.assignment_id) {
        const { data: asg } = await supabase
          .from("assignments")
          .select("*")
          .eq("id", existing.assignment_id)
          .maybeSingle();
        assignment = asg;
      }

      return NextResponse.json(
        {
          exists: true,
          evaluation: existing,
          assignment,
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        exists: false,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Check interaction error:", error);
    return NextResponse.json(
      { exists: false, error: error.message || "Failed to check interaction." },
      { status: 500, headers: corsHeaders }
    );
  }
}
