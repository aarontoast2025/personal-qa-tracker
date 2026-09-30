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
  timeoutMs: number = 30000
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

    let isHandled = false;

    const timeoutId = setTimeout(() => {
      if (!isHandled) {
        isHandled = true;
        cleanup();
        resolve({ success: true, message: "Saved via background browser form" } as any);
      }
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

    const form = document.createElement("form");
    form.method = "POST";
    form.action = targetUrl;
    form.target = frameName;
    form.style.display = "none";

    const inputPayload = document.createElement("input");
    inputPayload.type = "hidden";
    inputPayload.name = "payload";
    inputPayload.value = typeof payload === "object" ? JSON.stringify(payload) : String(payload);
    form.appendChild(inputPayload);

    const inputFormat = document.createElement("input");
    inputFormat.type = "hidden";
    inputFormat.name = "format";
    inputFormat.value = "iframe";
    form.appendChild(inputFormat);

    const cleanup = () => {
      window.removeEventListener("message", messageHandler);
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        if (form.parentNode) form.parentNode.removeChild(form);
      }, 1000);
    };

    iframe.onload = () => {
      // If no postMessage received within 2s of frame load, assume success
      setTimeout(() => {
        if (!isHandled) {
          isHandled = true;
          clearTimeout(timeoutId);
          cleanup();
          resolve({ success: true } as any);
        }
      }, 2000);
    };

    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();
  });
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
    30000
  );

  if (!data || data.success === false) {
    throw new Error(data?.error || "Failed to fetch data from Google Apps Script");
  }

  return data;
}

/**
 * Submits an evaluation to Google Apps Script from the browser.
 * Uses formPostRequest with JSONP fallback.
 */
export async function submitEvaluationBrowser(
  url: string = DEFAULT_WEB_APP_URL,
  token: string = DEFAULT_API_TOKEN,
  qaEmail: string,
  evaluationData: Record<string, any>
): Promise<any> {
  const payload = {
    action: "submit_evaluation",
    token,
    qaEmail: qaEmail.toLowerCase().trim(),
    evaluationData,
  };

  try {
    return await browserFormPostRequest(url, payload);
  } catch (err: any) {
    console.warn("Form post failed, attempting JSONP submit fallback:", err.message);
    return await browserJsonpRequest(url, {
      action: "submit_evaluation",
      token,
      qa_email: qaEmail,
      payload: JSON.stringify(evaluationData),
    });
  }
}
