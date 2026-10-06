/**
 * Browser-side Google Apps Script transport client for domain-restricted enterprise accounts (Toasttab).
 *
 * In domain-restricted Google Workspace setups (e.g. toasttab.com), external servers (like Vercel)
 * cannot access the Web App directly because Google intercepts unauthenticated requests and redirects
 * to Okta SAML SSO.
 *
 * However, the user's browser IS authenticated with Toast SSO. By executing requests from the browser
 * using JSONP (for GET) and hidden-iframe form post (for POST), the browser automatically attaches
 * the user's active Google/Okta session cookies, allowing seamless read and write access to the
 * domain-restricted Google Sheet without any public sharing.
 */

export const DEFAULT_WEB_APP_URL =
  "https://script.google.com/a/macros/toasttab.com/s/AKfycbzRI2l-Q9Xxz6zrFQpPAj3c4OjFk3SQmUjsAQTtglOdFg7rakCajtw7SO6hgXueq54lqA/exec";
export const DEFAULT_API_TOKEN = "toast_qa_bookmarklet_2026";

/**
 * Executes a cross-origin JSONP GET request from the browser.
 */
export function browserJsonpRequest<T = any>(
  url: string,
  params: Record<string, any> = {},
  timeoutMs: number = 25000
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("JSONP transport is only available in the browser."));
    }

    const targetUrl = (url || DEFAULT_WEB_APP_URL).trim();
    const cbName = `toast_cb_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const script = document.createElement("script");
    let isHandled = false;

    const timeoutId = setTimeout(() => {
      if (!isHandled) {
        isHandled = true;
        cleanup();
        reject(
          new Error(
            "Connection timed out. Please ensure you are logged into your Toast Google account in this browser."
          )
        );
      }
    }, timeoutMs);

    const cleanup = () => {
      try {
        delete (window as any)[cbName];
      } catch {
        (window as any)[cbName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    (window as any)[cbName] = (data: T) => {
      if (!isHandled) {
        isHandled = true;
        clearTimeout(timeoutId);
        cleanup();
        resolve(data);
      }
    };

    script.onerror = () => {
      if (!isHandled) {
        isHandled = true;
        clearTimeout(timeoutId);
        cleanup();
        reject(
          new Error(
            "Failed to reach Google Apps Script. Please verify you are logged into your Toast Google account in this browser."
          )
        );
      }
    };

    const queryParts: string[] = [];
    queryParts.push(`callback=${encodeURIComponent(cbName)}`);
    queryParts.push("api=1");

    Object.keys(params).forEach((key) => {
      const val = params[key];
      if (val !== undefined && val !== null) {
        const valStr = typeof val === "object" ? JSON.stringify(val) : String(val);
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(valStr)}`);
      }
    });

    const sep = targetUrl.includes("?") ? "&" : "?";
    script.src = targetUrl + sep + queryParts.join("&");
    (document.head || document.documentElement).appendChild(script);
  });
}

/**
 * Executes a cross-origin form POST request into a hidden iframe.
 * Google Apps Script's Api.gs returns an HTML page with window.parent.postMessage({ type: 'TOAST_QA_RESPONSE', data: ... })
 * which this method intercepts.
 */
