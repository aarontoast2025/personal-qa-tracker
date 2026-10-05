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
    const qaEmail = (searchParams.get("qa_email") || "").trim().toLowerCase();

    const supabase = await createClient();

    // Query assignments and templates strictly for this specific QA email (no hardcoded aliases)
    const assignmentsPromise = qaEmail
      ? supabase
          .from("assignments")
          .select("*")
          .ilike("qa_email", qaEmail)
          .order("date", { ascending: false })
      : Promise.resolve({ data: [] as any[], error: null });

    const templatesPromise = qaEmail
      ? supabase
          .from("feedback_templates")
          .select("*")
          .ilike("created_by", qaEmail)
      : Promise.resolve({ data: [] as any[], error: null });

    // Fetch user settings, assignments, rubrics, and templates concurrently
    const [
      { data: settings },
      { data: assignments, error: asgErr },
      { data: rubrics, error: rubErr },
      { data: descriptions, error: descErr },
      { data: templates, error: tmplErr },
    ] = await Promise.all([
      supabase.from("app_settings").select("gemini_model, google_web_app_url").limit(1).maybeSingle(),
      assignmentsPromise,
      supabase.from("rubrics").select("*"),
      supabase.from("rubric_descriptions").select("*"),
      templatesPromise,
    ]);

    if (asgErr) console.warn("Bookmarklet init assignments warning:", asgErr.message);
    if (rubErr) console.warn("Bookmarklet init rubrics warning:", rubErr.message);
    if (tmplErr) console.warn("Bookmarklet init templates warning:", tmplErr.message);

    // Transform assignments for bookmarklet format
    const formattedAssignments = (assignments || []).map((a) => {
      let agentSnap = a.agent_snapshot;
      if (typeof agentSnap === "string") {
        try {
          agentSnap = JSON.parse(agentSnap);
        } catch {
          // ignore
        }
      }
      return {
        id: a.id,
        date: a.date,
        qaEmail: a.qa_email,
        agentEmail: a.agent_email,
        agentName: agentSnap?.displayName || agentSnap?.fullName || a.agent_email,
        agentSnapshot: agentSnap,
        rubricId: a.rubric_id,
        evaluationType: a.evaluation_type || "Manual Audit",
        status: a.status || "Pending",
      };
    });

    // Derive QA Name from explicit query parameter or email
    const reqName = searchParams.get("qa_name");
    const emailNamePart = qaEmail.split("@")[0] || "Evaluator";
    const qaDisplayName =
      reqName && reqName.trim()
        ? reqName.trim()
        : emailNamePart
            .split(".")
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(" ");

    const evalTypes = [
      "Manual Audit",
      "Validation Review",
      "Delphi Eval",
      "Chat",
      "New Hire",
    ];

    return NextResponse.json(
      {
        success: true,
        qa_name: qaDisplayName,
        qa_email: qaEmail,
        geminiModel: settings?.gemini_model || "gemini-2.5-flash",
        webAppUrl: settings?.google_web_app_url || "",
        assignments: formattedAssignments,
        rubrics: rubrics || [],
        rubricDescriptions: descriptions || [],
        feedbackTemplates: templates || [],
        evalTypes,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Bookmarklet init error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initialize bookmarklet data." },
      { status: 500, headers: corsHeaders }
    );
  }
}
