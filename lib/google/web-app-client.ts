import { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_WEB_APP_URL =
  "https://script.google.com/a/macros/toasttab.com/s/AKfycbzRI2l-Q9Xxz6zrFQpPAj3c4OjFk3SQmUjsAQTtglOdFg7rakCajtw7SO6hgXueq54lqA/exec";
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

export function normalizeWebAppUrl(rawUrl: string): string {
  let val = (rawUrl || "").split("?")[0].split("#")[0].trim();
  if (!val) return DEFAULT_WEB_APP_URL;
  if (val.startsWith("http://") || val.startsWith("https://")) {
    if (
      (val.includes("/macros/s/") || val.includes("/a/macros/")) &&
      !val.endsWith("/exec") &&
      !val.endsWith("/dev")
    ) {
      val = val.replace(/\/?$/, "/exec");
    }
    return val;
  }
  return `https://script.google.com/macros/s/${val}/exec`;
}

async function parseJsonOrDiagnose(res: Response, context: string): Promise<any> {
  const text = await res.text();
  if (
    text.includes("<!DOCTYPE") ||
    text.includes("<html") ||
    res.url.includes("accounts.google.com") ||
    res.url.includes("okta.com") ||
    text.includes("ServiceLogin")
  ) {
    throw new Error(
      "Google redirected the request to a Google/Okta login page. In Google Apps Script, please edit your Web App deployment: set 'Execute as: Me' and 'Who has access: Anyone'."
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${context}: Received non-JSON response from Google Apps Script (${text.slice(0, 120)}...)`
    );
  }
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
  const url = normalizeWebAppUrl(customUrl || DEFAULT_WEB_APP_URL);
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

    const data = await parseJsonOrDiagnose(res, "Test Connection");
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
  const url = normalizeWebAppUrl(config.url);
  const fullUrl = `${url}?action=get_init_data&token=${encodeURIComponent(
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

  const data = await parseJsonOrDiagnose(res, "Fetch Init Data");
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
  const url = normalizeWebAppUrl(config.url);
  const payload = {
    action: "submit_evaluation",
    token: config.token,
    qaEmail: qaEmail.toLowerCase().trim(),
    evaluationData,
  };

  const res = await fetch(url, {
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

  const data = await parseJsonOrDiagnose(res, "Submit Evaluation");
  if (!data || data.success === false) {
    throw new Error(
      data?.error || data?.message || "Failed to save evaluation in Google Sheet"
    );
  }

  return data;
}
