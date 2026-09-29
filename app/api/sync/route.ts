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
import { fetchSheetValues, rowsToObjects } from "@/lib/google/sheets";
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

  const action = body.action || "sync-live";
  const sheetId = body.sheetId?.trim();

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
        user_email: user?.email || "system",
        target_table: "all",
        operation: "seed-csv",
        rows_affected: Object.values(results).reduce((a, b) => a + b, 0),
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
      { error: "Please provide a valid Google Sheet ID in Settings." },
      { status: 400 }
    );
  }

  try {
    const results: Record<string, number> = {};

    // Fetch and sync Assignments tab
    try {
      const rows = await fetchSheetValues(sheetId, "Assignments!A1:Z");
      const objects = rowsToObjects(rows);
      results.assignments = await syncAssignments(supabase, objects);
    } catch (err: any) {
      console.warn("Assignments sync warning:", err.message);
    }

    // Fetch and sync Evaluations tab
    try {
      const rows = await fetchSheetValues(sheetId, "Evaluations!A1:Z");
      const objects = rowsToObjects(rows);
      results.evaluations = await syncEvaluations(supabase, objects);
    } catch (err: any) {
      console.warn("Evaluations sync warning:", err.message);
    }

    // Fetch and sync Agents tab
    try {
      const rows = await fetchSheetValues(sheetId, "Agents!A1:Z");
      const objects = rowsToObjects(rows);
      results.agents = await syncAgents(supabase, objects);
    } catch (err: any) {
      console.warn("Agents sync warning:", err.message);
    }

    await supabase.from("sync_logs").insert({
      user_email: user?.email || "system",
      target_table: "google_sheet",
      operation: "pull",
      rows_affected: Object.values(results).reduce((a, b) => a + b, 0),
      status: "success",
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Successfully synced data from Google Sheets.",
      counts: results,
    });
  } catch (err: any) {
    console.error("Google Sheet Sync Error:", err);
    return NextResponse.json(
      {
        error:
          err.message ||
          "Failed to fetch data from Google Sheet. Please check credentials and Sheet permissions.",
      },
      { status: 500 }
    );
  }
}
