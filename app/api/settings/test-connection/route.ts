import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getWebAppConfig,
  testWebAppConnection,
  DEFAULT_WEB_APP_URL,
} from "@/lib/google/web-app-client";

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty body
    }

    const supabase = await createClient();
    const config = await getWebAppConfig(supabase);

    const testUrl = body.webAppUrl?.trim() || config.url || DEFAULT_WEB_APP_URL;
    const testToken = body.token?.trim() || config.token;

    // Fetch saved sheet ID from app_settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("google_sheet_id")
      .limit(1)
      .maybeSingle();

    const sheetId = body.sheetId?.trim() || settings?.google_sheet_id || "";

    const testResult = await testWebAppConnection(testUrl, testToken);

    if (!testResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error: testResult.error || "Could not reach Google Apps Script Web App.",
          latencyMs: testResult.latencyMs,
          sheetId,
          webAppUrl: testUrl,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Connected successfully! Google Apps Script Web App is active and responsive (${testResult.latencyMs}ms).`,
      latencyMs: testResult.latencyMs,
      sheetId,
      webAppUrl: testUrl,
      timestamps: testResult.data,
    });
  } catch (err: any) {
    console.error("Test connection route error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to test connection to Google Sheet.",
      },
      { status: 500 }
    );
  }
}
