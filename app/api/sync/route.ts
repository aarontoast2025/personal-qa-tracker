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
import { getWebAppConfig, fetchInitDataFromWebApp } from "@/lib/google/web-app-client";
import fs from "fs";
import path from "path";

export async function GET() {
  const supabase = await createClient();

  const [
    { count: assignmentsCount },
    { count: evaluationsCount },
    { count: agentsCount },
    { count: rubricsCount },
    { count: feedbackTemplatesCount },
    { count: rubricDescriptionsCount },
    { data: lastLog },
    { data: settings },
  ] = await Promise.all([
    supabase.from("assignments").select("*", { count: "exact", head: true }),
    supabase.from("evaluations").select("*", { count: "exact", head: true }),
    supabase.from("agents").select("*", { count: "exact", head: true }),
    supabase.from("rubrics").select("*", { count: "exact", head: true }),
    supabase.from("feedback_templates").select("*", { count: "exact", head: true }),
    supabase.from("rubric_descriptions").select("*", { count: "exact", head: true }),
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
      feedbackTemplates: feedbackTemplatesCount || 0,
      rubricDescriptions: rubricDescriptionsCount || 0,
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
    const config = await getWebAppConfig(supabase);
    const qaEmail = body.qaEmail || user?.email || "";

    // 0. Primary Bridge: Use browser-provided initData (fetched via JSONP with Toast SSO cookies)
    //    Only fall back to server-side fetch if browser didn't provide data
    let webAppInitData: any = body.initData || null;
    if (!webAppInitData && config.url) {
      try {
        webAppInitData = await fetchInitDataFromWebApp(config, qaEmail);
      } catch (gasErr: any) {
        console.warn("Google Apps Script Web App server-side fetch failed (expected for Toast domain-restricted sheets):", gasErr.message);
      }
    }

    // Helper to fetch rows either via GViz CSV or Google API with multiple tab name variations
    async function getTabRows(tabNames: string | string[]): Promise<Record<string, string>[]> {
      const names = Array.isArray(tabNames) ? tabNames : [tabNames];
      for (const name of names) {
        try {
          const rows = await fetchSheetCsv(sheetId, name);
          if (rows && rows.length > 0) return rows;
        } catch (e) {
          try {
            const raw = await fetchSheetValues(sheetId, `${name}!A1:Z`);
            const rows = rowsToObjects(raw);
            if (rows && rows.length > 0) return rows;
          } catch (err) {
            // try next variation
          }
        }
      }
      return [];
    }

    // 1. Sync Rubrics first
    if (webAppInitData?.rubrics && Array.isArray(webAppInitData.rubrics) && webAppInitData.rubrics.length > 0) {
      try {
        results.rubrics = await syncRubrics(supabase, webAppInitData.rubrics);
      } catch (e: any) {
        console.warn("Web App Rubrics sync warning:", e.message);
      }
    }
    if (!results.rubrics || results.rubrics === 0) {
      try {
        const rubrics = await getTabRows(["Rubrics", "Rubric"]);
        if (rubrics.length > 0) {
          results.rubrics = await syncRubrics(supabase, rubrics);
        }
      } catch (e: any) {
        console.warn("Rubrics tab sync warning:", e.message);
      }
    }

    // 2. Sync Rubric Descriptions
    try {
      const rubricDescriptions = await getTabRows([
        "RubricDescriptions",
        "Rubric Descriptions",
        "Rubric_Descriptions",
        "RubricDescription",
      ]);
      if (rubricDescriptions.length > 0) {
        results.rubricDescriptions = await syncRubricDescriptions(supabase, rubricDescriptions);
      }
    } catch (e: any) {
      console.warn("RubricDescriptions tab sync warning:", e.message);
    }

    // 3. Sync Feedback Templates
    if (webAppInitData?.feedbackChips && Array.isArray(webAppInitData.feedbackChips) && webAppInitData.feedbackChips.length > 0) {
      try {
        results.feedbackTemplates = await syncFeedbackTemplates(supabase, webAppInitData.feedbackChips);
      } catch (e: any) {
        console.warn("Web App FeedbackTemplates sync warning:", e.message);
      }
    }
    if (!results.feedbackTemplates || results.feedbackTemplates === 0) {
      try {
        const feedbackTemplates = await getTabRows([
          "FeedbackTemplates",
          "Feedback Templates",
          "Feedback_Templates",
          "FeedbackTemplate",
        ]);
        if (feedbackTemplates.length > 0) {
          results.feedbackTemplates = await syncFeedbackTemplates(supabase, feedbackTemplates);
        }
      } catch (e: any) {
        console.warn("FeedbackTemplates tab sync warning:", e.message);
      }
    }

    // Automatic fallback to local CSV files if Google Sheet tabs are empty or missing
    const csvDir = path.join(process.cwd(), "CSV");
    if (
      (!results.rubricDescriptions || results.rubricDescriptions === 0) &&
      fs.existsSync(path.join(csvDir, "Dev QA Tracker - RubricDescriptions.csv"))
    ) {
      try {
        const rows = parseCsv(
          fs.readFileSync(path.join(csvDir, "Dev QA Tracker - RubricDescriptions.csv"), "utf-8")
        );
        const synced = await syncRubricDescriptions(supabase, rows);
        if (synced > 0) results.rubricDescriptions = synced;
      } catch (e) {}
    }
    if (
      (!results.feedbackTemplates || results.feedbackTemplates === 0) &&
      fs.existsSync(path.join(csvDir, "Dev QA Tracker - FeedbackTemplates.csv"))
    ) {
      try {
        const rows = parseCsv(
          fs.readFileSync(path.join(csvDir, "Dev QA Tracker - FeedbackTemplates.csv"), "utf-8")
        );
        const synced = await syncFeedbackTemplates(supabase, rows);
        if (synced > 0) results.feedbackTemplates = synced;
      } catch (e) {}
    }

    // If only syncing templates, stop here
    if (action !== "sync-templates") {
      // 4. Sync Agents
      try {
        const agents = await getTabRows(["Agents", "Agent"]);
        if (agents.length > 0) {
          results.agents = await syncAgents(supabase, agents);
        }
      } catch (e: any) {
        console.warn("Agents tab sync warning:", e.message);
      }

      // 5. Sync Assignments
      if (webAppInitData?.assignments && Array.isArray(webAppInitData.assignments) && webAppInitData.assignments.length > 0) {
        try {
          results.assignments = await syncAssignments(supabase, webAppInitData.assignments);
        } catch (e: any) {
          console.warn("Web App Assignments sync warning:", e.message);
        }
      }
      if (!results.assignments || results.assignments === 0) {
        try {
          const assignments = await getTabRows(["Assignments", "Assignment"]);
          if (assignments.length > 0) {
            results.assignments = await syncAssignments(supabase, assignments);
          }
        } catch (e: any) {
          console.warn("Assignments tab sync warning:", e.message);
        }
      }

      // 6. Sync Evaluations (so Interaction IDs are all known)
      try {
        const evaluations = await getTabRows(["Evaluations", "Evaluation"]);
        if (evaluations.length > 0) {
          results.evaluations = await syncEvaluations(supabase, evaluations);
        }
      } catch (e: any) {
        console.warn("Evaluations tab sync warning:", e.message);
      }
    }

    const totalSynced = Object.values(results).reduce((a, b) => a + b, 0);
    if (totalSynced === 0) {
      return NextResponse.json(
        {
          error:
            "No records could be fetched from Google Sheets. If your sheet is restricted to Toast users, please test the Google Script Web App connection in Settings.",
        },
        { status: 400 }
      );
    }

    await supabase.from("sync_logs").insert({
      user_id: user?.id || null,
      target_table: action === "sync-templates" ? "feedback_templates" : "google_sheet",
      rows_synced: totalSynced,
      status: "success",
      completed_at: new Date().toISOString(),
    });

    const msg =
      action === "sync-templates"
        ? `Successfully synced ${results.feedbackTemplates || 0} feedback templates, ${results.rubricDescriptions || 0} rubric guidelines, and ${results.rubrics || 0} rubrics.`
        : `Successfully fetched latest data from Google Sheet (${results.assignments || 0} assignments, ${results.evaluations || 0} evaluations, ${results.feedbackTemplates || 0} templates, ${results.rubricDescriptions || 0} guidelines).`;

    return NextResponse.json({
      success: true,
      message: msg,
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
