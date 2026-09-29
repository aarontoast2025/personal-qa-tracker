import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCsv } from "@/lib/csv-parser";
import {
  syncAgents,
  syncAssignments,
  syncEvaluations,
  syncRubrics,
  syncRubricDescriptions,
  syncFeedbackTemplates,
} from "@/lib/google/sync-service";
import { fetchSheetCsv, fetchSheetValues, rowsToObjects } from "@/lib/google/sheets";
import fs from "fs";
import path from "path";

export async function GET() {
  const supabase = await createClient();

  const [
    { count: assignmentsCount },
    { count: evaluationsCount },
    { count: agentsCount },
    { count: rubricsCount },
    { data: lastLog },
    { data: settings },
  ] = await Promise.all([
    supabase.from("assignments").select("*", { count: "exact", head: true }),
    supabase.from("evaluations").select("*", { count: "exact", head: true }),
    supabase.from("agents").select("*", { count: "exact", head: true }),
    supabase.from("rubrics").select("*", { count: "exact", head: true }),
    supabase
      .from("sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("app_settings").select("*").limit(1).maybeSingle(),
  ]);

  return NextResponse.json({
    counts: {
      assignments: assignmentsCount || 0,
      evaluations: evaluationsCount || 0,
      agents: agentsCount || 0,
      rubrics: rubricsCount || 0,
    },
    lastLog,
    googleSheetId: settings?.google_sheet_id || "",
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // empty body
  }

  // Get sheetId from body or from app_settings
  let sheetId = body.sheetId?.trim();
  if (!sheetId) {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("google_sheet_id")
      .limit(1)
      .maybeSingle();
    sheetId = settings?.google_sheet_id;
  }

  const action = body.action || "sync-live";

  // 1. Seed from local CSV files
  if (action === "seed-csv") {
    try {
      const csvDir = path.join(process.cwd(), "CSV");
      if (!fs.existsSync(csvDir)) {
        return NextResponse.json(
          { error: "CSV directory not found on server." },
          { status: 400 }
        );
      }

      const results: Record<string, number> = {};

      // Seed Agents
      const agentsFile = path.join(csvDir, "Dev QA Tracker - Agents.csv");
      if (fs.existsSync(agentsFile)) {
        const rows = parseCsv(fs.readFileSync(agentsFile, "utf-8"));
        results.agents = await syncAgents(supabase, rows);
      }

      // Seed Rubrics
      const rubricsFile = path.join(csvDir, "Dev QA Tracker - Rubrics.csv");
      if (fs.existsSync(rubricsFile)) {
        const rows = parseCsv(fs.readFileSync(rubricsFile, "utf-8"));
        results.rubrics = await syncRubrics(supabase, rows);
      }

      // Seed Rubric Descriptions
      const rdFile = path.join(csvDir, "Dev QA Tracker - RubricDescriptions.csv");
      if (fs.existsSync(rdFile)) {
        const rows = parseCsv(fs.readFileSync(rdFile, "utf-8"));
        results.rubricDescriptions = await syncRubricDescriptions(supabase, rows);
      }

      // Seed Feedback Templates
      const ftFile = path.join(csvDir, "Dev QA Tracker - FeedbackTemplates.csv");
      if (fs.existsSync(ftFile)) {
        const rows = parseCsv(fs.readFileSync(ftFile, "utf-8"));
        results.feedbackTemplates = await syncFeedbackTemplates(supabase, rows);
      }

      // Seed Assignments
      const asgFile = path.join(csvDir, "Dev QA Tracker - Assignments.csv");
      if (fs.existsSync(asgFile)) {
        const rows = parseCsv(fs.readFileSync(asgFile, "utf-8"));
        results.assignments = await syncAssignments(supabase, rows);
      }

      // Seed Evaluations
      const evalFile = path.join(csvDir, "Dev QA Tracker - Evaluations.csv");
      if (fs.existsSync(evalFile)) {
        const rows = parseCsv(fs.readFileSync(evalFile, "utf-8"));
        results.evaluations = await syncEvaluations(supabase, rows);
      }

      await supabase.from("sync_logs").insert({
        user_id: user?.id || null,
        target_table: "all",
        rows_synced: Object.values(results).reduce((a, b) => a + b, 0),
        status: "success",
        completed_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Successfully seeded data from CSV files into Supabase.",
        counts: results,
      });
    } catch (err: any) {
      console.error("Seed error:", err);
      return NextResponse.json(
        { error: err.message || "Failed to seed CSV files." },
        { status: 500 }
      );
    }
  }

  // 2. Live Sync from Google Sheet
  if (!sheetId) {
    return NextResponse.json(
      { error: "No Google Sheet ID configured. Please enter your Google Sheet ID in Settings." },
      { status: 400 }
    );
  }

  try {
    const results: Record<string, number> = {};

    // Helper to fetch rows either via GViz CSV or Google API
    async function getTabRows(tabName: string): Promise<Record<string, string>[]> {
      try {
        return await fetchSheetCsv(sheetId, tabName);
      } catch (e) {
        const raw = await fetchSheetValues(sheetId, `${tabName}!A1:Z`);
        return rowsToObjects(raw);
      }
    }

    // 1. Sync Rubrics first (so foreign keys on assignments resolve cleanly)
    try {
      const rubrics = await getTabRows("Rubrics");
      if (rubrics.length > 0) {
        results.rubrics = await syncRubrics(supabase, rubrics);
      }
    } catch (e: any) {
      console.warn("Rubrics tab sync warning:", e.message);
    }

    // 2. Sync Agents
    try {
      const agents = await getTabRows("Agents");
      if (agents.length > 0) {
        results.agents = await syncAgents(supabase, agents);
      }
    } catch (e: any) {
      console.warn("Agents tab sync warning:", e.message);
    }

    // 3. Sync Assignments
    try {
      const assignments = await getTabRows("Assignments");
      if (assignments.length > 0) {
        results.assignments = await syncAssignments(supabase, assignments);
      }
    } catch (e: any) {
      console.warn("Assignments tab sync warning:", e.message);
    }

    // 4. Sync Evaluations (so Interaction IDs are all known)
    try {
      const evaluations = await getTabRows("Evaluations");
      if (evaluations.length > 0) {
        results.evaluations = await syncEvaluations(supabase, evaluations);
      }
    } catch (e: any) {
      console.warn("Evaluations tab sync warning:", e.message);
    }

    await supabase.from("sync_logs").insert({
      user_id: user?.id || null,
      target_table: "google_sheet",
      rows_synced: Object.values(results).reduce((a, b) => a + b, 0),
      status: "success",
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully fetched latest data from Google Sheet (${results.assignments || 0} assignments, ${results.evaluations || 0} evaluations).`,
      counts: results,
    });
  } catch (err: any) {
    console.error("Google Sheet Sync Error:", err);
    return NextResponse.json(
      {
        error:
          err.message ||
          "Failed to fetch data from Google Sheet. Please check your Google Sheet ID.",
      },
      { status: 500 }
    );
  }
}