export function browserFormPostRequest<T = any>(
  url: string,
  payload: Record<string, any>,
  timeoutMs: number = 60000
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Form post transport is only available in the browser."));
    }

    const targetUrl = (url || DEFAULT_WEB_APP_URL).trim();
    const frameName = `toast_gas_frame_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const iframe = document.createElement("iframe");
    iframe.name = frameName;
    iframe.id = frameName;
    iframe.style.display = "none";

    const form = document.createElement("form");
    let isHandled = false;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      window.removeEventListener("message", messageHandler);
      if (graceTimer) clearTimeout(graceTimer);
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        if (form.parentNode) form.parentNode.removeChild(form);
      }, 1000);
    };

    const fail = (msg: string) => {
      if (isHandled) return;
      isHandled = true;
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error(msg));
    };

    const timeoutId = setTimeout(() => {
      fail(
        "Google Apps Script did not respond. Please ensure you are logged into your Toast Google account and try again."
      );
    }, timeoutMs);

    const messageHandler = (event: MessageEvent) => {
      if (
        event.data &&
        (event.data.type === "TOAST_QA_RESPONSE" ||
          (event.data.data && event.data.data.success !== undefined))
      ) {
        if (!isHandled) {
          isHandled = true;
          clearTimeout(timeoutId);
          cleanup();
          const resData = event.data.data || event.data;
          if (resData.success !== false) {
            resolve(resData);
          } else {
            reject(new Error(resData.error || resData.message || "Submission failed"));
          }
        }
      }
    };

    window.addEventListener("message", messageHandler);

    // When the cross-origin Apps Script response page loads, it should postMessage the result.
    // If it loads but never posts a message (e.g. login page or raw JSON error), report failure
    // instead of silently assuming success.
    iframe.onload = () => {
      let isCrossOrigin = false;
      try {
        // Readable only while the iframe is still the initial same-origin about:blank page
        void iframe.contentWindow?.location.href;
      } catch {
        isCrossOrigin = true;
      }
      if (!isCrossOrigin || isHandled) return;
      if (graceTimer) clearTimeout(graceTimer);
      graceTimer = setTimeout(() => {
        fail(
          "Google Apps Script did not confirm the save, so the Google Sheet was NOT updated. Please make sure you are logged into your Toast Google account and try again."
        );
      }, 5000);
    };

    // Send the body as RAW JSON using enctype="text/plain".
    // The deployed Apps Script (handleApiPost) does JSON.parse(e.postData.contents) first, so a
    // urlencoded body ("payload=...&format=...") makes it throw before anything is written.
    // text/plain forms serialize as `name=value\r\n`; we split the JSON so the "=" falls inside a
    // trailing padding string, producing valid JSON: {...,"_pad":"="}
    const bodyObj: Record<string, any> = { ...(payload || {}) };
    if (bodyObj.qaEmail && !bodyObj.qa_email) bodyObj.qa_email = bodyObj.qaEmail;
    if (bodyObj.qa_email && !bodyObj.qaEmail) bodyObj.qaEmail = bodyObj.qa_email;
    bodyObj.format = "iframe";
    delete bodyObj._pad;
    bodyObj._pad = "";
    const json = JSON.stringify(bodyObj); // always ends with ,"_pad":""}

    form.method = "POST";
    form.action = targetUrl;
    form.target = frameName;
    form.enctype = "text/plain";
    form.acceptCharset = "UTF-8";
    form.style.display = "none";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = json.slice(0, -2); // {...,"_pad":"
    input.value = json.slice(-2); // "}
    form.appendChild(input);

    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();
  });
}

/**
 * Normalizes and compacts evaluation data for browser transport.
 * Keeps payload lightweight and under browser/GFE GET query length limits.
 */
export function compactEvaluationData(data: Record<string, any>): Record<string, any> {
  const clone = { ...data };

  // Compact agent snapshot to avoid unnecessary metadata bloat in URL
  if (clone.agentSnapshot && typeof clone.agentSnapshot === "object") {
    clone.agentSnapshot = {
      fullName:
        clone.agentSnapshot.fullName ||
        clone.agentSnapshot.displayName ||
        clone.agentName ||
        "",
      displayName: clone.agentSnapshot.displayName || clone.agentName || "",
      toasttabEmail:
        clone.agentSnapshot.toasttabEmail || clone.agentEmail || "",
      role: clone.agentSnapshot.role || "Agent",
    };
  }

  // Ensure details is an object and compact each question entry
  if (clone.details) {
    let detailsObj = clone.details;
    if (typeof detailsObj === "string") {
      try {
        detailsObj = JSON.parse(detailsObj);
      } catch {
        detailsObj = {};
      }
    }

    if (typeof detailsObj === "object" && detailsObj !== null) {
      const compactDetails: Record<string, any[]> = {};
      Object.keys(detailsObj).forEach((secKey) => {
        const items = detailsObj[secKey];
        if (Array.isArray(items)) {
          compactDetails[secKey] = items.map((item: any) => ({
            question: item.question || "",
            selected: item.selected || "",
            points: typeof item.points === "number" ? item.points : Number(item.points || 0),
            isCorrect: item.isCorrect !== false,
            feedback: item.feedback || item.feedbackText || "",
            ...(item.feedbackChips?.length ? { feedbackChips: item.feedbackChips } : {}),
          }));
        }
      });
      clone.details = compactDetails;
    }
  }

  return clone;
}

/**
 * Tests connection to Google Apps Script directly from the browser using JSONP.
 */
export async function testBrowserConnection(
  url: string = DEFAULT_WEB_APP_URL,
  token: string = DEFAULT_API_TOKEN
): Promise<{
  ok: boolean;
  latencyMs: number;
  data?: any;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const data = await browserJsonpRequest<any>(
      url,
      {
        action: "check_sync",
        token,
      },
      15000
    );

    const latencyMs = Date.now() - startTime;
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
      error: err.message || "Failed to reach Google Apps Script from browser",
    };
  }
}

/**
 * Fetches initial data (assignments, rubrics, feedback templates) directly from the browser via JSONP.
 */
export async function fetchInitDataBrowser(
  url: string = DEFAULT_WEB_APP_URL,
  token: string = DEFAULT_API_TOKEN,
  qaEmail: string = ""
): Promise<any> {
  const data = await browserJsonpRequest<any>(
    url,
    {
      action: "get_init_data",
      token,
      qa_email: qaEmail.toLowerCase().trim(),
    },
    60000
  );

  if (!data || data.success === false) {
    throw new Error(data?.error || "Failed to fetch data from Google Apps Script");
  }

  return data;
}

/**
 * Submits an evaluation to Google Apps Script from the browser.
 * Uses JSONP as the primary authenticated transport (compatible with domain-restricted Google Workspace)
 * with hidden iframe form POST as fallback.
 */
export async function submitEvaluationBrowser(
  url: string = DEFAULT_WEB_APP_URL,
  token: string = DEFAULT_API_TOKEN,
  qaEmail: string,
  evaluationData: Record<string, any>
): Promise<any> {
  const targetUrl = (url || DEFAULT_WEB_APP_URL).trim();
  const email = (qaEmail || "").toLowerCase().trim();
  const compactData = compactEvaluationData(evaluationData);
  const serialized = JSON.stringify(compactData);

  // 1. Primary transport: Browser JSONP for compact payloads (<= 1800 chars)
  // Large payloads (> 1800 chars) are routed directly to form post to prevent HTTP 414 / URI too large errors
  if (serialized.length <= 1800) {
    try {
      const res = await browserJsonpRequest<any>(
        targetUrl,
        {
          action: "submit_evaluation",
          token: token || DEFAULT_API_TOKEN,
          qa_email: email,
          qaEmail: email,
          payload: serialized,
        },
        15000
      );

      if (res && res.success !== false) {
        return res;
      }
      throw new Error(
        res?.message || res?.error || "Google Apps Script rejected the submission."
      );
    } catch (jsonpErr: any) {
      console.warn("JSONP submit failed, falling back to form post:", jsonpErr.message);
    }
  }

  // 2. Form post into hidden iframe (handles payloads of any size with active Google session)
  const fallbackRes = await browserFormPostRequest(targetUrl, {
    action: "submit_evaluation",
    token: token || DEFAULT_API_TOKEN,
    qaEmail: email,
    qa_email: email,
    evaluationData: compactData,
  });

  if (fallbackRes && fallbackRes.success !== false) {
    return fallbackRes;
  }
  throw new Error(
    fallbackRes?.message ||
      fallbackRes?.error ||
      "Failed to submit evaluation to Google Apps Script."
  );
}
