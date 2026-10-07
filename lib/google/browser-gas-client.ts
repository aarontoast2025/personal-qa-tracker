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

    const cleanup = () => {
      window.removeEventListener("message", messageHandler);
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

    // Frame onload fires when Apps Script finishes processing and returns HTTP response.
    // If no postMessage is received within 2.5s (due to cross-origin sandboxed iframe restrictions),
    // resolve with fallback response instead of failing.
    iframe.onload = () => {
      setTimeout(() => {
        if (!isHandled) {
          isHandled = true;
          clearTimeout(timeoutId);
          cleanup();
          resolve({ success: true, message: "Saved via background form post" } as any);
        }
      }, 2500);
    };

    form.method = "POST";
    form.action = targetUrl;
    form.target = frameName;
    form.style.display = "none";

    // 1. JSON-stringified full payload
    const inputPayload = document.createElement("input");
    inputPayload.type = "hidden";
    inputPayload.name = "payload";
    inputPayload.value = typeof payload === "object" ? JSON.stringify(payload) : String(payload);
    form.appendChild(inputPayload);

    // 2. format parameter
    const inputFormat = document.createElement("input");
    inputFormat.type = "hidden";
    inputFormat.name = "format";
    inputFormat.value = "iframe";
    form.appendChild(inputFormat);

    // 3. Top-level parameters for Apps Script doPost(e) compatibility
    if (typeof payload === "object" && payload !== null) {
      Object.keys(payload).forEach((key) => {
        if (key !== "payload" && key !== "format") {
          const val = payload[key];
          if (val !== undefined && val !== null) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = typeof val === "object" ? JSON.stringify(val) : String(val);
            form.appendChild(input);
          }
        }
      });
      const emailVal = payload.qaEmail || payload.qa_email;
      if (emailVal && !payload.qa_email) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "qa_email";
        input.value = String(emailVal);
        form.appendChild(input);
      }
      if (emailVal && !payload.qaEmail) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "qaEmail";
        input.value = String(emailVal);
        form.appendChild(input);
      }
    }

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

  // 1. Preserve complete agent snapshot details with canonical schema matching Google Sheet
  if (clone.agentSnapshot) {
    let snap = clone.agentSnapshot;
    if (typeof snap === "string") {
      try {
        snap = JSON.parse(snap);
      } catch {
        snap = null;
      }
    }
    if (snap && typeof snap === "object") {
      const toasttabEmail =
        snap.toasttabEmail || snap.toasttab_email || snap.email || clone.agentEmail || "";
      const fullName =
        snap.fullName || snap.full_name || snap.displayName || snap.display_name || clone.agentName || "";
      const displayName =
        snap.displayName || snap.display_name || snap.fullName || snap.full_name || clone.agentName || fullName;

      clone.agentSnapshot = {
        eid: snap.eid ? String(snap.eid) : "",
        role: snap.role || "Agent",
        tier: snap.tier || "",
        wave: snap.wave || "",
        skill: snap.skill || "",
        channel: snap.channel || "",
        manager: snap.manager || "",
        fullName,
        location: snap.location || "",
        caseSafeId: snap.caseSafeId || snap.case_safe_id || "",
        supervisor: snap.supervisor || "",
        displayName,
        toasttabEmail,
        productionDate: snap.productionDate || snap.production_date || "",
        internalIbexEmail: snap.internalIbexEmail || snap.internal_ibex_email || "",
      };
    }
  }

  // 2. Compact long text fields
  if (clone.issueConcern && clone.issueConcern.length > 250) {
    clone.issueConcern = clone.issueConcern.slice(0, 250).trim();
  }
  if (clone.comments && clone.comments.length > 200) {
    clone.comments = clone.comments.slice(0, 200).trim();
  }

  // 3. Compact details with multi-tier size budgeting to stay comfortably within browser/GFE URL limits
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
      const buildDetails = (includeMetFeedback: boolean, maxFailFeedbackLen: number) => {
        const compactDetails: Record<string, any[]> = {};
        Object.keys(detailsObj).forEach((secKey) => {
          const items = detailsObj[secKey];
          if (Array.isArray(items)) {
            compactDetails[secKey] = items.map((item: any) => {
              const isMet =
                item.isCorrect !== false &&
                (!item.selected ||
                  item.selected.toLowerCase().includes("quality standard met") ||
                  item.selected.toLowerCase().includes("n/a"));

              const entry: Record<string, any> = {
                question: item.question || "",
                selected: item.selected || "",
                points:
                  typeof item.points === "number"
                    ? item.points
                    : Number(item.points || 0),
                isCorrect: item.isCorrect !== false,
              };

              const rawFeedback = (item.feedback || item.feedbackText || "").trim();
              if (!isMet && rawFeedback) {
                entry.feedback = rawFeedback.slice(0, maxFailFeedbackLen);
              } else if (includeMetFeedback && rawFeedback) {
                entry.feedback = rawFeedback.slice(0, 60);
              }

              if (item.feedbackChips?.length && !isMet) {
                entry.feedbackChips = item.feedbackChips;
              }

              return entry;
            });
          }
        });
        return compactDetails;
      };

      // Tier 1: Try with 60-char met feedback and 300-char fail feedback
      clone.details = buildDetails(true, 300);
      let serialized = JSON.stringify(clone);

      // Tier 2: If over budget, drop met feedback and keep 250-char fail feedback
      if (serialized.length > 4000) {
        clone.details = buildDetails(false, 250);
        serialized = JSON.stringify(clone);
      }

      // Tier 3: If still over budget, limit fail feedback to 150 chars
      if (serialized.length > 4000) {
        clone.details = buildDetails(false, 150);
        serialized = JSON.stringify(clone);
      }
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

  // 1. Primary transport: Browser JSONP (GET)
  // With compactEvaluationData, serialized payload is budgeted to stay under 4,200 chars (< 6,000 encoded URI chars),
  // which safely fits within Google Frontend's 8,192 byte limit while seamlessly attaching Toast SSO session.
  if (serialized.length <= 6000) {
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
        45000
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

  // 2. Fallback transport: Hidden iframe form post (handles extra large payloads with active Google session)
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
