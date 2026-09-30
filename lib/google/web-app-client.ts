import { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyI2cDSGLZokRPesN_f-LmdSp2YLXzY3aXYpyrq2_Kzh9_vYCQOsyQtw0L-7wwHQ3lFEQ/exec";
export const DEFAULT_API_TOKEN = "toast_qa_bookmarklet_2026";

export interface WebAppConfig {
  url: string;
  token: string;
}

export async function getWebAppConfig(supabase?: SupabaseClient): Promise<WebAppConfig> {
  let url = process.env.GOOGLE_WEB_APP_URL?.trim();
  const token = process.env.GOOGLE_WEB_APP_TOKEN?.trim() || DEFAULT_API_TOKEN;

  if (!url && supabase) {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("google_web_app_url")
        .limit(1)
        .maybeSingle();

      if (data?.google_web_app_url) {
        url = data.google_web_app_url.trim();
      }
    } catch {
      // Column might not exist yet if migration 004 has not been run in Supabase dashboard
    }
  }

  return {
    url: url || DEFAULT_WEB_APP_URL,
    token,
  };
}

export async function testWebAppConnection(
  customUrl?: string,
  customToken?: string
): Promise<{
  ok: boolean;
  latencyMs: number;
  data?: any;
  error?: string;
}> {
  const url = (customUrl || DEFAULT_WEB_APP_URL).trim();
  const token = (customToken || DEFAULT_API_TOKEN).trim();
  const startTime = Date.now();

  try {
    const fullUrl = `${url}?action=check_sync&token=${encodeURIComponent(token)}`;
    const res = await fetch(fullUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      return {
        ok: false,
        latencyMs,
        error: `HTTP ${res.status} (${res.statusText}) from Google Apps Script Web App`,
      };
    }

    const data = await res.json();
    if (!data || data.success === false) {
      return {
        ok: false,
        latencyMs,
        error: data?.error || "Google Apps Script returned unsuccessful status",
      };
    }

    return {
      ok: true,
      latencyMs,
      data,
    };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - startTime,
      error: err.message || "Failed to reach Google Apps Script Web App",
    };
  }
}

export async function fetchInitDataFromWebApp(
  config: WebAppConfig,
  qaEmail: string = ""
): Promise<any> {
  const fullUrl = `${config.url}?action=get_init_data&token=${encodeURIComponent(
    config.token
  )}&qa_email=${encodeURIComponent(qaEmail)}`;

  const res = await fetch(fullUrl, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch from Google Apps Script: HTTP ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();
  if (!data || data.success === false) {
    throw new Error(
      data?.error || "Google Apps Script Web App returned unsuccessful response"
    );
  }

  return data;
}

export async function submitEvaluationToWebApp(
  config: WebAppConfig,
  qaEmail: string,
  evaluationData: Record<string, any>
): Promise<{
  success: boolean;
  evaluationId?: string;
  timestamp?: string;
  assignmentsTimestamp?: string;
  message?: string;
  error?: string;
}> {
  const payload = {
    action: "submit_evaluation",
    token: config.token,
    qaEmail: qaEmail.toLowerCase().trim(),
    evaluationData,
  };

  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(
      `Google Apps Script Web App error: HTTP ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();
  if (!data || data.success === false) {
    throw new Error(
      data?.error || data?.message || "Failed to save evaluation in Google Sheet"
    );
  }

  return data;
}
