(function() {
    if (document.getElementById('qa-modal-overlay')) return;
    console.log("Toast QA Tracker: Initializing...");

    // Default configuration
    var DEFAULT_TRACKER_HOST = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? window.location.origin
        : 'https://personal-qa-tracker.vercel.app';
    var DEFAULT_API_URL = DEFAULT_TRACKER_HOST + '/api/bookmarklet';
    var DEFAULT_API_TOKEN = 'toast_qa_bookmarklet_2026';
    var DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
    var DEFAULT_SUPABASE_URL = 'https://pxtjlqrbyqmswycfjmsd.supabase.co';
    var DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4dGpscXJieXFtc3d5Y2ZqbXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2ODU3NzIsImV4cCI6MjEwNjI2MTc3Mn0.OLWPtA5hRs3zED5QsXSkRrXnA_wC4lBpxGCVrBCR8fg';
    var SUPABASE_URL = DEFAULT_SUPABASE_URL;
    var SUPABASE_KEY = DEFAULT_SUPABASE_KEY;

    var DEFAULT_FALLBACK_RUBRIC = {
        id: 'toast-standard-qa',
        name: 'Toast QA Standard Rubric',
        structure: "[{\"name\":\"Knowledgeable & effective problem-solving\",\"items\":[{\"question\":\"Investigation ownership & Resource optimization\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard excelled\",\"points\":12,\"isCorrect\":true,\"isDefault\":false},{\"label\":\"Quality standard met\",\"points\":8,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":25,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Customer training opportunity taken\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":4,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":4,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Confirmed resolution & next steps\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":8,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":10,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Escalation/transfer due diligence\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard excelled\",\"points\":12,\"isCorrect\":true,\"isDefault\":false},{\"label\":\"Quality standard met\",\"points\":8,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":25,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Internal case notes\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":5,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":5,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Major Process Failure: Interaction documentation\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"N/A\",\"points\":0,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":25,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Case data management\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":3,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":3,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Major Process Failure: Survey avoidance/ manipulation\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"N/A\",\"points\":0,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":25,\"isCorrect\":false,\"isDefault\":false}]}]},{\"name\":\"Empathy & rapport\",\"items\":[{\"question\":\"Major Process: De-escalation\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"N/A\",\"points\":0,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":25,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Customer Sentiment Acknowledgement\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":8,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":8,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Effective listening & information acknowledgement\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":7,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":7,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Internal collaboration\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard excelled\",\"points\":4,\"isCorrect\":true,\"isDefault\":false},{\"label\":\"Quality standard met\",\"points\":3,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":3,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Tone of response\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard excelled\",\"points\":7,\"isCorrect\":true,\"isDefault\":false},{\"label\":\"Quality standard met\",\"points\":6,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":6,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Intentional Customer Mistreat\",\"uiType\":\"dropdown\",\"options\":[{\"label\":\"Rude or unprofessional behavior\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"Hanging up on a customer or manually closing a chat\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"Repeated toggling of ready state to place self in the back of the call queue\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"Excessive long silence or hold times without acknowledging the customer that result in the customer disconnecting the interaction\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"Conducting personal business while on a call with a customer (i.e. having personal conversations)\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"Denied tranfers\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"N/A\",\"points\":0,\"isCorrect\":true,\"isDefault\":true}]}]},{\"name\":\"Responsive & consistent interactions\",\"items\":[{\"question\":\"Interaction customer communication\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":7,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":7,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Major Process Failure: Excessive response time (over 8 minutes)\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"N/A\",\"points\":0,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":25,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Case customer communication\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":7,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":7,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Major Process Failure: Waiting on agent action\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"N/A\",\"points\":0,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":25,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Negligent Customer Mistreat\",\"uiType\":\"dropdown\",\"options\":[{\"label\":\"Poor case management/hygiene\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"Case closed before resolution reached\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"Call drops and agent does not call the customer back\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"Failure to appropriately document customer interaction\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"Failing to probe the customer's need and unnecessary transferring of the call\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"Not adhering to required customer authentication procedures or other essential security processes\",\"points\":100,\"isCorrect\":false,\"isDefault\":false},{\"label\":\"N/A\",\"points\":0,\"isCorrect\":true,\"isDefault\":true}]}]},{\"name\":\"Personalization\",\"items\":[{\"question\":\"Customer background information\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":4,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":4,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Contact preferences\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":5,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":5,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Account & previous case review\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":5,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":5,\"isCorrect\":false,\"isDefault\":false}]},{\"question\":\"Toast greeting & closing\",\"uiType\":\"buttons\",\"options\":[{\"label\":\"Quality standard met\",\"points\":2,\"isCorrect\":true,\"isDefault\":true},{\"label\":\"Quality standard missed\",\"points\":2,\"isCorrect\":false,\"isDefault\":false}]}]}]"
    };

    // LocalStorage helper
    var storage = {
        get: function(k, def) {
            try { var v = localStorage.getItem('toast_qa_' + k); return v !== null ? v : def; }
            catch(e) { return def; }
        },
        set: function(k, v) {
            try { localStorage.setItem('toast_qa_' + k, v); }
            catch(e) {}
        }
    };

    var normalizeApiUrl = function(input) {
        if (!input) return DEFAULT_API_URL || '';
        var val = String(input).trim();
        if (!val) return DEFAULT_API_URL || '';
        if (val.indexOf('/api/bookmarklet') !== -1) return val.replace(/\/+$/, '');
        if (val.indexOf('personal-qa-tracker') !== -1 || val.indexOf('localhost') !== -1 || val.indexOf('127.0.0.1') !== -1) {
            return val.replace(/\/+$/, '') + '/api/bookmarklet';
        }
        val = val.split('?')[0].split('#')[0].trim();
        if (val.startsWith('http://') || val.startsWith('https://')) {
            if ((val.indexOf('/macros/s/') !== -1 || val.indexOf('/a/macros/') !== -1) && !val.endsWith('/exec') && !val.endsWith('/dev')) {
                val = val.replace(/\/?$/, '/exec');
            }
            return val;
        }
        return DEFAULT_API_URL;
    };

    // Universal JSONP transport for cross-origin domain-restricted Google Apps Script endpoints
    var jsonpRequest = function(url, params) {
        return new Promise(function(resolve, reject) {
            var cbName = 'toast_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
            var script = document.createElement('script');
            var isHandled = false;

            var timeoutId = setTimeout(function(){
                if (!isHandled) {
                    isHandled = true;
                    cleanup();
                    reject(new Error("Connection timed out. Please verify your Google Apps Script Web App URL and ensure you are logged into your Toast Google account."));
                }
            }, 20000);

            var cleanup = function() {
                try {
                    delete window[cbName];
                } catch(e) {
                    window[cbName] = undefined;
                }
                if (script.parentNode) script.parentNode.removeChild(script);
            };

            window[cbName] = function(data) {
                if (!isHandled) {
                    isHandled = true;
                    clearTimeout(timeoutId);
                    cleanup();
                    resolve(data);
                }
            };

            script.onerror = function() {
                if (!isHandled) {
                    isHandled = true;
                    clearTimeout(timeoutId);
                    cleanup();
                    reject(new Error("Failed to connect to Google Apps Script. Please ensure you are logged into your Toast Google account in this browser."));
                }
            };

            var queryParams = [];
            queryParams.push('callback=' + encodeURIComponent(cbName));
            if (params) {
                Object.keys(params).forEach(function(k){
                    var v = params[k];
                    if (v !== undefined && v !== null) {
                        var valStr = (typeof v === 'object') ? JSON.stringify(v) : String(v);
                        queryParams.push(encodeURIComponent(k) + '=' + encodeURIComponent(valStr));
                    }
                });
            }

            var sep = url.indexOf('?') === -1 ? '?' : '&';
            script.src = url + sep + queryParams.join('&');
            (document.head || document.documentElement).appendChild(script);
        });
    };

    var apiGet = function(url, params) {
        params = params || {};
        if (!params.token && API_TOKEN) params.token = API_TOKEN;
        if (!params.api) params.api = '1';

        var queryParts = [];
        Object.keys(params).forEach(function(k){
            var v = params[k];
            if (v !== undefined && v !== null) {
                var valStr = (typeof v === 'object') ? JSON.stringify(v) : String(v);
                queryParts.push(encodeURIComponent(k) + '=' + encodeURIComponent(valStr));
            }
        });
        // Direct CORS fetch for Next.js Tracker API
        if (url.indexOf('/api/bookmarklet') !== -1) {
            return fetch(fullUrl, {
                mode: 'cors',
                headers: { 'X-Bookmarklet-Token': API_TOKEN || '' }
            }).then(function(res){
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            });
        }

        // For Google Apps Script URLs, always use JSONP directly to bypass CORS 302 and wildcard-origin restrictions
        if (url.indexOf('script.google.com') !== -1 || url.indexOf('/macros/') !== -1) {
            return jsonpRequest(url, params);
        }

        return fetch(fullUrl, { mode: 'cors' })
            .then(function(res){
                if (!res.ok && res.status !== 0) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .catch(function(err){
                console.warn("Fetch failed, falling back to JSONP: " + err.message);
                return jsonpRequest(url, params);
            });
    };

    // Form post transport using hidden iframe to bypass CORS/cookie restrictions on domain-restricted Google Apps Script endpoints
    var formPostRequest = function(url, payload) {
        return new Promise(function(resolve, reject) {
            var frameName = 'toast_gas_frame_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
            var iframe = document.createElement('iframe');
            iframe.name = frameName;
            iframe.id = frameName;
            iframe.style.display = 'none';

            var isHandled = false;
            var timeoutId = setTimeout(function() {
                if (!isHandled) {
                    isHandled = true;
                    cleanup();
                    // Resolves gracefully after timeout
                    resolve({ success: true, message: 'Saved via background form' });
                }
            }, 8000);

            var messageHandler = function(event) {
                if (event.data && (event.data.type === 'TOAST_QA_RESPONSE' || (event.data.data && event.data.data.success))) {
                    if (!isHandled) {
                        isHandled = true;
                        clearTimeout(timeoutId);
                        cleanup();
                        var resData = event.data.data || event.data;
                        if (resData.success) {
                            resolve(resData);
                        } else {
                            reject(new Error(resData.error || resData.message || 'Submission failed'));
                        }
                    }
                }
            };
            window.addEventListener('message', messageHandler);

            var cleanup = function() {
                window.removeEventListener('message', messageHandler);
                setTimeout(function(){
                    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                    if (form.parentNode) form.parentNode.removeChild(form);
                }, 1000);
            };

            iframe.onload = function() {
                setTimeout(function(){
                    if (!isHandled) {
                        isHandled = true;
                        clearTimeout(timeoutId);
                        cleanup();
                        resolve({ success: true });
                    }
                }, 1500);
            };

            var form = document.createElement('form');
            form.method = 'POST';
            form.action = url;
            form.target = frameName;
            form.style.display = 'none';

            var inputPayload = document.createElement('input');
            inputPayload.type = 'hidden';
            inputPayload.name = 'payload';
            inputPayload.value = (typeof payload === 'object') ? JSON.stringify(payload) : String(payload);
            form.appendChild(inputPayload);

            var inputFormat = document.createElement('input');
            inputFormat.type = 'hidden';
            inputFormat.name = 'format';
            inputFormat.value = 'iframe';
            form.appendChild(inputFormat);

            document.body.appendChild(iframe);
            document.body.appendChild(form);
            form.submit();
        });
    };

    var apiPost = function(url, payload) {
        payload = payload || {};
        if (!payload.token && API_TOKEN) payload.token = API_TOKEN;

        var isTrackerApi = url.indexOf('/api/bookmarklet') !== -1;
        var headers = isTrackerApi
            ? { 'Content-Type': 'application/json', 'X-Bookmarklet-Token': API_TOKEN || '' }
            : { 'Content-Type': 'text/plain' };

        return fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        })
        .then(function(res){
            if (!res.ok) {
                return res.json().catch(function(){ return {}; }).then(function(errData){
                    throw new Error(errData.error || ("HTTP " + res.status));
                });
            }
            return res.json();
        })
        .catch(function(err){
            if (isTrackerApi) throw err;
            console.warn("POST fetch failed (" + err.message + "), falling back to form bridge");
            return formPostRequest(url, payload);
        });
    };

    var API_BASE_URL = normalizeApiUrl(storage.get('api_url', DEFAULT_API_URL));
    var API_TOKEN = storage.get('api_token', DEFAULT_API_TOKEN);
    SUPABASE_URL = storage.get('supabase_url', DEFAULT_SUPABASE_URL);
    SUPABASE_KEY = storage.get('supabase_key', DEFAULT_SUPABASE_KEY);

    // Supabase REST client for cross-origin Bookmarklet operations
    var supabaseFetch = function(endpoint, method, payload, preferHeader) {
        var sUrl = (SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '') + '/rest/v1/' + endpoint;
        var sKey = SUPABASE_KEY || storage.get('supabase_key', DEFAULT_SUPABASE_KEY);
        if (!sKey) {
            return Promise.reject(new Error("Supabase Anon Key is not configured. Please set it in Settings."));
        }
        var prefer = 'return=representation';
        if (preferHeader) {
            prefer += ',' + preferHeader;
        }
        var headers = {
            'apikey': sKey,
            'Authorization': 'Bearer ' + sKey,
            'Content-Type': 'application/json',
            'Prefer': prefer
        };
        var opts = {
            method: method || 'GET',
            headers: headers
        };
        if (payload && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
            opts.body = JSON.stringify(payload);
        }
        return fetch(sUrl, opts).then(function(res) {
            if (!res.ok) {
                return res.text().then(function(t) {
                    throw new Error("Supabase (" + res.status + "): " + t);
                });
            }
            return res.json().catch(function(){ return []; });
        });
    };
    var DEFAULT_QA_EMAIL = 'aaron.toast2025@gmail.com';
    var QA_EMAIL = storage.get('qa_email', DEFAULT_QA_EMAIL);
    var GEMINI_API_KEY = storage.get('gemini_key', '');
    var GEMINI_MODEL = storage.get('gemini_model', DEFAULT_GEMINI_MODEL);

    var state = {};
    var allRubrics = [DEFAULT_FALLBACK_RUBRIC];
    var currentRubric = DEFAULT_FALLBACK_RUBRIC;
    var globalFeedbackGeneral = [];
    var globalFeedbackTags = [];
    var globalUsers = [];
    var globalAssignments = [];
    var selectedAssignmentId = "";
    var DEFAULT_EVALUATION_TYPES = ['Manual Audit', 'Validation Review', 'Delphi Eval', 'Chat', 'New Hire'];
    var globalEvalTypes = DEFAULT_EVALUATION_TYPES.slice();
    var DEFAULT_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    var storedModels = null;
    try {
        var rawStored = storage.get('gemini_models', null);
        if (rawStored) storedModels = JSON.parse(rawStored);
    } catch(e) {}
    var globalGeminiModels = (Array.isArray(storedModels) && storedModels.length > 0) ? storedModels : DEFAULT_GEMINI_MODELS.slice();
    var currentQaDisplayName = storage.get('qa_name', '');
    var qaFirstName = currentQaDisplayName ? currentQaDisplayName.split(' ')[0] : "";
    var existingRecordId = null;
    var DEFAULT_GENERAL_INSTRUCTION = "Write feedback in concise, objective, and action-oriented paragraphs. Each feedback must be written as a complete paragraph in professional English. Incorporate specific context from the interaction (e.g. customer statements, troubleshooting steps, tool names, reference IDs, cutoff times). Rephrase and enrich the QA's draft feedback while strictly preserving the QA's rating direction (e.g. met, excelled, or missed). Always ground the feedback in what actually occurred in the interaction without inventing or hallucinating scenarios. If the QA marks a standard as met, affirm how the standard was achieved based on real interaction events. Never include meta-instructions, prefixes like 'Feedback:', or mention formatting guidelines in the output.";

    var aiInstructions = {
        general: storage.get('ai_gen_instr', DEFAULT_GENERAL_INSTRUCTION),
        items: {}
    };
    try {
        var savedItemInstr = storage.get('ai_per_item_instr', '{}');
        aiInstructions.items = JSON.parse(savedItemInstr) || {};
    } catch(e) { aiInstructions.items = {}; }

    var saveInstructionsToDb = function(genText, perItemObj) {
        aiInstructions.general = genText !== undefined ? genText : aiInstructions.general;
        aiInstructions.items = perItemObj !== undefined ? perItemObj : aiInstructions.items;

        storage.set('ai_gen_instr', aiInstructions.general);
        storage.set('ai_per_item_instr', JSON.stringify(aiInstructions.items));

        var sKey = SUPABASE_KEY || storage.get('supabase_key', DEFAULT_SUPABASE_KEY);
        if (sKey) {
            return supabaseFetch('app_settings', 'POST', {
                gemini_api_key: GEMINI_API_KEY,
                gemini_model: GEMINI_MODEL,
                updated_at: new Date().toISOString()
            }).catch(function(){});
        }
        showToast("Instructions saved locally!", false);
        return Promise.resolve();
    };

    // --- Styles ---
    var sOverlay = "position:fixed;top:0;left:0;right:0;bottom:0;background:transparent;display:flex;align-items:flex-start;justify-content:center;z-index:99999;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding-top:20px;overflow-y:auto;pointer-events:none";
    var sModal = "background:white;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.25);width:90%;max-width:580px;height:82vh;max-height:820px;overflow:hidden;display:flex;flex-direction:column;cursor:grab;user-select:none;margin-bottom:20px;pointer-events:auto;position:relative";
    var sHeader = "padding:14px 20px;border-bottom:1px solid #e2e8f0;background:#ffffff;font-size:17px;font-weight:600;color:#1e293b;cursor:grab;display:flex;justify-content:space-between;align-items:center";
    var sContent = "padding:18px 20px;flex:1;color:#475569;font-size:13px;line-height:1.5;overflow-y:auto";
    var sGroupHeader = "margin:18px 0 10px;font-size:15px;font-weight:700;color:#2563eb;border-bottom:2px solid #2563eb;padding-bottom:4px";
    var sItemContainer = "margin-bottom:8px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;background:#ffffff";
    var sItemHeader = "width:100%;padding:10px 14px;background:#f8fafc;border:none;text-align:left;cursor:pointer;font-weight:500;color:#1e293b;display:flex;justify-content:space-between;align-items:center;transition:background 0.2s";
    var sItemBody = "display:none;padding:12px 14px;border-top:1px solid #e2e8f0;background:#ffffff";
    var sBtnGroup = "margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap";
    var sBtnBase = "flex:1;min-width:60px;padding:7px 10px;border:1px solid;border-radius:5px;cursor:pointer;font-weight:500;font-size:12px;transition:all 0.15s;text-align:center";
    var sSelect = "width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:5px;font-size:13px;background:white;cursor:pointer;box-sizing:border-box;margin:0;";
    var sTextarea = "width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:8px;font-family:inherit;resize:vertical;height:55px;font-size:13px;box-sizing:border-box;margin:0;";
    var sInput = "width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:5px;font-size:13px;box-sizing:border-box;margin:0;";
    var sLabel = "display:block;margin-bottom:4px;font-weight:600;font-size:12px;color:#334155";
    var sFooter = "padding:14px 20px;border-top:1px solid #e2e8f0;background:#ffffff;display:flex;gap:10px;justify-content:flex-end;align-items:center";
    var sBtnCancel = "padding:8px 16px;border:1px solid #cbd5e1;background:white;border-radius:5px;cursor:pointer;font-size:13px;color:#475569;font-weight:500";
    var sBtnGenerate = "padding:8px 16px;border:none;background:#2563eb;color:white;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;transition:opacity 0.2s";
    var sTagContainer = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px";
    var sLoading = "position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.88);display:flex;justify-content:center;align-items:center;z-index:10;font-size:14px;color:#475569;font-weight:500;flex-direction:column;gap:10px";

    var createElement = function(tag, css) {
        var el = document.createElement(tag);
        if(css) el.style.cssText = css;
        return el;
    };

    var addListener = function(el, event, handler) {
        el.addEventListener(event, handler);
    };

    var getColors = function(theme) {
        theme = (theme || 'gray').toLowerCase();
        var palettes = {
            green: { bg: "#d1fae5", border: "#10b981", txt: "#064e3b", header: "#ecfdf5" },
            red: { bg: "#fee2e2", border: "#ef4444", txt: "#7f1d1d", header: "#fef2f2" },
            yellow: { bg: "#fef3c7", border: "#f59e0b", txt: "#78350f", header: "#fffbeb" },
            gray: { bg: "#f1f5f9", border: "#94a3b8", txt: "#1e293b", header: "#f8fafc" },
            blue: { bg: "#dbeafe", border: "#3b82f6", txt: "#1e3a8a", header: "#eff6ff" }
        };
        if(theme === 'success') theme = 'green';
        if(theme === 'destructive') theme = 'red';
        if(theme === 'warning') theme = 'yellow';
        if(theme === 'neutral') theme = 'gray';
        return palettes[theme] || palettes.gray;
    };

    var getTheme = function(item, sel) {
        if (!item || !item.options) return 'gray';
        var opt = item.options.find(function(o){ return o.id === sel; });
        if(!opt || !opt.color) return 'gray';
        return opt.color.toLowerCase();
    };

    var showToast = function(msg, isError) {
        isError = isError === true;
        var toast = createElement("div");
        toast.textContent = msg;
        toast.style.cssText = "position:fixed;bottom:24px;right:24px;background:" + (isError ? '#ef4444' : '#10b981') + ";color:white;padding:12px 18px;border-radius:6px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.15);z-index:100005;font-size:13px;font-weight:600;opacity:0;transition:opacity 0.25s ease-in-out;pointer-events:none;";
        document.body.appendChild(toast);
        requestAnimationFrame(function(){ toast.style.opacity = "1"; });
        setTimeout(function(){
            toast.style.opacity = "0";
            setTimeout(function(){ toast.remove(); }, 300);
        }, 3200);
    };

    // --- IndexedDB Hybrid Cache ---
    var idb = {
        dbName: 'Toast_QA_Tracker_Cache',
        dbVersion: 2,
        storeName: 'app_cache',
        open: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                try {
                    var req = indexedDB.open(self.dbName, self.dbVersion);
                    req.onupgradeneeded = function(e) {
                        var db = e.target.result;
                        if (!db.objectStoreNames.contains(self.storeName)) {
                            db.createObjectStore(self.storeName, { keyPath: 'key' });
                        }
                    };
                    req.onsuccess = function(e) { resolve(e.target.result); };
                    req.onerror = function(e) { reject(e.target.error); };
                } catch(err) { reject(err); }
            });
        },
        get: function(key) {
            var self = this;
            return this.open().then(function(db) {
                return new Promise(function(resolve) {
                    try {
                        var tx = db.transaction(self.storeName, 'readonly');
                        var req = tx.objectStore(self.storeName).get(key);
                        req.onsuccess = function() { resolve(req.result ? req.result.value : null); };
                        req.onerror = function() { resolve(null); };
                    } catch(e) { resolve(null); }
                });
            }).catch(function() { return null; });
        },
        set: function(key, value) {
            var self = this;
            return this.open().then(function(db) {
                return new Promise(function(resolve) {
                    try {
                        var tx = db.transaction(self.storeName, 'readwrite');
                        tx.objectStore(self.storeName).put({ key: key, value: value });
                        tx.oncomplete = function() { resolve(true); };
                        tx.onerror = function() { resolve(false); };
                    } catch(e) { resolve(false); }
                });
            }).catch(function() { return false; });
        },
        delete: function(key) {
            var self = this;
            return this.open().then(function(db) {
                return new Promise(function(resolve) {
                    try {
                        var tx = db.transaction(self.storeName, 'readwrite');
                        tx.objectStore(self.storeName).delete(key);
                        tx.oncomplete = function() { resolve(true); };
                        tx.onerror = function() { resolve(false); };
                    } catch(e) { resolve(false); }
                });
            }).catch(function() { return false; });
        }
    };

    // --- Direct Gemini API Client ---
    var callGemini = function(prompt, systemInstruction) {
        if (!GEMINI_API_KEY) {
            showToast("Gemini API Key missing! Set it in ⚙️ Settings", true);
            showSettingsModal();
            return Promise.reject(new Error("Missing Gemini API Key"));
        }

        var url = "https://generativelanguage.googleapis.com/v1beta/models/" + (GEMINI_MODEL || DEFAULT_GEMINI_MODEL) + ":generateContent?key=" + GEMINI_API_KEY;
        var contents = [{ role: "user", parts: [{ text: prompt }] }];
        var payload = { contents: contents };
        if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };

        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(res) {
            if (!res.ok) {
                return res.json().then(function(err) {
                    throw new Error((err.error && err.error.message) || ("Gemini API error (" + res.status + ")"));
                });
            }
            return res.json();
        })
        .then(function(data) {
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                return data.candidates[0].content.parts.map(function(p){ return p.text; }).join("").trim();
            }
            throw new Error("No response from Gemini");
        });
    };

    // --- General Utility Helpers ---
    var normalizeDateStr = function(dStr) {
        if (!dStr) return "";
        if (dStr instanceof Date) {
            var m = ('0' + (dStr.getMonth() + 1)).slice(-2);
            var d = ('0' + dStr.getDate()).slice(-2);
            return dStr.getFullYear() + '-' + m + '-' + d;
        }
        var str = String(dStr).split('T')[0].trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return str;
        }
        if (str.includes('/')) {
            var p = str.split('/');
            if (p.length === 3) {
                var mm = p[0].padStart(2, '0');
                var dd = p[1].padStart(2, '0');
                var yyyy = p[2].length === 2 ? ('20' + p[2]) : p[2];
                return yyyy + '-' + mm + '-' + dd;
            }
        }
        var parsed = new Date(dStr);
        if (!isNaN(parsed.getTime())) {
            var yr = parsed.getFullYear();
            var mo = ('0' + (parsed.getMonth() + 1)).slice(-2);
            var dy = ('0' + parsed.getDate()).slice(-2);
            return yr + '-' + mo + '-' + dy;
        }
        return str;
    };

    var formatEmailToName = function(email) {
        if (!email) return "";
        var namePart = String(email).split('@')[0];
        return namePart.split('.').map(function(part){
            return part.charAt(0).toUpperCase() + part.slice(1);
        }).join(' ');
    };

    var formatToDisplayName = function(fullName) {
        if (!fullName) return "";
        var str = String(fullName).trim();
        if (str.includes(',')) {
            var parts = str.split(',');
            var lastPart = parts[0].trim();
            var firstPart = parts[1].trim();
            var firstName = firstPart.split(' ')[0];
            var lastName = lastPart;
            var lastSpaceIdx = lastPart.lastIndexOf(' ');
            if (lastSpaceIdx !== -1) {
                lastName = lastPart.substring(0, lastSpaceIdx);
            }
            return (firstName + ' ' + lastName).trim();
        }
        return str;
    };

    // --- Stella Connect DOM Extractors ---
    var extractText = function(selector) {
        var el = document.querySelector(selector);
        return el ? el.textContent.trim() : "";
    };

    var extractTranscript = function() {
        var els = document.querySelectorAll('.spec-transcript-content');
        if (els.length > 0) {
            return Array.from(els).map(function(el){ return el.innerText.trim(); }).join("\n");
        }
        var alt = document.querySelector('.transcript-container, [data-testid="transcript"], .conversation-body');
        return alt ? alt.innerText.trim() : "";
    };

    var getInteractionId = function() {
        var h4s = Array.from(document.querySelectorAll('h4'));
        var h4 = h4s.find(function(el){ return el.textContent.trim() === 'Interaction ID'; });
        return h4 && h4.nextElementSibling ? h4.nextElementSibling.textContent.trim() : "";
    };

    var getInteractionDateFromPage = function() {
        var h4s = Array.from(document.querySelectorAll('h4'));
        var h4 = h4s.find(function(el){
            var txt = el.textContent.trim().toLowerCase();
            return txt.includes('interaction date') || txt.includes('date of interaction') || txt.includes('call date');
        });
        if (h4 && h4.nextElementSibling) {
            var val = h4.nextElementSibling.textContent.trim();
            return normalizeDateStr(val);
        }
        return "";
    };

    var getAdvocateNameFromPage = function() {
        return extractText('.review-info h2');
    };

    var getAniDnisOptions = function() {
        var h4s = Array.from(document.querySelectorAll('h4'));
        var opts = [];
        var dnisH4 = h4s.find(function(el){ return el.textContent.trim() === 'DNIS'; });
        if(dnisH4 && dnisH4.nextElementSibling) opts.push(dnisH4.nextElementSibling.textContent.trim());
        var aniH4 = h4s.find(function(el){ return el.textContent.trim() === 'ANI'; });
        if(aniH4 && aniH4.nextElementSibling) opts.push(aniH4.nextElementSibling.textContent.trim());
        return opts;
    };

    var getCallDuration = function() {
        var h4s = Array.from(document.querySelectorAll('h4'));
        var h4 = h4s.find(function(el){ return el.textContent.includes('Call Duration'); });
        if(h4 && h4.nextElementSibling) {
            var val = parseFloat(h4.nextElementSibling.textContent.trim());
            return isNaN(val) ? "" : Math.round(val);
        }
        return "";
    };

    // --- UI Creation ---
    var overlay = createElement("div", sOverlay);
    overlay.id = "qa-modal-overlay";
    var modal = createElement("div", sModal);

    var loader = createElement("div", sLoading);
    loader.innerHTML = "<div>Loading Toast QA Tool...</div>";
    loader.style.display = "none";
    modal.appendChild(loader);

    var showLoading = function(msg) {
        if(msg) loader.innerHTML = "<div>" + msg + "</div>";
        loader.style.display = "flex";
    };
    var hideLoading = function() {
        loader.style.display = "none";
    };

    // --- Draggable Modal Helper ---
    var makeDraggable = function(modalEl, headerEl) {
        var isDragging = false, startX = 0, startY = 0, currentX = 0, currentY = 0;
        addListener(headerEl, "mousedown", function(e){
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.textContent === '×' || (toolsContainer && (e.target === toolsContainer || toolsContainer.contains(e.target)))) return;
            isDragging = true;
            startX = e.clientX - currentX;
            startY = e.clientY - currentY;
            headerEl.style.cursor = "grabbing";
        });
        addListener(document, "mousemove", function(e){
            if(isDragging) {
                currentX = e.clientX - startX;
                currentY = e.clientY - startY;
                modalEl.style.transform = "translate(" + currentX + "px, " + currentY + "px)";
            }
        });
        addListener(document, "mouseup", function(){
            if(isDragging) {
                isDragging = false;
                headerEl.style.cursor = "grab";
            }
        });
    };

    var header = createElement("div", sHeader);
    var headerTitle = createElement("span");
    var updateHeaderTitle = function() {
        var namePart = qaFirstName || (currentQaDisplayName ? currentQaDisplayName.split(' ')[0] : (QA_EMAIL ? formatEmailToName(QA_EMAIL).split(' ')[0] : ''));
        headerTitle.innerHTML = "🍞 <strong>QA Tracker</strong>" + (namePart ? " - " + namePart : "");
    };
    updateHeaderTitle();
    header.appendChild(headerTitle);

    var toolsContainer = createElement("div", "position:relative;display:flex;align-items:center;gap:6px");

    var btnRefresh = createElement("span");
    btnRefresh.textContent = "🔄";
    btnRefresh.title = "Force Refresh Database";
    btnRefresh.style.cssText = "cursor:pointer;font-size:16px;padding:4px 6px;border-radius:4px;transition:transform 0.5s ease, background 0.2s;user-select:none;display:inline-block;";
    addListener(btnRefresh, "mouseenter", function(){ btnRefresh.style.background = "rgba(0,0,0,0.06)"; });
    addListener(btnRefresh, "mouseleave", function(){ btnRefresh.style.background = "transparent"; });
    addListener(btnRefresh, "click", function(e){
        e.stopPropagation();
        btnRefresh.style.transform = "rotate(360deg)";
        setTimeout(function(){ btnRefresh.style.transform = "rotate(0deg)"; }, 600);
        storage.set('last_sync_ts', '');
        showLoading("Force syncing latest data from Google Sheets...");
        idb.delete('cached_payload').finally(function(){
            checkAndSyncData(true);
        });
    });

    var btnChecker = createElement("span");
    btnChecker.textContent = "🔍";
    btnChecker.title = "Interaction Checker";
    btnChecker.style.cssText = "cursor:pointer;font-size:16px;padding:4px 6px;border-radius:4px;transition:background 0.2s;user-select:none";
    addListener(btnChecker, "mouseenter", function(){ btnChecker.style.background = "rgba(0,0,0,0.06)"; });
    addListener(btnChecker, "mouseleave", function(){ btnChecker.style.background = "transparent"; });
    addListener(btnChecker, "click", function(e){
        e.stopPropagation();
        showInteractionCheckerModal();
    });

    var btnTools = createElement("span");
    btnTools.textContent = "⚙️";
    btnTools.title = "Configure Settings";
    btnTools.style.cssText = "cursor:pointer;font-size:16px;padding:4px 6px;border-radius:4px;transition:background 0.2s;user-select:none";
    addListener(btnTools, "mouseenter", function(){ btnTools.style.background = "rgba(0,0,0,0.06)"; });
    addListener(btnTools, "mouseleave", function(){ btnTools.style.background = "transparent"; });
    addListener(btnTools, "click", function(e){
        e.stopPropagation();
        showSettingsModal(false);
    });

    // --- AI Modal Helpers ---
    var createAccordion = function(title, contentNodes, isOpen) {
        var container = createElement("div");
        container.style.cssText = "border:1px solid #e2e8f0;border-radius:6px;margin-bottom:12px;overflow:visible;height:auto;flex-shrink:0;";
        var aHeader = createElement("div");
        aHeader.style.cssText = "padding:10px 14px;background:#f8fafc;cursor:pointer;font-weight:600;font-size:13px;color:#1e293b;display:flex;justify-content:space-between;align-items:center;user-select:none";
        aHeader.innerHTML = "<span>" + title + "</span><span style='font-size:11px;color:#94a3b8'>" + (isOpen ? "▲" : "▼") + "</span>";
        var aBody = createElement("div");
        aBody.style.cssText = "padding:14px;border-top:1px solid #e2e8f0;background:#ffffff;display:" + (isOpen ? "block" : "none") + ";overflow:visible;height:auto;";
        if(Array.isArray(contentNodes)) {
            contentNodes.forEach(function(n){ aBody.appendChild(n); });
        } else {
            aBody.appendChild(contentNodes);
        }
        addListener(aHeader, "click", function(){
            var isHidden = aBody.style.display === "none";
            aBody.style.display = isHidden ? "block" : "none";
            aHeader.lastChild.textContent = isHidden ? "▲" : "▼";
        });
        container.appendChild(aHeader);
        container.appendChild(aBody);
        return { container: container, body: aBody };
    };

    // Helper to wrap input/select with an in-field icon (uniform 36px height, margin 0, left padding 36px)
    var createIconFieldWrapper = function(icon, element, fullWidth) {
        var wrap = createElement("div");
        wrap.style.cssText = "position:relative;display:flex;align-items:center;width:100%;margin:0;" + (fullWidth ? "grid-column:1 / -1;" : "");

        var iconEl = createElement("span");
        iconEl.textContent = icon;
        iconEl.style.cssText = "position:absolute;left:11px;pointer-events:none;font-size:13px;z-index:2;user-select:none;display:inline-flex;align-items:center;justify-content:center;";

        element.style.paddingLeft = "36px";
        element.style.boxSizing = "border-box";
        element.style.width = "100%";
        element.style.height = "36px";
        element.style.paddingTop = "0";
        element.style.paddingBottom = "0";
        element.style.margin = "0";

        wrap.appendChild(iconEl);
        wrap.appendChild(element);
        return wrap;
    };

    // --- Interaction Checker Modal ---
    var showInteractionCheckerModal = function() {
        if (document.getElementById('qa-interaction-checker-overlay')) return;

        var pOverlay = createElement("div", sOverlay + "; z-index:100002; background:transparent; pointer-events:none; display:flex; justify-content:center; align-items:flex-start; padding-top:20px; padding-bottom:20px; overflow-y:auto;");
        pOverlay.id = "qa-interaction-checker-overlay";
        var pModal = createElement("div", "background:white;border-radius:8px;box-shadow:0 16px 40px rgba(0,0,0,0.28);width:90%;max-width:580px;height:82vh;max-height:820px;display:flex;flex-direction:column;cursor:default;user-select:auto;pointer-events:auto;position:relative;border:1px solid #cbd5e1;overflow:hidden;margin-bottom:20px;");
        var pHeader = createElement("div", sHeader + "; cursor:grab; border-radius:8px 8px 0 0; background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:12px 18px; flex-shrink:0;");
        pHeader.innerHTML = "<span style='font-size:15px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:6px;'>🔍 <span>Interaction Checker</span></span>";
        var pClose = createElement("span", "cursor:pointer;font-size:20px;color:#94a3b8;line-height:1;font-weight:400;padding:2px 6px;border-radius:4px;transition:all 0.15s");
        pClose.textContent = "×";
        addListener(pClose, "mouseenter", function(){ pClose.style.color = "#ef4444"; pClose.style.background = "#fee2e2"; });
        addListener(pClose, "mouseleave", function(){ pClose.style.color = "#94a3b8"; pClose.style.background = "transparent"; });
        addListener(pClose, "click", function(){ pOverlay.remove(); });
        pHeader.appendChild(pClose);

        makeDraggable(pModal, pHeader);

        var pBody = createElement("div", "padding:16px 20px;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:12px;user-select:text;scrollbar-width:thin;scrollbar-color:#94a3b8 #f1f5f9;");

        // --- Section 1: Input Data & Metadata ---
        var divInputs = createElement("div", "display:flex;flex-direction:column;gap:10px;overflow:visible;height:auto;");

        // 1. Subject Line
        var inpSubject = createElement("input", sInput);
        inpSubject.placeholder = "Subject Line";
        if (txtIssue && txtIssue.value) inpSubject.value = txtIssue.value.trim();
        var wrapSubject = createIconFieldWrapper("🏷️", inpSubject, true);
        divInputs.appendChild(wrapSubject);

        // 2. Description
        var inpDescription = createElement("input", sInput);
        inpDescription.placeholder = "Description";
        var wrapDescription = createIconFieldWrapper("📄", inpDescription, true);
        divInputs.appendChild(wrapDescription);

        // 3. Advocate Case Notes (with in-field 🗒️ icon)
        var wrapNotes = createElement("div", "position:relative;display:flex;align-items:flex-start;width:100%;margin:0;");
        var icoNotes = createElement("span", "position:absolute;left:11px;top:10px;pointer-events:none;font-size:13px;z-index:2;user-select:none;");
        icoNotes.textContent = "🗒️";
        var txtNotes = createElement("textarea", sTextarea);
        txtNotes.placeholder = "Advocate Case Notes";
        txtNotes.style.cssText = "width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:8px 12px 8px 36px;font-family:inherit;resize:vertical;height:100px;font-size:13px;box-sizing:border-box;margin:0;";
        wrapNotes.appendChild(icoNotes);
        wrapNotes.appendChild(txtNotes);
        divInputs.appendChild(wrapNotes);

        // 4. Transcript Source & Upload Bar
        var uploadedTranscript = null;
        var uploadedFileName = "";
        var pageTranscript = extractTranscript();

        var transcriptBar = createElement("div", "display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;gap:8px;");
        var transcriptStatus = createElement("div", "display:flex;align-items:center;gap:6px;font-size:12px;color:#475569;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;");
        var fileUploadInput = createElement("input");
        fileUploadInput.type = "file";
        fileUploadInput.accept = ".txt,.vtt,.srt,.csv,.log";
        fileUploadInput.style.display = "none";

        var btnUpload = createElement("button", "padding:4px 10px;font-size:11px;font-weight:600;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;transition:all 0.15s");
        btnUpload.innerHTML = "<span>📁</span> <span>Upload File</span>";
        addListener(btnUpload, "mouseenter", function(){ btnUpload.style.background = "#dbeafe"; });
        addListener(btnUpload, "mouseleave", function(){ btnUpload.style.background = "#eff6ff"; });
        addListener(btnUpload, "click", function(e){ e.preventDefault(); fileUploadInput.click(); });

        // Editor Drawer for viewing/editing transcript
        var transcriptEditorContainer = createElement("div", "display:none;flex-direction:column;gap:6px;padding:10px;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;margin-top:2px;");
        var editorHeader = createElement("div", "display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:700;color:#1e293b;");
        var editorTitle = createElement("span");
        editorTitle.textContent = "📄 Transcript Editor";
        var editorRight = createElement("div", "display:flex;align-items:center;gap:8px;");
        var editorWordsCount = createElement("span", "font-size:11px;font-weight:500;color:#64748b;");
        var btnCloseEditor = createElement("span", "cursor:pointer;color:#94a3b8;font-size:14px;padding:1px 5px;border-radius:3px;");
        btnCloseEditor.textContent = "✕";
        btnCloseEditor.title = "Close editor";
        addListener(btnCloseEditor, "click", function(){
            transcriptEditorContainer.style.display = "none";
        });
        editorRight.appendChild(editorWordsCount);
        editorRight.appendChild(btnCloseEditor);
        editorHeader.appendChild(editorTitle);
        editorHeader.appendChild(editorRight);

        var txtTranscriptEditor = createElement("textarea", sTextarea + "; height:130px; resize:vertical; font-size:12px; line-height:1.4; font-family:monospace;");
        txtTranscriptEditor.placeholder = "Transcript text...";

        var updateEditorWords = function() {
            var words = (txtTranscriptEditor.value || "").trim().split(/\s+/).filter(Boolean).length;
            editorWordsCount.textContent = words + " words";
        };

        addListener(txtTranscriptEditor, "input", function(){
            uploadedTranscript = txtTranscriptEditor.value;
            if (!uploadedFileName) uploadedFileName = "Edited Transcript.txt";
            updateTranscriptStatusUI();
            updateEditorWords();
        });

        transcriptEditorContainer.appendChild(editorHeader);
        transcriptEditorContainer.appendChild(txtTranscriptEditor);

        // View/Edit transcript button
        var btnView = createElement("span", "cursor:pointer;color:#2563eb;margin-left:6px;font-size:12px;padding:2px 6px;border-radius:3px;background:#eff6ff;border:1px solid #bfdbfe;display:inline-flex;align-items:center;justify-content:center;transition:background 0.15s;");
        btnView.textContent = "👁️";
        btnView.title = "View & Edit transcript text";
        addListener(btnView, "mouseenter", function(){ btnView.style.background = "#dbeafe"; });
        addListener(btnView, "mouseleave", function(){ btnView.style.background = "#eff6ff"; });
        addListener(btnView, "click", function(e){
            e.stopPropagation();
            var isVis = transcriptEditorContainer.style.display === "flex";
            if (isVis) {
                transcriptEditorContainer.style.display = "none";
            } else {
                txtTranscriptEditor.value = uploadedTranscript !== null ? uploadedTranscript : (pageTranscript || extractTranscript() || "");
                editorTitle.textContent = uploadedTranscript !== null ? ("📄 " + (uploadedFileName || "Uploaded File")) : "📄 Page Transcript";
                updateEditorWords();
                transcriptEditorContainer.style.display = "flex";
                txtTranscriptEditor.focus();
            }
        });

        // Reset / Delete uploaded file button (just an '✕' icon)
        var btnReset = createElement("span", "cursor:pointer;color:#ef4444;margin-left:4px;font-weight:700;font-size:11px;padding:2px 6px;border-radius:3px;background:#fee2e2;display:inline-flex;align-items:center;justify-content:center;transition:background 0.15s;");
        btnReset.textContent = "✕";
        btnReset.title = "Remove uploaded file / Revert to page transcript";
        addListener(btnReset, "mouseenter", function(){ btnReset.style.background = "#fecaca"; });
        addListener(btnReset, "mouseleave", function(){ btnReset.style.background = "#fee2e2"; });
        addListener(btnReset, "click", function(e){
            e.stopPropagation();
            uploadedTranscript = null;
            uploadedFileName = "";
            fileUploadInput.value = "";
            txtTranscriptEditor.value = "";
            transcriptEditorContainer.style.display = "none";
            updateTranscriptStatusUI();
        });

        var updateTranscriptStatusUI = function() {
            transcriptStatus.innerHTML = "";
            if (uploadedTranscript !== null && uploadedTranscript !== undefined) {
                var words = uploadedTranscript.trim().split(/\s+/).filter(Boolean).length;
                transcriptStatus.innerHTML = "<span>📁</span> <span style='font-weight:600;color:#1e293b;overflow:hidden;text-overflow:ellipsis;max-width:180px;display:inline-block;vertical-align:bottom;white-space:nowrap;'>" + (uploadedFileName || "file.txt") + "</span> <span style='color:#64748b;'>(" + words + " words)</span>";
                transcriptStatus.appendChild(btnView);
                transcriptStatus.appendChild(btnReset);
            } else {
                pageTranscript = extractTranscript();
                var pWords = pageTranscript ? pageTranscript.trim().split(/\s+/).filter(Boolean).length : 0;
                if (pWords > 0) {
                    transcriptStatus.innerHTML = "<span>📄</span> <span style='color:#1e293b;font-weight:600;'>Page Transcript</span> <span style='color:#64748b;'>(" + pWords + " words detected)</span>";
                    transcriptStatus.appendChild(btnView);
                } else {
                    transcriptStatus.innerHTML = "<span>⚠️</span> <span style='color:#b45309;font-weight:500;'>No transcript found on page</span> <span style='color:#94a3b8;'>(Upload file to supply)</span>";
                }
            }
        };

        addListener(fileUploadInput, "change", function(e){
            var file = e.target.files && e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(evt) {
                uploadedTranscript = evt.target.result || "";
                uploadedFileName = file.name;
                txtTranscriptEditor.value = uploadedTranscript;
                editorTitle.textContent = "📄 " + file.name;
                updateEditorWords();
                transcriptEditorContainer.style.display = "flex";
                updateTranscriptStatusUI();
                showToast("Loaded transcript: " + file.name, false);
            };
            reader.onerror = function() {
                showToast("Failed to read file", true);
            };
            reader.readAsText(file);
        });

        updateTranscriptStatusUI();
        transcriptBar.appendChild(transcriptStatus);
        transcriptBar.appendChild(btnUpload);
        transcriptBar.appendChild(fileUploadInput);
        divInputs.appendChild(transcriptBar);
        divInputs.appendChild(transcriptEditorContainer);

        // 5. Processing Scope & Interaction Type Indicator
        var scopeBar = createElement("div", "display:flex;align-items:center;justify-content:space-between;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 12px;font-size:11px;color:#1e40af;");
        var scopeTargetEl = createElement("div", "font-weight:600;display:flex;align-items:center;gap:4px;");
        var scopeTypeEl = createElement("div", "color:#3b82f6;font-weight:500;display:flex;align-items:center;gap:4px;");

        var updateScopeBarUI = function() {
            var allKeys = Object.keys(state);
            var checkedKeys = allKeys.filter(function(k){ return state[k] && state[k].checked; });
            if (checkedKeys.length > 0) {
                scopeTargetEl.innerHTML = "<span>🎯 Target:</span> <span style='color:#1d4ed8;'>" + checkedKeys.length + " checked line item(s)</span>";
            } else {
                var draftCount = allKeys.filter(function(k){ return state[k] && (state[k].text || (state[k].domTextarea && state[k].domTextarea.value)); }).length;
                scopeTargetEl.innerHTML = "<span>🎯 Target:</span> <span style='color:#1d4ed8;'>All line items (" + (draftCount > 0 ? draftCount + " with draft" : "evaluating all") + ")</span>";
            }

            var curType = (selEvalType && selEvalType.value) ? selEvalType.value : "Standard";
            var isChat = curType.toLowerCase().includes("chat");
            scopeTypeEl.innerHTML = "<span>" + (isChat ? "💬 Live Chat" : "📞 Phone / Voice") + "</span> <span style='color:#60a5fa;'>(" + curType + ")</span>";
        };
        updateScopeBarUI();
        scopeBar.appendChild(scopeTargetEl);
        scopeBar.appendChild(scopeTypeEl);
        divInputs.appendChild(scopeBar);

        var inputAccordion = createAccordion("Input Data & Context", divInputs, true);
        pBody.appendChild(inputAccordion.container);

        // --- Section 2: Instructions & Format Preferences ---
        var divInstr = createElement("div", "display:flex;flex-direction:column;gap:12px;overflow:visible;height:auto;");

        var grpGenInstr = createElement("div");
        var lblGenInstr = createElement("label", sLabel);
        lblGenInstr.textContent = "General Instruction (Applies to all line items)";
        var txtGenInstr = createElement("textarea", sTextarea + "; height:70px; resize:vertical; font-size:12px; line-height:1.4;");
        txtGenInstr.placeholder = "Enter global feedback guidelines, tone, context rules...";
        txtGenInstr.value = aiInstructions.general || DEFAULT_GENERAL_INSTRUCTION;
        grpGenInstr.appendChild(lblGenInstr);
        grpGenInstr.appendChild(txtGenInstr);
        divInstr.appendChild(grpGenInstr);

        // Per-item override accordion
        var perItemContainer = createElement("div", "display:flex;flex-direction:column;gap:10px;height:auto;overflow:visible;width:100%;");
        var perItemInputs = {};

        var rawSections = [];
        if (currentRubric) {
            if (Array.isArray(currentRubric.sections)) rawSections = currentRubric.sections;
            else if (Array.isArray(currentRubric.structure)) rawSections = currentRubric.structure;
            else if (typeof currentRubric.structure === 'string') {
                try { rawSections = JSON.parse(currentRubric.structure); } catch(e) {}
            }
        }
        if (rawSections.length === 0 && DEFAULT_FALLBACK_RUBRIC) {
            rawSections = typeof DEFAULT_FALLBACK_RUBRIC.structure === 'string' ? JSON.parse(DEFAULT_FALLBACK_RUBRIC.structure) : (DEFAULT_FALLBACK_RUBRIC.sections || []);
        }

        var itemCounter = 0;
        rawSections.forEach(function(sec, sIdx){
            (sec.items || []).forEach(function(it, iIdx){
                itemCounter++;
                var key = sIdx + ":" + iIdx;
                var itName = (it.question || it.shortName || it.short_name || it.text || ("Item " + itemCounter)).replace(/^\d+\.\s*/, "");
                
                var itemRow = createElement("div", "display:flex;flex-direction:column;gap:5px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;overflow:visible;height:auto;");
                var itLabel = createElement("div", "font-size:12px;font-weight:600;color:#334155;line-height:1.3;");
                itLabel.textContent = itemCounter + ". " + itName;
                
                var itTextarea = createElement("textarea", sTextarea + ";font-size:12px;padding:6px 8px;height:52px;resize:vertical;line-height:1.4;box-sizing:border-box;width:100%;");
                itTextarea.placeholder = "Inherits General Instruction above...";
                if (aiInstructions.items && aiInstructions.items[key]) {
                    itTextarea.value = aiInstructions.items[key];
                }
                perItemInputs[key] = itTextarea;

                itemRow.appendChild(itLabel);
                itemRow.appendChild(itTextarea);
                perItemContainer.appendChild(itemRow);
            });
        });

        var perItemAccordion = createAccordion("Per-Line-Item Format Overrides (" + itemCounter + " items)", perItemContainer, false);
        divInstr.appendChild(perItemAccordion.container);

        var btnSaveInstr = createElement("button", "align-self:flex-start;padding:8px 16px;background:#059669;color:white;border:none;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:opacity 0.15s;margin-top:4px;");
        btnSaveInstr.innerHTML = "<span>💾</span> <span>Save Instructions to Database</span>";
        addListener(btnSaveInstr, "click", function(){
            var perItemObj = {};
            Object.keys(perItemInputs).forEach(function(k){
                var v = perItemInputs[k].value.trim();
                if (v) perItemObj[k] = v;
            });
            btnSaveInstr.disabled = true;
            btnSaveInstr.textContent = "Saving...";
            saveInstructionsToDb(txtGenInstr.value.trim(), perItemObj).finally(function(){
                btnSaveInstr.disabled = false;
                btnSaveInstr.innerHTML = "<span>💾</span> <span>Save Instructions to Database</span>";
            });
        });
        divInstr.appendChild(btnSaveInstr);

        var instrAccordion = createAccordion("⚙️ Output Instructions & Format Preferences", divInstr, false);
        pBody.appendChild(instrAccordion.container);

        // --- Section 3: Analysis Results ---
        var divOutput = createElement("div", "font-size:13px;line-height:1.6;color:#1e293b;user-select:text;overflow:visible;height:auto;");
        var resPlaceholder = createElement("div");
        resPlaceholder.innerHTML = "<div style='color:#94a3b8;font-style:italic;padding:18px;text-align:center;background:#f8fafc;border-radius:6px;border:1px dashed #cbd5e1'>Analysis results and feedback audit will appear here after clicking Generate Analysis...</div>";
        divOutput.appendChild(resPlaceholder);
        var outputAccordion = createAccordion("📊 Analysis Results", divOutput, true);
        pBody.appendChild(outputAccordion.container);

        // Footer
        var pFooter = createElement("div", sFooter + "; flex-shrink:0; display:flex; justify-content:space-between; align-items:center;");

        // Model Selector Container in AI drawer
        var modelSelectWrap = createElement("div", "display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#475569;");
        modelSelectWrap.innerHTML = "<span>🤖 Model:</span>";
        var selModelInModal = createElement("select", "padding:4px 8px; border:1px solid #cbd5e1; border-radius:5px; font-size:12px; background:white; font-family:inherit; color:#1e293b; cursor:pointer; font-weight:500; outline:none;");
        ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'].forEach(function(m){
            var opt = createElement("option");
            opt.value = m;
            opt.textContent = m;
            if (m === (GEMINI_MODEL || DEFAULT_GEMINI_MODEL)) opt.selected = true;
            selModelInModal.appendChild(opt);
        });
        addListener(selModelInModal, "change", function(){
            GEMINI_MODEL = selModelInModal.value;
            storage.set('gemini_model', GEMINI_MODEL);
            showToast("Gemini model set to " + GEMINI_MODEL, false);
        });
        modelSelectWrap.appendChild(selModelInModal);
        pFooter.appendChild(modelSelectWrap);

        var pFooterRight = createElement("div", "display:flex; align-items:center; gap:8px;");
        var pBtnCancel = createElement("button", sBtnCancel);
        pBtnCancel.textContent = "Close";
        addListener(pBtnCancel, "click", function(){ pOverlay.remove(); });
        pFooterRight.appendChild(pBtnCancel);

        var pBtnGen = createElement("button", sBtnGenerate);
        pBtnGen.textContent = "Generate Analysis";
        pFooterRight.appendChild(pBtnGen);
        pFooter.appendChild(pFooterRight);
        
        addListener(pBtnGen, "click", function(){
            var transcript = uploadedTranscript || extractTranscript();
            var subject = inpSubject.value.trim();
            var description = inpDescription.value.trim();
            var notes = txtNotes.value.trim();
            var evalTypeVal = (selEvalType && selEvalType.value) ? selEvalType.value : "Standard";
            var isChat = evalTypeVal.toLowerCase().includes("chat");

            if (!transcript && !notes) {
                return showToast("Please provide either a transcript or Advocate Case Notes.", true);
            }

            pBtnGen.disabled = true;
            pBtnGen.textContent = "Generating... ⏳";
            resPlaceholder.innerHTML = "<div style='padding:24px;text-align:center;color:#2563eb;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:10px;'><div>🚀 Gemini is evaluating interaction & generating targeted feedback...</div><div style='font-size:12px;color:#64748b;font-weight:normal;'>Processing transcript, case notes, rubric matrix, and formatting instructions in one pass</div></div>";

            // Determine Target Line Items based on Checkboxes
            var allKeys = Object.keys(state);
            var checkedKeys = allKeys.filter(function(k){ return state[k] && state[k].checked; });
            var targetKeys = checkedKeys.length > 0 ? checkedKeys : allKeys;

            var cleanFbText = function(t) { return (t || "").replace(/\s*Source:[\s\S]*$/i, "").trim(); };

            var itemsPayload = targetKeys.map(function(k){
                var s = state[k];
                if (!s) return null;
                var selOpt = (s.options && s.options[s.selIndex]) ? s.options[s.selIndex] : (s.options && s.options[0]);
                var draftFb = (s.text || (s.domTextarea && s.domTextarea.value) || "").trim();
                
                var customFormat = (perItemInputs[k] && perItemInputs[k].value.trim()) || (aiInstructions.items && aiInstructions.items[k]) || "";

                var optionsSummary = (s.options || []).map(function(o){
                    return o.label + (o.points !== undefined ? " (" + o.points + " pts)" : "");
                }).join(" | ");

                var optionsDetailed = (s.options || []).map(function(o, optIdx){
                    var genFeedback = globalFeedbackGeneral.find(function(f){
                        var matchRubric = !f.rubricId || !currentRubric || !currentRubric.id || String(f.rubricId) === String(currentRubric.id);
                        var matchSec = (f.sectionIndex === s.secIdx || f.section_index === s.secIdx);
                        var matchItem = (f.itemIndex === s.itemIdx || f.item_index === s.itemIdx);
                        var matchOpt = (f.optionIndex === optIdx || f.option_index === optIdx);
                        return matchRubric && matchSec && matchItem && matchOpt;
                    });
                    var optionChips = globalFeedbackTags.filter(function(t){
                        return (t.sectionIndex === s.secIdx || t.section_index === s.secIdx) &&
                               (t.itemIndex === s.itemIdx || t.item_index === s.itemIdx) &&
                               (t.optionIndex === optIdx || t.option_index === optIdx);
                    }).map(function(t){
                        return cleanFbText(t.feedbackText || t.feedback_text || t.buttonLabel || t.button_label || '');
                    }).filter(Boolean);

                    return {
                        label: o.label,
                        points: o.points !== undefined ? o.points : 0,
                        isCorrect: o.isCorrect === true,
                        guidelineTemplate: genFeedback ? cleanFbText(genFeedback.feedbackText || genFeedback.feedback_text) : "",
                        availableCoachingChips: optionChips
                    };
                });

                return {
                    key: k,
                    question: s.question,
                    section: s.sectionName || s.groupName,
                    optionsAvailable: optionsSummary,
                    allRatingOptionsWithGuidelines: optionsDetailed,
                    userSelectedRating: selOpt ? selOpt.label : "N/A",
                    isCorrect: selOpt ? (selOpt.isCorrect === true) : null,
                    draftFeedback: draftFb,
                    itemFormatInstruction: customFormat
                };
            }).filter(Boolean);

            var genPrompt = txtGenInstr.value.trim() || DEFAULT_GENERAL_INSTRUCTION;

            var fullPrompt = "You are a senior QA Auditor and Feedback Coach for customer support interactions.\n\n" +
                "=== INTERACTION CONTEXT ===\n" +
                "Interaction Type: " + (isChat ? "Live Chat (Customer Messaging)" : "Phone Call (Voice Audio Transcript)") + "\n" +
                "Evaluation Type: " + evalTypeVal + "\n" +
                "Subject Line: " + (subject || "N/A") + "\n" +
                "Description: " + (description || "N/A") + "\n" +
                "Advocate Case Notes:\n" + (notes || "N/A") + "\n\n" +
                "=== INTERACTION TRANSCRIPT ===\n" + (transcript || "No transcript available.") + "\n\n" +
                "=== QA RUBRIC MATRIX & EVALUATION STATE ===\n" +
                JSON.stringify(itemsPayload, null, 2) + "\n\n" +
                "=== GENERAL INSTRUCTIONS ===\n" + genPrompt + "\n\n" +
                "=== STRICT GENERATION RULES ===\n" +
                "1. SUMMARY OF INTERACTION:\n" +
                "   - summary: 1-2 concise sentences summarizing the customer's core inquiry and resolution.\n" +
                "2. PROCESSED FEEDBACK PER LINE ITEM (IN 'feedbacks'):\n" +
                "   - The QA Auditor's userSelectedRating is authoritative for this field.\n" +
                "   - IF isCorrect is TRUE (or userSelectedRating is 'Quality standard met' / 'Quality standard excelled'):\n" +
                "     * The processed feedback MUST be positive and affirming, validating what the advocate did well.\n" +
                "     * FACT-GROUNDING WITHOUT INVENTING SCENARIOS: Always ground the feedback in the true events of the interaction transcript. If the QA marks a standard as met, affirm how the standard was achieved based on real interaction events without inventing or hallucinating scenarios that did not occur.\n" +
                "     * Rephrase, refine, and enrich the QA's draftFeedback by incorporating specific context from the interaction (customer issue, troubleshooting steps, tool names, reference IDs, cutoff times).\n" +
                "     * NEVER write negative criticism or contradict the QA's rating direction in this field.\n" +
                "   - IF isCorrect is FALSE (or userSelectedRating is 'Quality standard missed'):\n" +
                "     * The processed feedback MUST be constructive coaching, pinpointing the specific gap or missing process.\n" +
                "     * Incorporate specific details from the interaction.\n" +
                "   - IF draftFeedback is blank/empty, generate a professional feedback paragraph confirming why the rating standard was achieved or missed according to userSelectedRating and interaction facts.\n" +
                "   - PARAGRAPH FORMAT: Every feedback entry MUST be written as a complete, cohesive paragraph in professional English. Do NOT use bullet points or meta-prefixes like 'Feedback:'.\n" +
                "3. AI DISSENTING OBSERVATIONS FOR RECONSIDERATION (IN 'lineItemReconsiderations'):\n" +
                "   - Perform an independent audit of the interaction transcript and notes against the QA guidelines.\n" +
                "   - Review all rating options and their coaching guidelines provided under 'allRatingOptionsWithGuidelines'.\n" +
                "   - If the evidence in the interaction indicates a standard DIFFERENT from the QA's userSelectedRating:\n" +
                "     * DO NOT replace or contradict the processed feedback in rule 2 (the QA's selected rating remains authoritative for 'feedbacks').\n" +
                "     * INSTEAD, record your independent finding under that item's key in 'lineItemReconsiderations'. Provide the suggestedRating and detailed reasoning, aligning your reasoning with the official coaching criteria and guideline defined for that suggested option.\n" +
                "     * If you agree with the QA's rating, do NOT include the item in 'lineItemReconsiderations'.\n\n" +
                "Return ONLY a strictly valid JSON object matching this schema:\n" +
                "{\n" +
                "  \"summary\": \"...\",\n" +
                "  \"feedbacks\": {\n" +
                "    \"0:0\": \"...\"\n" +
                "  },\n" +
                "  \"lineItemReconsiderations\": {\n" +
                "    \"0:0\": {\n" +
                "      \"suggestedRating\": \"Quality standard missed\",\n" +
                "      \"reasoning\": \"...\"\n" +
                "    }\n" +
                "  }\n" +
                "}";

            callGemini(fullPrompt, "You are an expert QA evaluation system. Output valid JSON only.")
                .then(function(rawRes){
                    var cleanJsonStr = rawRes.replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();
                    var data;
                    try {
                        data = JSON.parse(cleanJsonStr);
                    } catch(jsonErr) {
                        var jsonMatch = cleanJsonStr.match(/\{[\s\S]*\}/);
                        if (jsonMatch) data = JSON.parse(jsonMatch[0]);
                        else throw new Error("Could not parse JSON response from Gemini: " + jsonErr.message);
                    }

                    // 1. Auto-copy Summary of Interaction to Issue / Concern
                    if (data.summary && txtIssue) {
                        txtIssue.value = data.summary;
                        txtIssue.dispatchEvent(new Event('input'));
                    }

                    // 2. Update Rubric textareas with processed feedback
                    var updatedCount = 0;
                    if (data.feedbacks && typeof data.feedbacks === 'object') {
                        Object.keys(data.feedbacks).forEach(function(k){
                            var newFb = (data.feedbacks[k] || '').trim();
                            if (newFb && state[k]) {
                                state[k].text = newFb;
                                if (state[k].domTextarea) state[k].domTextarea.value = newFb;
                                if (state[k].refreshUI) state[k].refreshUI();
                                updatedCount++;
                            }
                        });
                    }

                    // 3. Render Rich Analysis Results
                    resPlaceholder.innerHTML = "";
                    var resDiv = createElement("div", "display:flex;flex-direction:column;gap:14px;");

                    // Summary Card
                    if (data.summary) {
                        var sumCard = createElement("div", "background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:6px;");
                        var sumHeader = createElement("div", "display:flex;justify-content:space-between;align-items:center;font-weight:700;color:#1e40af;font-size:12px;");
                        sumHeader.innerHTML = "<span>📋 Summary of Interaction</span>";
                        var btnCopySum = createElement("button", "padding:3px 8px;background:#dcfce7;border:1px solid #86efac;border-radius:4px;font-size:11px;color:#15803d;cursor:pointer;font-weight:600;");
                        btnCopySum.textContent = "Copied to Issue/Concern ✓";
                        addListener(btnCopySum, "click", function(){
                            if (txtIssue) {
                                txtIssue.value = data.summary;
                                txtIssue.dispatchEvent(new Event('input'));
                                showToast("Copied to Issue/Concern!", false);
                            }
                        });
                        sumHeader.appendChild(btnCopySum);
                        var sumTxt = createElement("div", "color:#1e293b;font-size:13px;line-height:1.4;");
                        sumTxt.textContent = data.summary;
                        sumCard.appendChild(sumHeader);
                        sumCard.appendChild(sumTxt);
                        resDiv.appendChild(sumCard);
                    }

                    // Detailed Line Items Audit & AI Reconsiderations (Grouped by Section)
                    if (itemsPayload && itemsPayload.length > 0) {
                        var reconsiderationsMap = data.lineItemReconsiderations || {};
                        if (Array.isArray(data.reconsiderations)) {
                            data.reconsiderations.forEach(function(r){
                                if (r.key && !reconsiderationsMap[r.key]) {
                                    reconsiderationsMap[r.key] = {
                                        suggestedRating: r.suggestedRating,
                                        reasoning: r.reasoning
                                    };
                                }
                            });
                        }

                        // Group items by Section
                        var secOrder = [];
                        var secGroups = {};
                        itemsPayload.forEach(function(it){
                            var sName = it.section || "General";
                            if (!secGroups[sName]) {
                                secGroups[sName] = [];
                                secOrder.push(sName);
                            }
                            secGroups[sName].push(it);
                        });

                        secOrder.forEach(function(sName){
                            var secList = secGroups[sName];
                            var secCard = createElement("div", "background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:10px;margin-bottom:12px;");
                            
                            var secHeader = createElement("div", "font-weight:700;color:#1e293b;font-size:13px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #2563eb;padding-bottom:6px;");
                            secHeader.innerHTML = "<span>📁 " + sName + " <span style='font-size:11px;font-weight:normal;color:#64748b;'>(" + secList.length + ")</span></span>";
                            secCard.appendChild(secHeader);

                            secList.forEach(function(it, sIdx){
                                var k = it.key;
                                var fb = (data.feedbacks && data.feedbacks[k]) ? data.feedbacks[k] : "";
                                var rec = reconsiderationsMap[k];
                                var isPos = it.isCorrect !== false && !it.userSelectedRating.toLowerCase().includes("missed");

                                var itBox = createElement("div", "background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;display:flex;flex-direction:column;gap:6px;");
                                
                                var itTop = createElement("div", "display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;");
                                var itTitle = createElement("div", "font-weight:600;font-size:12px;color:#1e293b;");
                                itTitle.textContent = (sIdx + 1) + ". " + it.question;
                                
                                var badgeStyle = isPos ? "background:#dcfce7;color:#166534;border:1px solid #86efac;" : "background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;";
                                var itBadge = createElement("span", "font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;" + badgeStyle);
                                itBadge.textContent = it.userSelectedRating;
                                
                                itTop.appendChild(itTitle);
                                itTop.appendChild(itBadge);
                                itBox.appendChild(itTop);

                                if (fb) {
                                    var fbBox = createElement("div", "font-size:12px;line-height:1.5;color:#334155;background:white;border:1px solid #cbd5e1;border-radius:5px;padding:8px 10px;white-space:pre-wrap;");
                                    fbBox.textContent = fb;
                                    itBox.appendChild(fbBox);
                                }

                                if (rec && (rec.reasoning || rec.suggestedRating)) {
                                    var recAlert = createElement("div", "background:#fefce8;border:1px solid #fde047;border-radius:5px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;margin-top:2px;");
                                    
                                    var recAlertHeader = createElement("div", "display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:700;color:#854d0e;");
                                    recAlertHeader.innerHTML = "<span>⚠️ AI Observation for Reconsideration</span>";
                                    if (rec.suggestedRating) {
                                        var recSuggBadge = createElement("span", "background:#fef08a;color:#713f12;padding:1px 6px;border-radius:4px;border:1px solid #eab308;font-size:10px;font-weight:700;");
                                        recSuggBadge.textContent = "Suggested: " + rec.suggestedRating;
                                        recAlertHeader.appendChild(recSuggBadge);
                                    }
                                    recAlert.appendChild(recAlertHeader);

                                    if (rec.reasoning) {
                                        var recReason = createElement("div", "font-size:11px;color:#713f12;line-height:1.4;");
                                        recReason.textContent = rec.reasoning;
                                        recAlert.appendChild(recReason);
                                    }

                                    if (rec.suggestedRating && state[k] && state[k].options) {
                                        var btnApplyRec = createElement("button", "align-self:flex-start;padding:3px 8px;background:#fde047;border:1px solid #ca8a04;border-radius:4px;font-size:11px;color:#713f12;cursor:pointer;font-weight:600;margin-top:2px;");
                                        btnApplyRec.textContent = "Apply \"" + rec.suggestedRating + "\" to Form";
                                        (function(itemKey, suggestedVal){
                                            addListener(btnApplyRec, "click", function(){
                                                var s = state[itemKey];
                                                if (!s || !s.options) return;
                                                var foundOpt = s.options.find(function(o){
                                                    return o.label.toLowerCase().includes(suggestedVal.toLowerCase()) || suggestedVal.toLowerCase().includes(o.label.toLowerCase());
                                                });
                                                if (foundOpt) {
                                                    s.sel = foundOpt.id;
                                                    s.selIndex = s.options.indexOf(foundOpt);
                                                    if (s.refreshUI) s.refreshUI();
                                                    updateLiveScore();
                                                    showToast("Applied " + foundOpt.label + " to rubric!", false);
                                                }
                                            });
                                        })(k, rec.suggestedRating);
                                        recAlert.appendChild(btnApplyRec);
                                    }

                                    itBox.appendChild(recAlert);
                                }

                                secCard.appendChild(itBox);
                            });

                            resDiv.appendChild(secCard);
                        });
                    }

                    // Processed Feedback Summary
                    if (updatedCount > 0) {
                        var fbSummary = createElement("div", "background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 12px;font-size:12px;color:#166534;font-weight:600;display:flex;align-items:center;gap:6px;");
                        fbSummary.innerHTML = "<span>✨ Successfully generated and applied targeted feedback to " + updatedCount + " rubric line item(s)!</span>";
                        resDiv.appendChild(fbSummary);
                    }

                    resPlaceholder.appendChild(resDiv);
                    showToast("Analysis complete! Updated " + updatedCount + " line item(s).", false);
                    inputAccordion.body.style.display = "none";
                    inputAccordion.container.firstChild.lastChild.textContent = "▼";
                })
                .catch(function(err){
                    resPlaceholder.innerHTML = "<div style='color:#ef4444;padding:15px;text-align:center'>❌ " + err.message + "</div>";
                    showToast("Analysis error: " + err.message, true);
                })
                .finally(function(){
                    pBtnGen.disabled = false;
                    pBtnGen.textContent = "Generate Analysis";
                });
        });

        pFooter.appendChild(pBtnGen);

        pModal.appendChild(pHeader);
        pModal.appendChild(pBody);
        pModal.appendChild(pFooter);
        pOverlay.appendChild(pModal);
        document.body.appendChild(pOverlay);
    };

    toolsContainer.appendChild(btnRefresh);
    toolsContainer.appendChild(btnChecker);
    toolsContainer.appendChild(btnTools);
    header.appendChild(toolsContainer);

    makeDraggable(modal, header);

    var contentContainer = createElement("div", sContent);

    // --- Header Fields (Compact Layout: In-Field Icons & Ghosttext Placeholders, No Labels) ---
    var headerFieldsContainer = createElement("div");
    headerFieldsContainer.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0";

    // 1. Agent's Name Dropdown
    var selAgent = createElement("select", sSelect);
    selAgent.innerHTML = "<option value=''>Agent's Name</option>";
    var wrapAgent = createIconFieldWrapper("👤", selAgent);

    // 2. Interaction ID
    var inpInteractionId = createElement("input", sInput);
    inpInteractionId.placeholder = "Interaction ID";
    inpInteractionId.value = getInteractionId();
    var wrapInteractionId = createIconFieldWrapper("🆔", inpInteractionId);

    // Row 1: Agent's Name and Interaction ID
    var rowAgentInteraction = createElement("div", "display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;width:100%;");
    rowAgentInteraction.appendChild(wrapAgent);
    rowAgentInteraction.appendChild(wrapInteractionId);
    headerFieldsContainer.appendChild(rowAgentInteraction);

    var duplicateWarningBox = createElement("div");
    duplicateWarningBox.style.cssText = "display:none;background:#fef2f2;border:1px solid #ef4444;border-radius:5px;padding:6px 10px;margin-top:-2px;margin-bottom:2px;color:#991b1b;font-size:11px;font-weight:600;line-height:1.4";
    headerFieldsContainer.appendChild(duplicateWarningBox);

    // 3. Evaluation Type Dropdown
    var selEvalType = createElement("select", sSelect);
    var updateEvalTypesDropdown = function(selectedVal) {
        var prevVal = selectedVal || selEvalType.value || "";
        selEvalType.innerHTML = "";

        var types = (Array.isArray(globalEvalTypes) && globalEvalTypes.length > 0)
            ? globalEvalTypes.slice()
            : DEFAULT_EVALUATION_TYPES.slice();

        // Ensure all default evaluation types are present in list
        DEFAULT_EVALUATION_TYPES.forEach(function(dt){
            if (!types.some(function(t){ return t.toLowerCase() === dt.toLowerCase(); })) {
                types.push(dt);
            }
        });

        types.forEach(function(t){
            var opt = createElement("option");
            opt.value = t;
            opt.textContent = t;
            if (prevVal && t.toLowerCase() === prevVal.toLowerCase()) {
                opt.selected = true;
            }
            selEvalType.appendChild(opt);
        });

        if (prevVal) {
            var hasVal = Array.from(selEvalType.options).some(function(o){ return o.value.toLowerCase() === prevVal.toLowerCase(); });
            if (!hasVal) {
                var optExtra = createElement("option");
                optExtra.value = prevVal;
                optExtra.textContent = prevVal;
                optExtra.selected = true;
                selEvalType.appendChild(optExtra);
            } else {
                var matched = Array.from(selEvalType.options).find(function(o){ return o.value.toLowerCase() === prevVal.toLowerCase(); });
                if (matched) matched.selected = true;
            }
        } else if (selEvalType.options.length > 0) {
            selEvalType.value = selEvalType.options[0].value;
        }
    };
    updateEvalTypesDropdown();
    var wrapEvalType = createIconFieldWrapper("📋", selEvalType);

    // 4. Call ANI / DNIS
    var initAniOpts = getAniDnisOptions();
    var selAni;
    if (initAniOpts.length > 0) {
        selAni = createElement("select", sSelect);
    } else {
        selAni = createElement("input", sInput);
        selAni.placeholder = "Call ANI / DNIS";
    }

    var resetAniDropdown = function() {
        if (!selAni) return;
        var aniOpts = getAniDnisOptions();
        var defaultAni = (aniOpts.length > 1) ? aniOpts[1] : (aniOpts[0] || "");
        if (selAni.tagName === 'SELECT') {
            selAni.innerHTML = "";
            aniOpts.forEach(function(o){
                var opt = createElement("option");
                opt.value = o;
                opt.textContent = o;
                if (o === defaultAni) opt.selected = true;
                selAni.appendChild(opt);
            });
            if (defaultAni) selAni.value = defaultAni;
        } else if (selAni.tagName === 'INPUT') {
            selAni.value = defaultAni;
        }
    };
    resetAniDropdown();
    var wrapAni = createIconFieldWrapper("📞", selAni);

    // Row 2: Evaluation Type and Call ANI/DNIS
    var rowEvalTypeAni = createElement("div", "display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;width:100%;");
    rowEvalTypeAni.appendChild(wrapEvalType);
    rowEvalTypeAni.appendChild(wrapAni);
    headerFieldsContainer.appendChild(rowEvalTypeAni);

    // Row 3: Case # & Call Duration Row
    var caseDurationRow = createElement("div", "display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;width:100%;");
    var inpCaseNo = createElement("input", sInput);
    inpCaseNo.placeholder = "Case #";
    var inpDuration = createElement("input", sInput);
    inpDuration.placeholder = "Call Duration";
    inpDuration.value = getCallDuration();
    caseDurationRow.appendChild(createIconFieldWrapper("🔢", inpCaseNo));
    caseDurationRow.appendChild(createIconFieldWrapper("⏱️", inpDuration));
    headerFieldsContainer.appendChild(caseDurationRow);

    // Row 4: Date of Interaction & Date of Evaluation
    var dateRow = createElement("div", "display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;width:100%;");
    var inpDateInteraction = createElement("input", sInput);
    inpDateInteraction.type = "date";
    inpDateInteraction.title = "Date of Interaction";
    var pageIntDate = getInteractionDateFromPage();
    if (pageIntDate) inpDateInteraction.value = pageIntDate;

    var inpDateEvaluation = createElement("input", sInput);
    inpDateEvaluation.type = "date";
    inpDateEvaluation.title = "Date of Evaluation";
    function getLocalDateString(d) {
        d = d || new Date();
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }
    inpDateEvaluation.value = getLocalDateString();
    dateRow.appendChild(createIconFieldWrapper("📅", inpDateInteraction));
    dateRow.appendChild(createIconFieldWrapper("📅", inpDateEvaluation));
    headerFieldsContainer.appendChild(dateRow);

    // Row 5: Category & Sub-Category Row
    var categoryRow = createElement("div", "display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;width:100%;");
    var inpCategory = createElement("input", sInput);
    inpCategory.placeholder = "Category";
    var inpSubCategory = createElement("input", sInput);
    inpSubCategory.placeholder = "Sub-Category";
    categoryRow.appendChild(createIconFieldWrapper("🗂️", inpCategory));
    categoryRow.appendChild(createIconFieldWrapper("📂", inpSubCategory));
    headerFieldsContainer.appendChild(categoryRow);

    // Row 6: Issue / Concern with ✨ Gemini Summary button and inside 📝 icon
    var wrapIssue = createElement("div", "position:relative;width:100%;grid-column:1 / -1;margin:0;");
    var icoIssue = createElement("span");
    icoIssue.textContent = "📝";
    icoIssue.style.cssText = "position:absolute;left:11px;top:9px;pointer-events:none;font-size:13px;z-index:2;user-select:none;";

    var txtIssue = createElement("textarea", sTextarea);
    txtIssue.placeholder = "Issue / Concern";
    txtIssue.style.cssText = "width:100%;border:1px solid #cbd5e1;border-radius:5px;padding:8px 34px 8px 36px;font-family:inherit;resize:vertical;height:55px;font-size:13px;box-sizing:border-box;margin:0;";

    var btnSummary = createElement("span");
    btnSummary.textContent = "✨";
    btnSummary.title = "Generate Summary from Transcript using Gemini AI";
    btnSummary.style.cssText = "position:absolute;right:10px;top:9px;cursor:pointer;font-size:15px;opacity:0.7;user-select:none;z-index:5;";

    wrapIssue.appendChild(icoIssue);
    wrapIssue.appendChild(txtIssue);
    wrapIssue.appendChild(btnSummary);
    headerFieldsContainer.appendChild(wrapIssue);

    addListener(btnSummary, "mouseenter", function(){ btnSummary.style.opacity = "1"; });
    addListener(btnSummary, "mouseleave", function(){ btnSummary.style.opacity = "0.7"; });
    addListener(btnSummary, "click", function(e){
        e.stopPropagation();
        var transcript = extractTranscript();
        if(!transcript) return showToast("No transcript found on page.", true);

        var origIcon = btnSummary.textContent;
        btnSummary.textContent = "⏳";
        btnSummary.style.cursor = "wait";

        var prompt = "Summarize the customer's main issue or question in 1-2 concise sentences based on this interaction transcript:\n\n" + transcript;
        callGemini(prompt, "You are a concise QA evaluator. Output ONLY the summary sentence(s).")
            .then(function(summary){
                txtIssue.value = summary;
                txtIssue.dispatchEvent(new Event('input'));
                showToast("Summary generated with Gemini!", false);
            })
            .catch(function(err){ showToast("Summary failed: " + err.message, true); })
            .finally(function(){ btnSummary.textContent = origIcon; btnSummary.style.cursor = "pointer"; });
    });

    contentContainer.appendChild(headerFieldsContainer);

    // --- Dynamic Rubric & Feedback Updates ---
    var updateText = function(key) {
        var s = state[key];
        if(!s) return;

        var txt = "";
        var cleanText = function(t) { return (t || "").replace(/\s*Source:[\s\S]*$/i, "").trim(); };

        if(s.selectedTags && s.selectedTags.length > 0) {
            txt = s.selectedTags.map(function(t){ return cleanText(t.feedbackText || t.feedback_text); }).join(" ");
        } else {
            var genFeedback = globalFeedbackGeneral.find(function(f){
                var matchRubric = !f.rubricId || !currentRubric || !currentRubric.id || String(f.rubricId) === String(currentRubric.id);
                var matchSec = (f.sectionIndex === s.secIdx || f.section_index === s.secIdx);
                var matchItem = (f.itemIndex === s.itemIdx || f.item_index === s.itemIdx);
                var matchOpt = (f.optionIndex === s.selIndex || f.option_index === s.selIndex);
                return matchRubric && matchSec && matchItem && matchOpt;
            });
            if (genFeedback) {
                txt = cleanText(genFeedback.feedbackText || genFeedback.feedback_text);
            }
        }

        s.text = txt;
        if(s.domTextarea) {
            s.domTextarea.value = txt;
        }
    };

    var refreshAllUI = function() {
        Object.keys(state).forEach(function(key){
            if(state[key].refreshUI) state[key].refreshUI();
            if(state[key].domTextarea) state[key].domTextarea.value = state[key].text || "";
        });
        updateLiveScore();
    };

    // --- Score Calculation (identical to EvaluationsFormJS.html & EvaluationsJS.html) ---
    var computeRubricScore = function() {
        var rawSections = [];
        if (currentRubric) {
            if (Array.isArray(currentRubric.sections)) {
                rawSections = currentRubric.sections;
            } else if (Array.isArray(currentRubric.structure)) {
                rawSections = currentRubric.structure;
            } else if (typeof currentRubric.structure === 'string') {
                try { rawSections = JSON.parse(currentRubric.structure); } catch(e) {}
            }
        }
        if (rawSections.length === 0 && DEFAULT_FALLBACK_RUBRIC) {
            rawSections = typeof DEFAULT_FALLBACK_RUBRIC.structure === 'string' ? JSON.parse(DEFAULT_FALLBACK_RUBRIC.structure) : (DEFAULT_FALLBACK_RUBRIC.sections || []);
        }

        var cp = 0, mp = 0, totalItems = 0, correctCount = 0, incorrectCount = 0;

        rawSections.forEach(function(s, si) {
            (s.items || []).forEach(function(it, ii) {
                totalItems++;
                var im = 0, ib = 0, hd = false;
                (it.options || []).forEach(function(o) {
                    var pts = parseFloat(o.points) || 0;
                    var isCorr = (o.isCorrect === true || o.isCorrect === 'true');
                    if (isCorr) {
                        if (pts > im) im = pts;
                        if (o.isDefault === true || o.isDefault === 'true') {
                            ib = pts;
                            hd = true;
                        }
                    }
                });
                if (!hd) ib = im;
                mp += im;

                var keyColon = si + ":" + ii;
                var keyUnderscore = si + "_" + ii;
                var sState = state[keyColon] || state[keyUnderscore];

                if (sState && sState.options) {
                    var selOpt = sState.options[sState.selIndex] || sState.options.find(function(o){ return o.id === sState.sel || o.label === sState.sel; }) || sState.options[0];
                    if (selOpt) {
                        var pts = parseFloat(selOpt.points) || 0;
                        var isCorr = (selOpt.isCorrect === true || selOpt.isCorrect === 'true');
                        if (isCorr) {
                            correctCount++;
                            cp += pts;
                        } else {
                            incorrectCount++;
                            cp += (ib - pts);
                        }
                    } else {
                        cp += ib;
                    }
                } else {
                    cp += ib;
                }
            });
        });

        var fp = Math.max(0, cp);
        var pct = mp > 0 ? (fp / mp) * 100 : (fp > 0 ? 100 : 0);
        return {
            score: parseFloat(pct.toFixed(2)),
            scoreStr: pct.toFixed(2),
            earnedPoints: fp,
            maxPoints: mp,
            correctCount: correctCount,
            incorrectCount: incorrectCount,
            totalItems: totalItems
        };
    };

    var scoreBadge = null;
    var updateLiveScore = function() {
        if (!selectedAssignmentId && (!selAgent || !selAgent.value)) {
            if (scoreBadge) {
                scoreBadge.style.background = "#f1f5f9";
                scoreBadge.style.color = "#475569";
                scoreBadge.style.border = "1px solid #cbd5e1";
                scoreBadge.innerHTML = "<span>Score: <strong>--</strong></span>";
            }
            return;
        }
        var res = computeRubricScore();
        if (scoreBadge) {
            var bg = '#dcfce7', txt = '#15803d', border = '#86efac';
            if (res.score < 70) {
                bg = '#fee2e2'; txt = '#991b1b'; border = '#fca5a5';
            } else if (res.score < 85) {
                bg = '#fef9c3'; txt = '#854d0e'; border = '#fde047';
            }
            scoreBadge.style.background = bg;
            scoreBadge.style.color = txt;
            scoreBadge.style.border = '1px solid ' + border;
            scoreBadge.innerHTML = '<span>Score: <strong>' + res.scoreStr + '%</strong></span>';
        }
    };

    // --- Empty State Placeholder (when no agent is selected) ---
    var renderNoAgentSelectedPlaceholder = function() {
        selectedAssignmentId = "";
        contentContainer.querySelectorAll('.rubric-section').forEach(function(el){ el.remove(); });
        state = {};

        var placeholderBox = createElement("div", "display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 20px;text-align:center;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:8px;margin-top:8px;color:#64748b;user-select:none;");
        placeholderBox.className = "rubric-section";

        var iconEl = createElement("div", "font-size:36px;margin-bottom:8px;line-height:1;");
        iconEl.textContent = "👤📋";

        var titleEl = createElement("div", "font-size:15px;font-weight:700;color:#1e293b;margin-bottom:4px;");
        titleEl.textContent = "Select an Agent First";

        var descEl = createElement("div", "font-size:12px;color:#64748b;max-width:320px;line-height:1.4;");
        descEl.textContent = "The evaluation rubric will load automatically once you choose an agent from the dropdown above.";

        placeholderBox.appendChild(iconEl);
        placeholderBox.appendChild(titleEl);
        placeholderBox.appendChild(descEl);
        contentContainer.appendChild(placeholderBox);

        updateLiveScore();
    };

    // --- Form Rendering by Rubric Object ---
    var renderRubric = function(rubricData, feedbackChips, feedbackGeneral) {
        contentContainer.querySelectorAll('.rubric-section').forEach(function(el){ el.remove(); });
        state = {};
        currentRubric = rubricData || DEFAULT_FALLBACK_RUBRIC;

        var sections = [];
        try {
            sections = (typeof currentRubric.structure === 'string') ? JSON.parse(currentRubric.structure) : (currentRubric.structure || []);
        } catch(e) { sections = []; }

        globalFeedbackTags = feedbackChips || [];
        globalFeedbackGeneral = feedbackGeneral || [];

        sections.forEach(function(section, secIdx){
            var groupTitle = createElement("div", sGroupHeader + ";rubric-section");
            groupTitle.className = "rubric-section";
            groupTitle.textContent = section.name || section.title || ("Section " + (secIdx + 1));
            contentContainer.appendChild(groupTitle);

            var items = section.items || [];
            items.forEach(function(item, itemIdx){
                var key = secIdx + ":" + itemIdx;
                var itemContainer = createElement("div", sItemContainer);
                itemContainer.className = "rubric-section";
                var itemHeader = createElement("div", sItemHeader);
                var leftGroup = createElement("div", "display:flex;align-items:center;gap:10px");

                var checkbox = createElement("input");
                checkbox.type = "checkbox";
                checkbox.style.cursor = "pointer";
                addListener(checkbox, "click", function(e){
                    e.stopPropagation();
                    state[key].checked = e.target.checked;
                });

                var label = createElement("span");
                var cleanText = (item.question || item.shortName || item.short_name || item.text || ("Item " + (itemIdx + 1))).replace(/^\d+\.\s*/, "");
                label.textContent = (itemIdx + 1) + ". " + cleanText;
                leftGroup.appendChild(checkbox);
                leftGroup.appendChild(label);

                var arrow = createElement("span", "font-size:10px;color:#94a3b8");
                arrow.textContent = "▼";
                itemHeader.appendChild(leftGroup);
                itemHeader.appendChild(arrow);

                var itemBody = createElement("div", sItemBody);
                var tagContainer = createElement("div", sTagContainer);

                var rawOptions = item.options || [
                    { id: 'yes', label: 'Yes', points: 10, color: 'green', isDefault: true },
                    { id: 'no', label: 'No', points: 0, color: 'red', isDefault: false }
                ];
                var options = rawOptions.map(function(opt, idx){
                    var optColor = 'gray';
                    if (opt.isCorrect === true) {
                        optColor = 'green';
                    } else if (opt.isCorrect === false) {
                        optColor = 'red';
                    } else if (opt.color) {
                        optColor = opt.color;
                    } else {
                        optColor = (idx === 0) ? 'green' : 'red';
                    }

                    return {
                        id: opt.id || String(idx),
                        label: opt.label || opt.text || 'Option',
                        points: opt.points !== undefined ? opt.points : 0,
                        color: optColor,
                        isCorrect: opt.isCorrect,
                        isDefault: opt.isDefault === true
                    };
                });

                var defaultIdx = options.findIndex(function(o){ return o.isDefault === true; });
                if (defaultIdx === -1) defaultIdx = 0;

                state[key] = {
                    id: item.id || (secIdx + "_" + itemIdx),
                    secIdx: secIdx,
                    itemIdx: itemIdx,
                    sectionName: (section.name || section.title || ("Section " + (secIdx + 1))).trim(),
                    question: (item.question || item.title || item.shortName || cleanText || ("Item " + (itemIdx + 1))).trim(),
                    cleanQuestion: cleanText.trim().toLowerCase(),
                    sel: options[defaultIdx].id,
                    selIndex: defaultIdx,
                    text: "",
                    checked: false,
                    groupName: section.name || section.title,
                    itemId: itemIdx + 1,
                    options: options,
                    selectedTags: [],
                    domTextarea: null,
                    refreshUI: null
                };

                var updateHeaderBg = function() {
                    var theme = getTheme({ options: options }, state[key].sel);
                    var cols = getColors(theme);
                    itemHeader.style.background = cols.header;
                };

                var renderTags = function() {
                    tagContainer.innerHTML = "";
                    var currentOptIdx = state[key].selIndex;
                    var relevantTags = globalFeedbackTags.filter(function(t){
                        var matchRubric = !t.rubricId || !currentRubric || !currentRubric.id || String(t.rubricId) === String(currentRubric.id);
                        return matchRubric &&
                               (t.sectionIndex === secIdx || t.section_index === secIdx) &&
                               (t.itemIndex === itemIdx || t.item_index === itemIdx) &&
                               (t.optionIndex === currentOptIdx || t.option_index === currentOptIdx);
                    });

                    relevantTags.forEach(function(tagData){
                        var tagBtn = createElement("div");
                        var labelText = tagData.buttonLabel || tagData.button_label || tagData.tag_label || "Feedback";
                        var isActive = state[key].selectedTags.some(function(t){
                            return (t.id && t.id === tagData.id) || (t.buttonLabel === labelText);
                        });

                        var theme = getTheme({ options: options }, state[key].sel);
                        var cols = getColors(theme);

                        if(isActive) {
                            tagBtn.style.cssText = "padding:4px 9px;border:1px solid " + cols.border + ";border-radius:12px;font-size:11px;cursor:pointer;background:" + cols.bg + ";color:" + cols.txt + ";font-weight:600;transition:all 0.15s";
                        } else {
                            tagBtn.style.cssText = "padding:4px 9px;border:1px solid #cbd5e1;border-radius:12px;font-size:11px;cursor:pointer;background:#f8fafc;color:#334155;transition:all 0.15s";
                        }
                        tagBtn.textContent = labelText;

                        addListener(tagBtn, "click", function(){
                            if(isActive) {
                                state[key].selectedTags = state[key].selectedTags.filter(function(t){
                                    return (t.id && t.id !== tagData.id) && (t.buttonLabel !== labelText);
                                });
                            } else {
                                state[key].selectedTags.push(tagData);
                            }
                            renderTags();
                            updateHeaderBg();
                            updateText(key);
                        });
                        tagContainer.appendChild(tagBtn);
                    });
                };
                state[key].renderTags = renderTags;

                // Render based on uiType: 'dropdown' or 'buttons'
                var isDropdown = (item.uiType === 'dropdown');
                var optSelect = null;
                var btnGroup = null;
                var optionButtons = [];

                if (isDropdown) {
                    optSelect = createElement("select", sSelect);
                    options.forEach(function(opt, optIdx){
                        var oEl = createElement("option");
                        oEl.value = opt.id;
                        var ptsLabel = (opt.points !== undefined && opt.points !== 0) ? (" (" + opt.points + " pts)") : "";
                        oEl.textContent = opt.label + ptsLabel;
                        if (optIdx === defaultIdx) oEl.selected = true;
                        optSelect.appendChild(oEl);
                    });

                    var updateSelectStyles = function() {
                        var val = state[key].sel;
                        var theme = getTheme({ options: options }, val);
                        var cols = getColors(theme);
                        optSelect.style.background = cols.bg;
                        optSelect.style.color = cols.txt;
                        optSelect.style.borderColor = cols.border;
                        optSelect.style.fontWeight = "600";
                    };

                    addListener(optSelect, "change", function(e){
                        var selectedVal = e.target.value;
                        var foundIdx = options.findIndex(function(o){ return o.id === selectedVal; });
                        if (foundIdx === -1) foundIdx = 0;
                        state[key].sel = selectedVal;
                        state[key].selIndex = foundIdx;
                        state[key].selectedTags = [];
                        updateSelectStyles();
                        renderTags();
                        updateHeaderBg();
                        updateText(key);
                        updateLiveScore();
                    });

                    updateSelectStyles();
                    itemBody.appendChild(optSelect);
                } else {
                    btnGroup = createElement("div", sBtnGroup);
                    options.forEach(function(opt, optIdx){
                        var btn = createElement("button");
                        btn.textContent = opt.label;
                        btn.style.cssText = sBtnBase;

                        addListener(btn, "click", function(){
                            state[key].sel = opt.id;
                            state[key].selIndex = optIdx;
                            state[key].selectedTags = [];
                            updateBtnStyles();
                            renderTags();
                            updateHeaderBg();
                            updateText(key);
                            updateLiveScore();
                        });

                        btnGroup.appendChild(btn);
                        optionButtons.push({ dom: btn, id: opt.id, idx: optIdx });
                    });

                    var updateBtnStyles = function() {
                        var val = state[key].sel;
                        var theme = getTheme({ options: options }, val);
                        var cols = getColors(theme);
                        var activeStyle = sBtnBase + ";background:" + cols.bg + ";color:" + cols.txt + ";border-color:" + cols.border;
                        var inactiveStyle = sBtnBase + ";background:white;color:#475569;border-color:#cbd5e1";

                        optionButtons.forEach(function(b){
                            b.dom.style.cssText = (b.id === val) ? activeStyle : inactiveStyle;
                        });
                    };

                    updateBtnStyles();
                    itemBody.appendChild(btnGroup);
                }

                state[key].refreshUI = function() {
                    if (isDropdown && optSelect) {
                        optSelect.value = state[key].sel;
                        updateSelectStyles();
                    } else if (btnGroup) {
                        updateBtnStyles();
                    }
                    checkbox.checked = state[key].checked;
                    if (textarea) textarea.value = state[key].text || "";
                    renderTags();
                    updateHeaderBg();
                };

                itemBody.appendChild(tagContainer);

                var textarea = createElement("textarea", sTextarea);
                state[key].domTextarea = textarea;
                textarea.placeholder = "Comments";
                addListener(textarea, "input", function(e){
                    state[key].text = e.target.value;
                    updateHeaderBg();
                });
                itemBody.appendChild(textarea);

                addListener(itemHeader, "click", function(){
                    var isExpanded = itemBody.style.display === "block";
                    itemBody.style.display = isExpanded ? "none" : "block";
                    arrow.textContent = isExpanded ? "▼" : "▲";
                    updateHeaderBg();
                    if(!isExpanded) renderTags();
                });

                itemContainer.appendChild(itemHeader);
                itemContainer.appendChild(itemBody);
                contentContainer.appendChild(itemContainer);

                updateHeaderBg();
                updateText(key);
            });
        });

        updateLiveScore();
    };

    // --- Switch Rubric when Assignment is Selected ---
    var switchRubricById = function(rubricId) {
        if (!rubricId) {
            renderRubric(allRubrics[0] || DEFAULT_FALLBACK_RUBRIC, globalFeedbackTags, globalFeedbackGeneral);
            return;
        }
        var found = allRubrics.find(function(r){
            return String(r.id) === String(rubricId) || String(r.name).toLowerCase() === String(rubricId).toLowerCase();
        });
        if (found) {
            console.log("Switching to Rubric:", found.name, "(ID: " + rubricId + ")");
            renderRubric(found, globalFeedbackTags, globalFeedbackGeneral);
        } else {
            renderRubric(allRubrics[0] || DEFAULT_FALLBACK_RUBRIC, globalFeedbackTags, globalFeedbackGeneral);
        }
    };

    var refreshFeedbackTagsAndGeneral = function() {
        Object.keys(state).forEach(function(k){
            if (state[k] && typeof state[k].renderTags === 'function') {
                state[k].renderTags();
            }
            if (state[k] && state[k].domTextarea && !state[k].domTextarea.value.trim()) {
                updateText(k);
            }
        });
    };

    // --- Score / State Reset Helper ---
    var resetRubricToDefaults = function() {
        Object.keys(state).forEach(function(key){
            var s = state[key];
            if (!s || !s.options) return;
            var defaultIdx = s.options.findIndex(function(o){ return o.isDefault === true; });
            if (defaultIdx === -1) defaultIdx = 0;
            s.sel = s.options[defaultIdx].id;
            s.selIndex = defaultIdx;
            s.checked = false;
            s.selectedTags = [];
            updateText(key);
        });
        refreshAllUI();
        updateLiveScore();
    };

    // --- Name Resolution & Assignment Matching Helpers ---
    var resolveName = function(a) {
        if (!a) return "Agent";
        if (a.agentSnapshot) {
            var snap = typeof a.agentSnapshot === 'string' ? JSON.parse(a.agentSnapshot) : a.agentSnapshot;
            if (snap && snap.displayName) return snap.displayName;
            if (snap && snap.fullName) return formatToDisplayName(snap.fullName);
        }
        if (a.agentName && a.agentName !== a.agentEmail) {
            return formatToDisplayName(a.agentName);
        }
        var matchedUser = globalUsers.find(function(u){
            return (u.email || '').toLowerCase() === (a.agentEmail || '').toLowerCase();
        });
        if (matchedUser && matchedUser.name) return formatToDisplayName(matchedUser.name);
        return formatEmailToName(a.agentEmail) || a.agentEmail || "Agent";
    };

    var findMatchingAssignmentForAdvocate = function(advocateName) {
        if (!advocateName || !globalAssignments || globalAssignments.length === 0) return null;
        var target = advocateName.toLowerCase().trim();

        var matches = globalAssignments.filter(function(a) {
            var agentLabel = resolveName(a).toLowerCase();
            var rawName = String(a.agentName || '').toLowerCase();
            var email = String(a.agentEmail || '').toLowerCase();
            return agentLabel === target || agentLabel.includes(target) || target.includes(agentLabel) ||
                   rawName === target || rawName.includes(target) || target.includes(rawName) ||
                   (email && target.includes(email.split('@')[0]));
        });

        if (matches.length === 0) return null;
        if (matches.length === 1) return matches[0];

        // If multiple matches across dates: prefer Pending / Incomplete assignments
        var pendingMatches = matches.filter(function(a){ return a.status !== 'Completed'; });
        var pool = pendingMatches.length > 0 ? pendingMatches : matches;

        // Sort by date closest to today
        var todayStr = getLocalDateString();
        pool.sort(function(a, b) {
            var da = normalizeDateStr(a.date);
            var db = normalizeDateStr(b.date);
            return Math.abs(new Date(da) - new Date(todayStr)) - Math.abs(new Date(db) - new Date(todayStr));
        });

        return pool[0];
    };

    var autoSelectAssignmentAndDate = function() {
        var pageAdvocateName = getAdvocateNameFromPage();
        if (pageAdvocateName) {
            var matchedAsg = findMatchingAssignmentForAdvocate(pageAdvocateName);
            if (matchedAsg && matchedAsg.date) {
                inpDateEvaluation.value = normalizeDateStr(matchedAsg.date);
                updateAgentDropdown();
                selectedAssignmentId = matchedAsg.id;
                selAgent.value = "asg:" + matchedAsg.id;

                handleAgentSelectionChange(selAgent.selectedOptions[0]);
                return true;
            }
        }
        updateAgentDropdown();
        return false;
    };

    // --- Populate Agent Dropdown based on Date of Evaluation (Date column in Assignments sheet) ---
    var updateAgentDropdown = function() {
        var selectedDate = inpDateEvaluation.value; // YYYY-MM-DD
        selAgent.innerHTML = "";

        var defaultOpt = createElement("option");
        defaultOpt.value = "";
        selAgent.appendChild(defaultOpt);

        var pageAdvocateName = getAdvocateNameFromPage().toLowerCase();
        var normSelectedDate = normalizeDateStr(selectedDate);

        // Filter assignments strictly matching the selected Date of Evaluation
        var dateAssignments = globalAssignments.filter(function(a){
            return normalizeDateStr(a.date) === normSelectedDate;
        });

        if (dateAssignments.length > 0) {
            defaultOpt.textContent = "Agent's Name (" + dateAssignments.length + " available)";
            var matchedOptFound = false;
            dateAssignments.forEach(function(a){
                var opt = createElement("option");
                opt.value = "asg:" + a.id;
                var agentLabel = resolveName(a);
                var isDone = (a.status === 'Completed');
                var isPartial = (a.status === 'Partial');
                opt.textContent = isDone ? ("✓ " + agentLabel) : (isPartial ? ("⏳ " + agentLabel + " (Partial)") : agentLabel);
                opt.dataset.rubricId = a.rubricId || "";
                opt.dataset.agentName = agentLabel;
                opt.dataset.agentEmail = a.agentEmail || "";
                opt.dataset.asgId = a.id;
                opt.dataset.evalType = a.evaluationType || a.evaluation_type || a.evaluationsType || a.evalType || "Manual Audit";
                opt.dataset.status = a.status || "Pending";

                if (selectedAssignmentId && a.id === selectedAssignmentId) {
                    opt.selected = true;
                    matchedOptFound = true;
                } else if (!matchedOptFound && pageAdvocateName && (agentLabel.toLowerCase().includes(pageAdvocateName) || pageAdvocateName.includes(agentLabel.toLowerCase()))) {
                    opt.selected = true;
                    selectedAssignmentId = a.id;
                    matchedOptFound = true;
                }
                selAgent.appendChild(opt);
            });
        } else {
            if (globalAssignments.length > 0) {
                var availDates = [];
                globalAssignments.forEach(function(a) {
                    var nd = normalizeDateStr(a.date);
                    if (nd && availDates.indexOf(nd) === -1) availDates.push(nd);
                });
                availDates.sort().reverse();
                defaultOpt.textContent = "Agent's Name (No assignments on " + (normSelectedDate || "this date") + " — available: " + availDates.slice(0, 3).join(', ') + ")";
            } else {
                defaultOpt.textContent = "Agent's Name (No assignments loaded)";
            }
        }
    };

    // Unified Agent Selection Handler
    var handleAgentSelectionChange = function(selectedOpt) {
        if (!selectedOpt) return;
        var val = selectedOpt.value || "";

        if (val && val.startsWith("asg:")) {
            selectedAssignmentId = selectedOpt.dataset.asgId || "";
            var asg = globalAssignments.find(function(a){ return a.id === selectedAssignmentId; });
            var rubricId = selectedOpt.dataset.rubricId || (asg && asg.rubricId) || "";
            var asgEvalType = selectedOpt.dataset.evalType || (asg && (asg.evaluationType || asg.evaluation_type || asg.evaluationsType || asg.evalType)) || "Manual Audit";

            switchRubricById(rubricId || null);
            if (asgEvalType && selEvalType) updateEvalTypesDropdown(asgEvalType);

            // Check if this assignment is already completed or saved as partial
            if (asg && (asg.status === 'Completed' || asg.status === 'Partial')) {
                var isPartial = (asg.status === 'Partial');
                showLoading("Loading " + (isPartial ? "partial" : "completed") + " evaluation for " + (selectedOpt.dataset.agentName || "agent") + "...");
                
                // Query Supabase directly first!
                supabaseFetch('evaluations?assignment_id=eq.' + encodeURIComponent(asg.id) + '&order=submitted_at.desc&limit=1', 'GET')
                .then(function(rows){
                    if (Array.isArray(rows) && rows.length > 0) {
                        var ev = rows[0];
                        var mapped = {
                            id: ev.id,
                            assignmentId: ev.assignment_id,
                            interactionId: ev.interaction_id,
                            score: ev.score,
                            evaluationType: ev.evaluation_type,
                            rubricId: ev.rubric_id,
                            callDuration: ev.call_duration,
                            caseNo: ev.case_no,
                            callAniDnis: ev.call_ani_dnis,
                            dateOfInteraction: ev.date_of_interaction,
                            caseCategory: ev.case_category,
                            caseSubCategory: ev.case_sub_category,
                            issueConcern: ev.issue_concern,
                            evaluationDetails: ev.evaluation_details,
                            agentSnapshot: ev.agent_snapshot,
                            qaEmail: ev.qa_email,
                            qaName: ev.qa_name
                        };
                        populateEvaluationRecord(mapped, asg);
                        return;
                    }
                    checkExistingRecord({ assignmentId: asg.id, assignment: asg });
                })
                .catch(function(err){
                    console.warn("Supabase check_existing error:", err);
                    checkExistingRecord({ assignmentId: asg.id, assignment: asg });
                })
                .finally(function(){ hideLoading(); });
            } else {
                // Fresh/Pending assignment: Reset rubric and scoresheet to clean state with default feedback templates
                duplicateWarningBox.style.display = "none";
                duplicateWarningBox.innerHTML = "";
                existingRecordId = null;
                resetRubricToDefaults();

                // Explicitly clear manual evaluation fields
                inpCaseNo.value = "";
                inpCategory.value = "";
                inpSubCategory.value = "";
                txtIssue.value = "";

                // Reset page fields from active Stella Connect review
                inpInteractionId.value = getInteractionId() || "";
                inpDuration.value = getCallDuration() || "";
                inpDateInteraction.value = getInteractionDateFromPage() || "";
                resetAniDropdown();
            }
        } else {
            selectedAssignmentId = "";
            duplicateWarningBox.style.display = "none";
            duplicateWarningBox.innerHTML = "";
            existingRecordId = null;
            resetRubricToDefaults();

            inpCaseNo.value = "";
            inpCategory.value = "";
            inpSubCategory.value = "";
            txtIssue.value = "";
            inpInteractionId.value = getInteractionId() || "";
            inpDuration.value = getCallDuration() || "";
            inpDateInteraction.value = getInteractionDateFromPage() || "";
            resetAniDropdown();

            renderNoAgentSelectedPlaceholder();
        }
    };

    // When an agent is chosen from the dropdown:
    addListener(selAgent, "change", function(e){
        handleAgentSelectionChange(selAgent.selectedOptions[0]);
    });

    // When Date of Evaluation changes:
    addListener(inpDateEvaluation, "change", function(){
        updateAgentDropdown();

        // Trigger selection handler for newly selected option
        var selectedOpt = selAgent.selectedOptions[0];
        handleAgentSelectionChange(selectedOpt);

        // Check if selected date is outside 2-month window
        var selDate = inpDateEvaluation.value;
        if (!selDate) return;
        var parts = selDate.split('-');
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10) - 1; // 0-indexed

        var monthKey = year + '-' + month;
        var activeSupabaseKey = SUPABASE_KEY || storage.get('supabase_key', '');
        if (!activeSupabaseKey && !cachedMonth && API_BASE_URL) {
            // Fetch this month on-demand (past or future) from GAS
            showLoading("Fetching assignments for " + selDate + "...");
            apiGet(API_BASE_URL, {
                action: 'get_month_data',
                year: year,
                month: month + 1,
                qa_email: QA_EMAIL
            })
            .then(function(mRes){
                if (mRes.success && Array.isArray(mRes.assignments)) {
                    idb.set('month_' + monthKey, mRes.assignments);
                    // Merge into globalAssignments
                    mRes.assignments.forEach(function(ma){
                        if (!globalAssignments.some(function(ga){ return ga.id === ma.id; })) {
                            globalAssignments.push(ma);
                        }
                    });
                    updateAgentDropdown();
                    handleAgentSelectionChange(selAgent.selectedOptions[0]);
                    showToast("Loaded assignments for " + selDate, false);
                }
            })
            .catch(function(){})
            .finally(function(){ hideLoading(); });
        }
    });

    // --- Save to Personal Supabase Cloud or Google Sheets API ---
    var saveRecord = function(targetStatus) {
        targetStatus = targetStatus || 'Completed';
        if (!selectedAssignmentId && (!selAgent || !selAgent.value)) {
            showToast("Please select an Agent first!", true);
            return Promise.reject(new Error("No agent selected"));
        }
        var activeSupabaseKey = SUPABASE_KEY || storage.get('supabase_key', '');
        if (!activeSupabaseKey && !API_BASE_URL) {
            showToast("Supabase not configured! Open ⚙️ Settings", true);
            showSettingsModal();
            return Promise.reject(new Error("Database not configured"));
        }

        // Build Section-based Evaluation Details:
        // Format: { "Section Name": [ { question, selected, points, feedback, feedbackText, feedbackChips } ] }
        var rawSections = [];
        if (currentRubric) {
            if (Array.isArray(currentRubric.sections)) {
                rawSections = currentRubric.sections;
            } else if (Array.isArray(currentRubric.structure)) {
                rawSections = currentRubric.structure;
            } else if (typeof currentRubric.structure === 'string') {
                try { rawSections = JSON.parse(currentRubric.structure); } catch(e) {}
            }
        }
        if (rawSections.length === 0 && DEFAULT_FALLBACK_RUBRIC && Array.isArray(DEFAULT_FALLBACK_RUBRIC.sections)) {
            rawSections = DEFAULT_FALLBACK_RUBRIC.sections;
        }

        var details = {};
        rawSections.forEach(function(sec, secIdx){
            var secName = sec.name || sec.title || ("Section " + (secIdx + 1));
            details[secName] = [];
            (sec.items || []).forEach(function(item, itemIdx){
                var keyColon = secIdx + ":" + itemIdx;
                var keyUnderscore = secIdx + "_" + itemIdx;
                var s = state[keyColon] || state[keyUnderscore];
                if (!s) return;

                var selectedOption = s.options.find(function(o){ return o.id === s.sel; });
                var pts = selectedOption ? Number(selectedOption.points || 0) : 0;
                var selLabel = selectedOption ? (selectedOption.label || selectedOption.text || '') : '';
                var isCorr = selectedOption ? (selectedOption.isCorrect === true || selectedOption.isCorrect === 'true') : null;
                var fbText = (s.text || '').trim();

                var entry = {
                    question: item.question || item.title || item.shortName || ('Question ' + (itemIdx + 1)),
                    selected: selLabel,
                    points: pts,
                    isCorrect: isCorr,
                    feedback: fbText,
                    feedbackText: fbText,
                    checked: !!(s.checked)
                };

                var chipLabels = (s.selectedTags || []).map(function(t){
                    return t.buttonLabel || t.button_label || t.tagLabel || t.tag_label || '';
                }).filter(Boolean);
                if (chipLabels.length > 0) {
                    entry.feedbackChips = chipLabels;
                }
                details[secName].push(entry);
            });
        });

        var scoreResult = computeRubricScore();
        var finalScorePercentage = scoreResult.score;

        // Resolve advocate name & snapshot
        var selectedOpt = selAgent.selectedOptions[0];
        var resolvedAgentName = (selectedOpt && selectedOpt.dataset.agentName) ? selectedOpt.dataset.agentName : getAdvocateNameFromPage();
        var selectedAsg = selectedAssignmentId ? globalAssignments.find(function(a){ return a.id === selectedAssignmentId; }) : null;
        var agentSnap = selectedAsg && selectedAsg.agentSnapshot ? (typeof selectedAsg.agentSnapshot === 'string' ? JSON.parse(selectedAsg.agentSnapshot) : selectedAsg.agentSnapshot) : null;

        var resolvedQaName = currentQaDisplayName || storage.get('qa_name', '') || formatEmailToName(QA_EMAIL) || QA_EMAIL;

        var payload = {
            action: 'submit_evaluation',
            token: API_TOKEN,
            qaEmail: QA_EMAIL,
            evaluationData: {
                interactionId: inpInteractionId.value.trim(),
                agentName: resolvedAgentName,
                agentEmail: (selectedAsg && selectedAsg.agentEmail) || '',
                agentSnapshot: agentSnap,
                qaName: resolvedQaName,
                evaluationType: (selEvalType && selEvalType.value) ? selEvalType.value : ((selectedAsg && (selectedAsg.evaluationType || selectedAsg.evaluation_type || selectedAsg.evaluationsType || selectedAsg.evalType)) || 'Manual Audit'),
                callAniDnis: selAni.value ? selAni.value.trim() : "",
                caseNo: inpCaseNo.value.trim(),
                callDuration: inpDuration.value.trim(),
                dateOfInteraction: inpDateInteraction.value,
                evaluationDate: inpDateEvaluation.value,
                caseCategory: inpCategory.value.trim(),
                caseSubCategory: inpSubCategory.value.trim(),
                issueConcern: txtIssue.value.trim(),
                rubricId: (currentRubric && currentRubric.id) || '',
                assignmentId: selectedAssignmentId || '',
                score: finalScorePercentage,
                details: details,
                status: 'Partial',
                pageUrl: window.location.href
            }
        };

        var trackerApiUrl = API_BASE_URL || DEFAULT_API_URL;
        if (trackerApiUrl && trackerApiUrl.indexOf('/api/bookmarklet') !== -1) {
            return apiPost(trackerApiUrl + '/save', payload)
                .then(function(result){
                    if (result && result.evaluation_id) {
                        existingRecordId = result.evaluation_id;
                    }
                    if (selectedAssignmentId) {
                        var asg = globalAssignments.find(function(a){ return a.id === selectedAssignmentId; });
                        if (asg) asg.status = 'Partial';
                        updateAgentDropdown();
                    }
                    showToast("Evaluation saved as Partial in Personal QA Tracker!", false);
                    return true;
                })
                .catch(function(err){
                    console.warn("Tracker API save failed, attempting Supabase direct fallback:", err);
                    return executeDirectSupabaseSave();
                });
        }

        function executeDirectSupabaseSave() {
            var activeSupabaseKey = SUPABASE_KEY || storage.get('supabase_key', DEFAULT_SUPABASE_KEY);
            if (!activeSupabaseKey) {
                return Promise.reject(new Error("Supabase is not configured"));
            }

            var evalId = existingRecordId || ('EVL-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
            var nowIso = new Date().toISOString();
            var supRecord = {
                id: evalId,
                assignment_id: selectedAssignmentId || null,
                submitted_at: nowIso,
                interaction_id: inpInteractionId.value.trim(),
                qa_email: QA_EMAIL,
                qa_name: resolvedQaName,
                agent_email: (selectedAsg && selectedAsg.agentEmail) || (selectedAsg && selectedAsg.agent_email) || '',
                agent_name: resolvedAgentName,
                score: finalScorePercentage,
                evaluation_type: (selEvalType && selEvalType.value) ? selEvalType.value : ((selectedAsg && (selectedAsg.evaluationType || selectedAsg.evaluation_type || selectedAsg.evaluationsType || selectedAsg.evalType)) || 'Manual Audit'),
                rubric_id: (currentRubric && currentRubric.id) || '',
                call_duration: inpDuration.value.trim(),
                case_no: inpCaseNo.value.trim(),
                call_ani_dnis: selAni.value ? selAni.value.trim() : "",
                date_of_interaction: inpDateInteraction.value,
                case_category: inpCategory.value.trim(),
                case_sub_category: inpSubCategory.value.trim(),
                issue_concern: txtIssue.value.trim(),
                evaluation_details: details,
                agent_snapshot: agentSnap,
                sync_status: 'pending_sheet_sync',
                synced_at: nowIso
            };

            var savePromise;
            if (existingRecordId) {
                var patchData = Object.assign({}, supRecord);
                delete patchData.id;
                savePromise = supabaseFetch('evaluations?id=eq.' + encodeURIComponent(existingRecordId), 'PATCH', patchData)
                    .then(function(rows) {
                        if (!rows || (Array.isArray(rows) && rows.length === 0)) {
                            return supabaseFetch('evaluations', 'POST', supRecord, 'resolution=merge-duplicates');
                        }
                        return rows;
                    });
            } else if (selectedAssignmentId) {
                var patchData = Object.assign({}, supRecord);
                delete patchData.id;
                savePromise = supabaseFetch('evaluations?assignment_id=eq.' + encodeURIComponent(selectedAssignmentId), 'PATCH', patchData)
                    .then(function(rows) {
                        if (Array.isArray(rows) && rows.length > 0) {
                            if (rows[0].id) existingRecordId = rows[0].id;
                            return rows;
                        }
                        return supabaseFetch('evaluations', 'POST', supRecord, 'resolution=merge-duplicates');
                    });
            } else {
                savePromise = supabaseFetch('evaluations', 'POST', supRecord, 'resolution=merge-duplicates');
            }

            return savePromise
                .then(function(savedRows) {
                    if (Array.isArray(savedRows) && savedRows.length > 0 && savedRows[0].id) {
                        existingRecordId = savedRows[0].id;
                    } else {
                        existingRecordId = evalId;
                    }
                    if (selectedAssignmentId) {
                        supabaseFetch('assignments?id=eq.' + encodeURIComponent(selectedAssignmentId), 'PATCH', {
                            status: 'Partial',
                            synced_at: new Date().toISOString()
                        }).catch(function(err){ console.warn('Supabase assignment patch:', err); });

                        var asg = globalAssignments.find(function(a){ return a.id === selectedAssignmentId; });
                        if (asg) asg.status = 'Partial';
                        updateAgentDropdown();
                    }
                    showToast("Evaluation saved as Partial in Supabase!", false);
                    return true;
                });
        }

        return executeDirectSupabaseSave();
    };

    // --- Unified Evaluation Record Populator ---
    var populateEvaluationRecord = function(record, asg) {
        if (!record) return;
        existingRecordId = record.id;

        if (!asg && record.assignmentId) {
            asg = globalAssignments.find(function(a){ return String(a.id) === String(record.assignmentId); });
        }
        if (!asg && record.agentEmail) {
            asg = globalAssignments.find(function(a){ return (a.agentEmail || '').toLowerCase() === String(record.agentEmail || '').toLowerCase(); });
        }

        var evalDate = "";
        if (asg && asg.date) {
            evalDate = normalizeDateStr(asg.date);
        } else {
            evalDate = normalizeDateStr(record.dateOfEvaluation || record.evaluationDate || record.submittedAt || record.date || "");
        }

        var qaName = record.qaName || record.qaEmail || "another QA";
        var score = (record.score !== undefined && record.score !== null && record.score !== "") ? (" • Score: " + record.score + "%") : "";

        // Display Duplicate Warning or Partial Banner
        var isPartialRecord = (asg && asg.status === 'Partial') || (record && (record.status === 'Partial' || record.assignmentStatus === 'Partial'));
        duplicateWarningBox.style.display = "block";
        if (isPartialRecord) {
            duplicateWarningBox.style.background = "#fef9c3";
            duplicateWarningBox.style.borderColor = "#fde047";
            duplicateWarningBox.style.color = "#854d0e";
            duplicateWarningBox.innerHTML = "⏳ <strong>Saved Partial Evaluation</strong><br>Saved on " + (evalDate || "previous date") + " by " + qaName + score + ". All details loaded below — you can continue editing and submit when ready.";
        } else {
            duplicateWarningBox.style.background = "#fffbeb";
            duplicateWarningBox.style.borderColor = "#fef3c7";
            duplicateWarningBox.style.color = "#92400e";
            duplicateWarningBox.innerHTML = "⚠️ <strong>Existing Completed Evaluation</strong><br>Evaluated on " + (evalDate || "previous date") + " by " + qaName + score + ". All details loaded below.";
        }
        showToast("ℹ️ Loaded existing evaluation data from database", false);

        // 1. Auto-populate Date of Evaluation to match completed entry
        if (evalDate) {
            inpDateEvaluation.value = evalDate;
            if (asg) selectedAssignmentId = asg.id;
            updateAgentDropdown();
        }

        // 2. Automatically select the Agent's Name in dropdown
        var snap = null;
        if (record.agentSnapshot) {
            try {
                snap = typeof record.agentSnapshot === 'string' ? JSON.parse(record.agentSnapshot) : record.agentSnapshot;
            } catch(e) { snap = null; }
        }

        var targetEmail = String(record.agentEmail || (snap && (snap.toasttabEmail || snap.internalIbexEmail)) || (asg && asg.agentEmail) || '').trim().toLowerCase();
        var targetName = formatToDisplayName((snap && (snap.displayName || snap.fullName)) || record.agentName || '').trim().toLowerCase();
        var rawRecordName = String(record.agentName || '').trim().toLowerCase();

        var foundAgentIdx = -1;
        for (var oi = 0; oi < selAgent.options.length; oi++) {
            var opt = selAgent.options[oi];
            var optEmail = String(opt.dataset.agentEmail || '').trim().toLowerCase();
            var optName = String(opt.dataset.agentName || opt.textContent || '').trim().toLowerCase();
            var optAsgId = String(opt.dataset.asgId || '');

            if (asg && optAsgId && optAsgId === asg.id) {
                foundAgentIdx = oi;
                break;
            }
            if (targetEmail && optEmail === targetEmail) {
                foundAgentIdx = oi;
                break;
            }
            if (targetName && (optName === targetName || optName.includes(targetName) || targetName.includes(optName))) {
                foundAgentIdx = oi;
                break;
            }
            if (rawRecordName && (optName === rawRecordName || optName.includes(rawRecordName) || rawRecordName.includes(optName))) {
                foundAgentIdx = oi;
                break;
            }
        }

        if (foundAgentIdx !== -1) {
            selAgent.selectedIndex = foundAgentIdx;
            selectedAssignmentId = selAgent.options[foundAgentIdx].dataset.asgId || (asg && asg.id) || "";
        } else {
            var dispName = (snap && (snap.displayName || formatToDisplayName(snap.fullName))) || formatToDisplayName(record.agentName) || record.agentName || record.agentEmail || "Assigned Agent";
            var existingAgentOpt = Array.from(selAgent.options).find(function(o){
                var oName = String(o.dataset.agentName || o.textContent || '').trim().toLowerCase();
                var oEmail = String(o.dataset.agentEmail || '').trim().toLowerCase();
                return (targetEmail && oEmail === targetEmail) || (dispName && oName === dispName.toLowerCase());
            });
            if (!existingAgentOpt) {
                var newOpt = createElement("option");
                newOpt.value = "db:" + (targetEmail || record.agentName || "agent");
                newOpt.textContent = dispName;
                newOpt.dataset.agentName = dispName;
                newOpt.dataset.agentEmail = targetEmail;
                newOpt.dataset.rubricId = record.rubricId || "";
                newOpt.dataset.evalType = record.evaluationType || "Standard";
                selAgent.appendChild(newOpt);
                existingAgentOpt = newOpt;
            }
            existingAgentOpt.selected = true;
            selAgent.value = existingAgentOpt.value;
        }

        // 3. Auto-populate all header fields
        if(record.interactionId) inpInteractionId.value = record.interactionId;
        if(record.caseNo) inpCaseNo.value = record.caseNo;
        if(record.callDuration !== undefined && record.callDuration !== null && record.callDuration !== '') inpDuration.value = record.callDuration;
        if(record.callAniDnis && selAni) {
            resetAniDropdown();
            var rawAni = String(record.callAniDnis).trim();
            if (selAni.tagName === 'SELECT') {
                var hasAniOpt = Array.from(selAni.options).some(function(o){
                    return o.value.trim().toLowerCase() === rawAni.toLowerCase();
                });
                if (!hasAniOpt) {
                    var aniOpt = createElement("option");
                    aniOpt.value = rawAni;
                    aniOpt.textContent = rawAni;
                    selAni.appendChild(aniOpt);
                }
                var matchedAniOpt = Array.from(selAni.options).find(function(o){
                    return o.value.trim().toLowerCase() === rawAni.toLowerCase();
                });
                if (matchedAniOpt) {
                    selAni.value = matchedAniOpt.value;
                }
            } else {
                selAni.value = rawAni;
            }
        }
        if(record.dateOfInteraction) {
            inpDateInteraction.value = normalizeDateStr(record.dateOfInteraction);
        }
        if(record.caseCategory) inpCategory.value = record.caseCategory;
        if(record.caseSubCategory) inpSubCategory.value = record.caseSubCategory;
        if(record.issueConcern) txtIssue.value = record.issueConcern;
        if(record.evaluationType && selEvalType) {
            var rawEt = String(record.evaluationType).trim();
            var hasEtOpt = Array.from(selEvalType.options).some(function(o){
                return o.value.trim().toLowerCase() === rawEt.toLowerCase();
            });
            if (!hasEtOpt) {
                var etOpt = createElement("option");
                etOpt.value = rawEt;
                etOpt.textContent = rawEt;
                selEvalType.appendChild(etOpt);
            }
            var matchedEtOpt = Array.from(selEvalType.options).find(function(o){
                return o.value.trim().toLowerCase() === rawEt.toLowerCase();
            });
            if (matchedEtOpt) {
                selEvalType.value = matchedEtOpt.value;
            }
        }

        // 4. Switch Rubric if needed
        var targetRubricId = record.rubricId || (asg && asg.rubricId) || (currentRubric && currentRubric.id);
        if (targetRubricId && currentRubric && String(currentRubric.id) !== String(targetRubricId)) {
            switchRubricById(targetRubricId);
        }

        // 5. Restore Rubric answers, selected feedback chips, and feedback text
        if (record.evaluationDetails) {
            try {
                var details = typeof record.evaluationDetails === 'string' ? JSON.parse(record.evaluationDetails) : record.evaluationDetails;
                var normalizeStr = function(str) {
                    return String(str || '')
                        .replace(/^\d+\.\s*/, '')
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '');
                };

                if (typeof details === 'object' && details !== null && !Array.isArray(details)) {
                    Object.keys(details).forEach(function(secName){
                        var sItems = details[secName];
                        if (!Array.isArray(sItems)) return;
                        var secNorm = normalizeStr(secName);

                        sItems.forEach(function(it, itIdx){
                            var itQNorm = normalizeStr(it.question || it.title || it.shortName || '');
                            if (!itQNorm) return;

                            // Step 1: Find best matching item in state
                            // Priority 1: Match BOTH Section Name AND Question Name
                            var matchedKey = Object.keys(state).find(function(k){
                                var sObj = state[k];
                                if (!sObj) return false;
                                var sSecNorm = normalizeStr(sObj.sectionName || sObj.groupName || '');
                                var sQNorm = normalizeStr(sObj.question || sObj.cleanQuestion || '');
                                return (sSecNorm === secNorm || sSecNorm.includes(secNorm) || secNorm.includes(sSecNorm)) &&
                                       (sQNorm === itQNorm || sQNorm.includes(itQNorm) || itQNorm.includes(sQNorm));
                            });

                            // Priority 2: Match Question Name anywhere across state
                            if (!matchedKey) {
                                matchedKey = Object.keys(state).find(function(k){
                                    var sObj = state[k];
                                    if (!sObj) return false;
                                    var sQNorm = normalizeStr(sObj.question || sObj.cleanQuestion || '');
                                    return sQNorm === itQNorm || (itQNorm.length > 5 && (sQNorm.includes(itQNorm) || itQNorm.includes(sQNorm)));
                                });
                            }

                            // Priority 3: Match by Section Name + Item Index
                            if (!matchedKey) {
                                matchedKey = Object.keys(state).find(function(k){
                                    var sObj = state[k];
                                    if (!sObj) return false;
                                    var sSecNorm = normalizeStr(sObj.sectionName || sObj.groupName || '');
                                    return (sSecNorm === secNorm || sSecNorm.includes(secNorm) || secNorm.includes(sSecNorm)) && sObj.itemIdx === itIdx;
                                });
                            }

                            if (!matchedKey || !state[matchedKey]) return;
                            var sItem = state[matchedKey];

                            // Step 2: Match Option / Answer
                            var itSelRaw = String(it.selected || it.answerId || '').trim();
                            var itSelNorm = normalizeStr(itSelRaw);

                            var matchedOpt = sItem.options.find(function(o){
                                var oLabelNorm = normalizeStr(o.label || o.text || '');
                                var oIdNorm = normalizeStr(o.id || '');
                                return oLabelNorm === itSelNorm || oIdNorm === itSelNorm;
                            });

                            if (!matchedOpt) {
                                matchedOpt = sItem.options.find(function(o){
                                    var oLabelNorm = normalizeStr(o.label || o.text || '');
                                    return (oLabelNorm && itSelNorm && (oLabelNorm.includes(itSelNorm) || itSelNorm.includes(oLabelNorm)));
                                });
                            }

                            if (matchedOpt) {
                                sItem.sel = matchedOpt.id;
                                sItem.selIndex = sItem.options.indexOf(matchedOpt);
                            }

                            // Step 3: Restore Checkbox
                            if (it.checked !== undefined) {
                                sItem.checked = (it.checked === true || it.checked === 'true');
                            }

                            // Step 4: Restore Feedback Text
                            sItem.text = it.feedbackText || it.feedback || "";

                            // Step 5: Restore Feedback Chips
                            if (Array.isArray(it.feedbackChips) && it.feedbackChips.length > 0) {
                                sItem.selectedTags = it.feedbackChips.map(function(chipLabel){
                                    var existing = globalFeedbackTags.find(function(gt){
                                        var gtLabel = gt.buttonLabel || gt.button_label || gt.tagLabel || gt.tag_label || '';
                                        return normalizeStr(gtLabel) === normalizeStr(chipLabel);
                                    });
                                    return existing || {
                                        buttonLabel: chipLabel,
                                        text: chipLabel,
                                        id: 'chip_' + chipLabel,
                                        sectionIndex: sItem.secIdx,
                                        itemIndex: sItem.itemIdx,
                                        optionIndex: sItem.selIndex
                                    };
                                });
                            } else {
                                sItem.selectedTags = [];
                            }
                        });
                    });
                    refreshAllUI();
                    updateLiveScore();
                } else if (Array.isArray(details)) {
                    details.forEach(function(rItem){
                        var itQNorm = normalizeStr(rItem.question || rItem.itemId || '');
                        var matchedKey = Object.keys(state).find(function(k){
                            var sObj = state[k];
                            if (!sObj) return false;
                            return sObj.id === rItem.itemId || normalizeStr(sObj.question) === itQNorm;
                        });

                        if(matchedKey && state[matchedKey]) {
                            var sItem = state[matchedKey];
                            var itSelNorm = normalizeStr(rItem.answerId || rItem.selected || '');
                            var matchedOpt = sItem.options.find(function(o){
                                return normalizeStr(o.label || o.id) === itSelNorm;
                            });
                            if (matchedOpt) {
                                sItem.sel = matchedOpt.id;
                                sItem.selIndex = sItem.options.indexOf(matchedOpt);
                            }
                            sItem.text = rItem.feedbackText || rItem.feedback || "";
                            if (rItem.checked !== undefined) {
                                sItem.checked = (rItem.checked === true || rItem.checked === 'true');
                            }
                            if (Array.isArray(rItem.selectedTags)) {
                                sItem.selectedTags = rItem.selectedTags;
                            }
                        }
                    });
                    refreshAllUI();
                    updateLiveScore();
                }
            } catch(e) {
                console.error("Error restoring evaluation details:", e);
            }
        }
    };

    // Check for previous evaluation by Interaction ID or Assignment ID
    var checkExistingRecord = function(params) {
        params = params || {};
        var iId = params.interactionId || inpInteractionId.value.trim();
        var asgId = params.assignmentId || "";

        if(!iId && !asgId) {
            duplicateWarningBox.style.display = "none";
            return;
        }

        var trackerApiUrl = API_BASE_URL || DEFAULT_API_URL;
        if (trackerApiUrl && trackerApiUrl.indexOf('/api/bookmarklet') !== -1 && iId) {
            apiGet(trackerApiUrl + '/check-interaction', { interaction_id: iId })
                .then(function(result){
                    if (result && result.exists && result.evaluation) {
                        var ev = result.evaluation;
                        var mapped = {
                            id: ev.id,
                            assignmentId: ev.assignment_id,
                            interactionId: ev.interaction_id,
                            score: ev.score,
                            evaluationType: ev.evaluation_type,
                            rubricId: ev.rubric_id,
                            callDuration: ev.call_duration,
                            caseNo: ev.case_no,
                            callAniDnis: ev.call_ani_dnis,
                            dateOfInteraction: ev.date_of_interaction,
                            caseCategory: ev.case_category,
                            caseSubCategory: ev.case_sub_category,
                            issueConcern: ev.issue_concern,
                            evaluationDetails: ev.evaluation_details,
                            agentSnapshot: ev.agent_snapshot,
                            qaEmail: ev.qa_email,
                            qaName: ev.qa_name
                        };
                        populateEvaluationRecord(mapped);
                    } else {
                        duplicateWarningBox.style.display = "none";
                        duplicateWarningBox.innerHTML = "";
                    }
                })
                .catch(function(err){
                    console.warn("Check interaction API error:", err);
                });
            return;
        }

        // Direct Supabase fallback
        var sFilter = iId ? ('interaction_id=eq.' + encodeURIComponent(iId)) : ('assignment_id=eq.' + encodeURIComponent(asgId));
        supabaseFetch('evaluations?' + sFilter + '&order=submitted_at.desc&limit=1', 'GET')
        .then(function(rows){
            if (Array.isArray(rows) && rows.length > 0) {
                var ev = rows[0];
                var mapped = {
                    id: ev.id,
                    assignmentId: ev.assignment_id,
                    interactionId: ev.interaction_id,
                    score: ev.score,
                    evaluationType: ev.evaluation_type,
                    rubricId: ev.rubric_id,
                    callDuration: ev.call_duration,
                    caseNo: ev.case_no,
                    callAniDnis: ev.call_ani_dnis,
                    dateOfInteraction: ev.date_of_interaction,
                    caseCategory: ev.case_category,
                    caseSubCategory: ev.case_sub_category,
                    issueConcern: ev.issue_concern,
                    evaluationDetails: ev.evaluation_details,
                    agentSnapshot: ev.agent_snapshot,
                    qaEmail: ev.qa_email,
                    qaName: ev.qa_name
                };
                populateEvaluationRecord(mapped);
                return;
            }

            duplicateWarningBox.style.display = "none";
            duplicateWarningBox.innerHTML = "";
        })
        .catch(function(){
            duplicateWarningBox.style.display = "none";
            duplicateWarningBox.innerHTML = "";
        });
    };

    addListener(inpInteractionId, 'blur', checkExistingRecord);
    var idDebounceTimer = null;
    addListener(inpInteractionId, 'input', function(){
        clearTimeout(idDebounceTimer);
        idDebounceTimer = setTimeout(checkExistingRecord, 800);
    });

    // --- DOM Interaction & Generation ---
    var findGroupContainer = function(name) {
        var h2s = Array.from(document.querySelectorAll('h2'));
        var h2 = h2s.find(function(el){ return el.textContent.trim().toLowerCase().includes(name.toLowerCase()); });
        return h2 ? h2.closest('.padding-xlarge') : null;
    };

    var handleGeneration = function(saveToDb) {
        if (!selectedAssignmentId && (!selAgent || !selAgent.value)) {
            showToast("Please select an Agent first!", true);
            return;
        }

        var activeBtn = saveToDb ? btnGenerate : btnGenerateOnly;
        var originalText = activeBtn.textContent;
        activeBtn.textContent = "Generating... ⏳";

        [btnGenerate, btnGenerateOnly, btnSaveOnly, btnCancel, btnGenToggle].forEach(function(b){
            b.disabled = true;
            b.style.opacity = "0.7";
            b.style.cursor = "not-allowed";
        });

        var allKeys = Object.keys(state);
        var checkedKeys = allKeys.filter(function(k){ return state[k].checked; });
        var targetKeys = checkedKeys.length > 0 ? checkedKeys : allKeys;

        var index = 0;
        var processNext = function() {
            if(index >= targetKeys.length) {
                if(saveToDb) {
                    saveRecord('Partial').then(function(){
                        activeBtn.textContent = originalText;
                        [btnGenerate, btnGenerateOnly, btnSaveOnly, btnCancel, btnGenToggle].forEach(function(b){
                            b.disabled = false;
                            b.style.opacity = "1";
                            b.style.cursor = "pointer";
                        });
                        showToast("Generated and Saved as Partial in Personal QA Tracker!", false);
                        setTimeout(function(){ overlay.remove(); }, 1500);
                    }).catch(function(e){
                        showToast("Generated, but submission failed: " + e.message, true);
                        activeBtn.textContent = originalText;
                        [btnGenerate, btnGenerateOnly, btnSaveOnly, btnCancel, btnGenToggle].forEach(function(b){
                            b.disabled = false;
                            b.style.opacity = "1";
                            b.style.cursor = "pointer";
                        });
                    });
                } else {
                    activeBtn.textContent = originalText;
                    [btnGenerate, btnGenerateOnly, btnSaveOnly, btnCancel, btnGenToggle].forEach(function(b){
                        b.disabled = false;
                        b.style.opacity = "1";
                        b.style.cursor = "pointer";
                    });
                    showToast("Generated successfully in Stella Connect!", false);
                    genMenu.style.display = "none";
                }
                return;
            }

            var key = targetKeys[index];
            var s = state[key];
            var container = findGroupContainer(s.groupName);

            if(container) {
                var question = container.querySelector('[data-idx="' + s.itemId + '"]');
                if(question) {
                    var control = question.querySelector('[data-testid="SegmentedControl"]');
                    if(control) {
                        var buttons = Array.from(control.querySelectorAll('button'));
                        if(buttons[s.selIndex]) buttons[s.selIndex].click();
                    }

                    setTimeout(function(){
                        container = findGroupContainer(s.groupName);
                        var freshQuestion = container ? container.querySelector('[data-idx="' + s.itemId + '"]') : null;
                        if(freshQuestion) {
                            var finalText = (s.text || "").trim();
                            if(finalText) {
                                var txtArea = freshQuestion.querySelector('textarea');
                                if(txtArea) {
                                    var proto = Object.getPrototypeOf(txtArea);
                                    var setter = Object.getOwnPropertyDescriptor(proto, "value").set;
                                    if(setter) setter.call(txtArea, finalText);
                                    else txtArea.value = finalText;
                                    txtArea.dispatchEvent(new Event("input", { bubbles: true }));
                                    txtArea.dispatchEvent(new Event("change", { bubbles: true }));
                                }
                            }
                        }
                        setTimeout(function(){
                            index++;
                            processNext();
                        }, 450);
                    }, 1200);
                    return;
                }
            }
            index++;
            processNext();
        };
        processNext();
    };

    // --- Footer Controls ---
    var footer = createElement("div", sFooter);

    scoreBadge = createElement("div");
    scoreBadge.style.cssText = "margin-right:auto;font-size:12px;font-weight:700;padding:5px 12px;border-radius:20px;display:flex;align-items:center;gap:6px;transition:all 0.2s;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1";
    scoreBadge.innerHTML = "<span>Score: <strong>--</strong></span>";
    footer.appendChild(scoreBadge);

    var btnCancel = createElement("button", sBtnCancel);
    btnCancel.textContent = "Cancel";
    addListener(btnCancel, "click", function(){ overlay.remove(); });

    var btnSaveOnly = createElement("button", sBtnGenerate);
    btnSaveOnly.textContent = "Save Evaluation";
    btnSaveOnly.style.backgroundColor = "#059669";
    addListener(btnSaveOnly, "click", function(){
        btnSaveOnly.disabled = true;
        btnSaveOnly.textContent = "Saving...";
        saveRecord('Partial').then(function(){
            showToast("Evaluation saved as Partial in Personal QA Tracker! Ready to review and push.", false);
        }).catch(function(e){
            showToast(e.message, true);
        }).finally(function(){
            btnSaveOnly.disabled = false;
            btnSaveOnly.textContent = "Save Evaluation";
        });
    });

    var genDropdownContainer = createElement("div", "position:relative;display:flex;align-items:stretch");
    var btnGenerate = createElement("button", sBtnGenerate);
    btnGenerate.textContent = "Generate & Save";
    btnGenerate.style.borderRadius = "5px 0 0 5px";
    btnGenerate.style.margin = "0";

    var btnGenToggle = createElement("button", sBtnGenerate);
    btnGenToggle.innerHTML = "&#9662;";
    btnGenToggle.style.padding = "8px 10px";
    btnGenToggle.style.borderRadius = "0 5px 5px 0";
    btnGenToggle.style.borderLeft = "1px solid rgba(255,255,255,0.2)";
    btnGenToggle.style.margin = "0";

    var genMenu = createElement("div");
    genMenu.style.cssText = "position:absolute;bottom:100%;right:0;background:white;border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 -4px 14px rgba(0,0,0,0.12);display:none;flex-direction:column;min-width:160px;z-index:100001;margin-bottom:6px;overflow:hidden";

    var btnGenerateOnly = createElement("button");
    btnGenerateOnly.textContent = "Generate";
    btnGenerateOnly.style.cssText = "width:100%;text-align:left;padding:10px 14px;border:none;background:white;cursor:pointer;font-size:13px;color:#334155;transition:background 0.15s;font-family:inherit;font-weight:500";
    addListener(btnGenerateOnly, "mouseenter", function(){ btnGenerateOnly.style.background = "#f8fafc"; });
    addListener(btnGenerateOnly, "mouseleave", function(){ btnGenerateOnly.style.background = "white"; });

    genMenu.appendChild(btnGenerateOnly);
    genDropdownContainer.appendChild(btnGenerate);
    genDropdownContainer.appendChild(btnGenToggle);
    genDropdownContainer.appendChild(genMenu);

    addListener(btnGenToggle, "click", function(e){
        e.stopPropagation();
        var isVisible = genMenu.style.display === "flex";
        genMenu.style.display = isVisible ? "none" : "flex";
    });
    addListener(document, "click", function(){ genMenu.style.display = "none"; });

    addListener(btnGenerate, "click", function(){ handleGeneration(true); });
    addListener(btnGenerateOnly, "click", function(){ handleGeneration(false); });

    footer.appendChild(btnCancel);
    footer.appendChild(btnSaveOnly);
    footer.appendChild(genDropdownContainer);

    modal.appendChild(header);
    modal.appendChild(contentContainer);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Render initial placeholder immediately so modal never opens with blank rubric section
    renderNoAgentSelectedPlaceholder();

    // --- Settings Modal ---
    var showSettingsModal = function(isMandatory) {
        if (document.getElementById('qa-settings-modal-overlay')) return;

        var pOverlay = createElement("div", sOverlay + "; z-index:100002; background:transparent; pointer-events:none; display:flex; justify-content:center; align-items:flex-start; padding-top:20px; padding-bottom:20px; overflow-y:auto;");
        pOverlay.id = "qa-settings-modal-overlay";
        var pModal = createElement("div", "background:white;border-radius:8px;box-shadow:0 20px 40px rgba(0,0,0,0.3);width:90%;max-width:520px;height:auto;max-height:85vh;display:flex;flex-direction:column;cursor:default;user-select:auto;pointer-events:auto;position:relative;border:1px solid #cbd5e1;overflow:hidden;margin-bottom:20px;");
        var pHeader = createElement("div", sHeader + "; cursor:grab; border-radius:8px 8px 0 0; background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:12px 18px; flex-shrink:0;");
        pHeader.innerHTML = "<span style='font-size:15px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:6px;'>⚙️ <span>Configure Settings</span></span>";

        var pClose = createElement("span", "cursor:pointer;font-size:20px;color:#94a3b8;line-height:1;font-weight:400;padding:2px 6px;border-radius:4px;transition:all 0.15s");
        pClose.textContent = "×";
        addListener(pClose, "mouseenter", function(){ pClose.style.color = "#ef4444"; pClose.style.background = "#fee2e2"; });
        addListener(pClose, "mouseleave", function(){ pClose.style.color = "#94a3b8"; pClose.style.background = "transparent"; });
        addListener(pClose, "click", function(){
            if (isMandatory && !QA_EMAIL) {
                showToast("Please select your QA Account before continuing.", true);
                return;
            }
            pOverlay.remove();
        });
        pHeader.appendChild(pClose);

        makeDraggable(pModal, pHeader);

        var pBody = createElement("div", "padding:18px 20px;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:14px;scrollbar-width:thin;scrollbar-color:#94a3b8 #f1f5f9;");

        // 1. Supabase Cloud Connection Status Badge
        var statusBadge = createElement("div", "background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:10px 12px;display:flex;align-items:center;gap:10px;");
        statusBadge.innerHTML = "<span style='font-size:18px;'>⚡</span><div><div style='font-weight:700;color:#065f46;font-size:13px;'>Supabase Cloud Connected</div><div style='color:#047857;font-size:11px;'>Personal Staging Database (juevdlfhpgiedfjghrkk.supabase.co)</div></div>";
        pBody.appendChild(statusBadge);

        // 2. QA Full Name Input
        var grpName = createElement("div");
        var lblName = createElement("label", sLabel);
        lblName.innerHTML = "<span>Your QA Full Name</span> <span style='color:#ef4444'>*</span>";
        grpName.appendChild(lblName);

        var inpName = createElement("input", sInput);
        inpName.placeholder = "e.g. Aaron Smith";
        inpName.value = currentQaDisplayName || storage.get('qa_name', '');
        var wrapName = createIconFieldWrapper("✍️", inpName, true);
        grpName.appendChild(wrapName);
        pBody.appendChild(grpName);

        // 3. QA Account Email Input (pre-filled with your personal QA email)
        var grpEmail = createElement("div");
        var lblEmail = createElement("label", sLabel);
        lblEmail.innerHTML = "<span>Your QA Account Email</span> <span style='color:#ef4444'>*</span>";
        grpEmail.appendChild(lblEmail);

        var inpEmail = createElement("input", sInput);
        inpEmail.placeholder = DEFAULT_QA_EMAIL;
        inpEmail.value = QA_EMAIL || storage.get('qa_email', DEFAULT_QA_EMAIL);
        var wrapEmail = createIconFieldWrapper("👤", inpEmail, true);
        grpEmail.appendChild(wrapEmail);
        pBody.appendChild(grpEmail);

        // 3. Gemini API Key (with 🔑 in-field icon and ✏️ unlock/edit button)
        var grpKey = createElement("div");
        var lblKey = createElement("label", sLabel);
        lblKey.textContent = "Your Gemini API Key (from Google AI Studio)";
        grpKey.appendChild(lblKey);

        var initialKey = GEMINI_API_KEY || storage.get('gemini_key', '');

        var inpKey = createElement("input", sInput);
        inpKey.placeholder = "Paste your AIzaSy... key";
        inpKey.value = initialKey;
        inpKey.type = initialKey ? "password" : "text";

        var wrapKey = createElement("div", "position:relative;display:flex;align-items:center;width:100%;margin:0;");
        var iconKey = createElement("span", "position:absolute;left:11px;pointer-events:none;font-size:13px;z-index:2;user-select:none;display:inline-flex;align-items:center;justify-content:center;");
        iconKey.textContent = "🔑";

        inpKey.style.paddingLeft = "36px";
        inpKey.style.paddingRight = "36px";
        inpKey.style.boxSizing = "border-box";
        inpKey.style.width = "100%";
        inpKey.style.height = "36px";
        inpKey.style.margin = "0";

        var btnEditKey = createElement("span", "position:absolute;right:10px;cursor:pointer;font-size:14px;user-select:none;z-index:3;opacity:0.75;padding:2px;display:none;");
        btnEditKey.textContent = "✏️";
        btnEditKey.title = "Click to edit/update API key";

        // Shared helper: update the key field UI for a given key value
        var applyKeyToUI = function(keyVal) {
            inpKey.value = keyVal;
            if (keyVal) {
                inpKey.readOnly = true;
                inpKey.type = "password";
                inpKey.style.background = "#f8fafc";
                btnEditKey.style.display = "inline-flex";
                btnEditKey.textContent = "✏️";
                btnEditKey.title = "Click to edit/update API key";
            } else {
                inpKey.readOnly = false;
                inpKey.type = "text";
                inpKey.style.background = "#ffffff";
                btnEditKey.style.display = "none";
            }
        };

        addListener(btnEditKey, "mouseenter", function(){ btnEditKey.style.opacity = "1"; });
        addListener(btnEditKey, "mouseleave", function(){ btnEditKey.style.opacity = "0.75"; });
        addListener(btnEditKey, "click", function(){
            inpKey.readOnly = false;
            inpKey.style.background = "#ffffff";
            inpKey.type = "text";
            btnEditKey.textContent = "🔓";
            btnEditKey.title = "Unlocked for editing";
            inpKey.focus();
        });

        // Apply initial state
        applyKeyToUI(initialKey);

        wrapKey.appendChild(iconKey);
        wrapKey.appendChild(inpKey);
        wrapKey.appendChild(btnEditKey);
        grpKey.appendChild(wrapKey);

        var keyHelp = createElement("div", "font-size:11px;color:#94a3b8;margin-top:3px;");
        keyHelp.textContent = "Synced with Personal QA Tracker Settings & local browser storage.";
        grpKey.appendChild(keyHelp);
        pBody.appendChild(grpKey);

        // 3. Dynamic Gemini Model Combobox (with manual typing, Enter-to-save, and delete per option)
        var grpModel = createElement("div", "position:relative;");
        var lblModel = createElement("label", sLabel);
        lblModel.innerHTML = "<span>Gemini Model</span> <span style='font-size:11px;color:#64748b;font-weight:normal;'>(select, or type & press Enter to save, 🗑️ delete)</span>";
        grpModel.appendChild(lblModel);

        var wrapModel = createElement("div", "position:relative;display:flex;align-items:center;width:100%;");
        var iconModel = createElement("span", "position:absolute;left:11px;pointer-events:none;font-size:13px;z-index:2;user-select:none;display:inline-flex;align-items:center;justify-content:center;");
        iconModel.textContent = "🤖";

        var inpModel = createElement("input", sInput);
        inpModel.placeholder = "e.g. gemini-2.5-flash";
        inpModel.value = GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
        inpModel.style.paddingLeft = "36px";
        inpModel.style.paddingRight = "34px";
        inpModel.style.boxSizing = "border-box";
        inpModel.style.width = "100%";
        inpModel.style.height = "36px";
        inpModel.style.margin = "0";

        // Toggle caret button
        var btnToggleDropdown = createElement("button", "position:absolute;right:8px;background:transparent;border:none;cursor:pointer;padding:6px 8px;color:#64748b;font-size:11px;display:inline-flex;align-items:center;justify-content:center;height:100%;transition:color 0.15s;");
        btnToggleDropdown.type = "button";
        btnToggleDropdown.innerHTML = "▼";
        btnToggleDropdown.title = "Toggle model list";

        addListener(btnToggleDropdown, "mouseenter", function(){ btnToggleDropdown.style.color = "#1e293b"; });
        addListener(btnToggleDropdown, "mouseleave", function(){ btnToggleDropdown.style.color = "#64748b"; });

        wrapModel.appendChild(iconModel);
        wrapModel.appendChild(inpModel);
        wrapModel.appendChild(btnToggleDropdown);
        grpModel.appendChild(wrapModel);

        // Floating dropdown menu panel
        var dropdownMenu = createElement("div", "position:absolute;left:0;right:0;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.18);max-height:160px;overflow-y:auto;z-index:99999;display:none;padding:4px 0;scrollbar-width:thin;");
        grpModel.appendChild(dropdownMenu);

        var updateDropdownPosition = function() {
            var bodyRect = pBody.getBoundingClientRect();
            var wrapRect = wrapModel.getBoundingClientRect();
            var spaceBelow = bodyRect.bottom - wrapRect.bottom;
            var spaceAbove = wrapRect.top - bodyRect.top;

            if (spaceBelow < 180 && spaceAbove > 130) {
                dropdownMenu.style.top = "auto";
                dropdownMenu.style.bottom = "100%";
                dropdownMenu.style.marginTop = "0";
                dropdownMenu.style.marginBottom = "4px";
                dropdownMenu.style.boxShadow = "0 -8px 20px rgba(0,0,0,0.15)";
            } else {
                dropdownMenu.style.bottom = "auto";
                dropdownMenu.style.top = "100%";
                dropdownMenu.style.marginBottom = "0";
                dropdownMenu.style.marginTop = "4px";
                dropdownMenu.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
            }
        };

        var saveModelListToSupabase = function() {
            var sKey = SUPABASE_KEY || storage.get('supabase_key', DEFAULT_SUPABASE_KEY);
            if (!sKey) return;
            supabaseFetch('app_settings', 'POST', {
                gemini_model: inpModel.value.trim() || GEMINI_MODEL,
                updated_at: new Date().toISOString()
            }).catch(function(){});
        };

        var addCustomModel = function(modelName) {
            var m = String(modelName || '').trim();
            if (!m) return;
            if (!globalGeminiModels.some(function(existing){ return existing.toLowerCase() === m.toLowerCase(); })) {
                globalGeminiModels.push(m);
                storage.set('gemini_models', JSON.stringify(globalGeminiModels));
                saveModelListToSupabase();
                showToast("Saved " + m + " to database!", false);
            }
            inpModel.value = m;
            GEMINI_MODEL = m;
            renderModelOptions();
            dropdownMenu.style.display = "none";
            btnToggleDropdown.innerHTML = "▼";
        };

        var renderModelOptions = function() {
            dropdownMenu.innerHTML = "";
            var currentVal = inpModel.value.trim();

            globalGeminiModels.forEach(function(m){
                var itemRow = createElement("div", "display:flex;align-items:center;justify-content:space-between;padding:7px 12px;font-size:12px;cursor:pointer;transition:background 0.15s;border-bottom:1px solid #f8fafc;");
                var isCurrent = (m.toLowerCase() === currentVal.toLowerCase());
                if (isCurrent) {
                    itemRow.style.background = "#eff6ff";
                    itemRow.style.fontWeight = "600";
                    itemRow.style.color = "#1d4ed8";
                }

                var itemLabel = createElement("span", "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;");
                itemLabel.textContent = (isCurrent ? "✓ " : "  ") + m;

                var btnDelete = createElement("span", "cursor:pointer;color:#94a3b8;padding:2px 6px;border-radius:4px;font-size:12px;transition:all 0.15s;flex-shrink:0;");
                btnDelete.innerHTML = "🗑️";
                btnDelete.title = "Delete " + m;

                addListener(btnDelete, "mouseenter", function(){
                    btnDelete.style.color = "#ef4444";
                    btnDelete.style.background = "#fee2e2";
                });
                addListener(btnDelete, "mouseleave", function(){
                    btnDelete.style.color = "#94a3b8";
                    btnDelete.style.background = "transparent";
                });

                addListener(btnDelete, "click", function(e){
                    e.stopPropagation();
                    e.preventDefault();
                    if (globalGeminiModels.length <= 1) {
                        showToast("Cannot delete the only remaining model.", true);
                        return;
                    }
                    globalGeminiModels = globalGeminiModels.filter(function(mod){ return mod.toLowerCase() !== m.toLowerCase(); });
                    storage.set('gemini_models', JSON.stringify(globalGeminiModels));

                    if (inpModel.value.trim().toLowerCase() === m.toLowerCase()) {
                        inpModel.value = globalGeminiModels[0];
                        GEMINI_MODEL = globalGeminiModels[0];
                    }

                    saveModelListToSupabase();
                    renderModelOptions();
                    showToast("Deleted " + m, false);
                });

                addListener(itemRow, "mouseenter", function(){
                    if (!isCurrent) itemRow.style.background = "#f1f5f9";
                });
                addListener(itemRow, "mouseleave", function(){
                    if (!isCurrent) itemRow.style.background = "transparent";
                });

                addListener(itemRow, "click", function(){
                    inpModel.value = m;
                    GEMINI_MODEL = m;
                    dropdownMenu.style.display = "none";
                    btnToggleDropdown.innerHTML = "▼";
                });

                itemRow.appendChild(itemLabel);
                itemRow.appendChild(btnDelete);
                dropdownMenu.appendChild(itemRow);
            });

            // If user typed a custom model that doesn't exist yet, show prompt to add it
            if (currentVal && !globalGeminiModels.some(function(m){ return m.toLowerCase() === currentVal.toLowerCase(); })) {
                var addPromptRow = createElement("div", "padding:8px 12px;font-size:12px;cursor:pointer;background:#f0fdf4;color:#15803d;font-weight:600;border-top:1px solid #bbf7d0;display:flex;align-items:center;justify-content:space-between;transition:background 0.15s;");
                var leftSpan = createElement("span");
                leftSpan.textContent = "↵ Add \"" + currentVal + "\"";
                var rightHint = createElement("span", "font-size:10px;font-weight:normal;color:#166534;margin-left:6px;");
                rightHint.textContent = "(Press Enter)";
                addPromptRow.appendChild(leftSpan);
                addPromptRow.appendChild(rightHint);

                addListener(addPromptRow, "mouseenter", function(){ addPromptRow.style.background = "#dcfce7"; });
                addListener(addPromptRow, "mouseleave", function(){ addPromptRow.style.background = "#f0fdf4"; });
                addListener(addPromptRow, "click", function(){
                    addCustomModel(currentVal);
                });
                dropdownMenu.appendChild(addPromptRow);
            }
        };

        var toggleDropdown = function(show) {
            var willOpen = (show !== undefined) ? show : (dropdownMenu.style.display === "none");
            if (willOpen) {
                renderModelOptions();
                updateDropdownPosition();
                dropdownMenu.style.display = "block";
                btnToggleDropdown.innerHTML = "▲";
            } else {
                dropdownMenu.style.display = "none";
                btnToggleDropdown.innerHTML = "▼";
            }
        };

        addListener(btnToggleDropdown, "click", function(e){
            e.stopPropagation();
            toggleDropdown();
        });

        addListener(inpModel, "focus", function(){
            toggleDropdown(true);
        });

        addListener(inpModel, "input", function(){
            toggleDropdown(true);
        });

        addListener(inpModel, "keydown", function(e){
            if (e.key === "Enter") {
                e.preventDefault();
                var typed = inpModel.value.trim();
                if (typed) {
                    addCustomModel(typed);
                }
            } else if (e.key === "Escape") {
                dropdownMenu.style.display = "none";
                btnToggleDropdown.innerHTML = "▼";
            }
        });

        addListener(pBody, "scroll", function(){
            if (dropdownMenu.style.display === "block") {
                updateDropdownPosition();
            }
        });

        addListener(document, "click", function(e){
            if (!grpModel.contains(e.target)) {
                dropdownMenu.style.display = "none";
                btnToggleDropdown.innerHTML = "▼";
            }
        });

        pBody.appendChild(grpModel);

        // 4. AI Instructions (1 to 3 words title)
        var grpAiInstr = createElement("div");
        var lblAiInstr = createElement("label", sLabel);
        lblAiInstr.textContent = "AI Instructions";
        var txtSettingsAiInstr = createElement("textarea", sTextarea + "; height:75px; resize:vertical; font-size:12px; line-height:1.4;");
        txtSettingsAiInstr.placeholder = "Enter global feedback guidelines, tone, context rules...";
        txtSettingsAiInstr.value = aiInstructions.general || DEFAULT_GENERAL_INSTRUCTION;
        grpAiInstr.appendChild(lblAiInstr);
        grpAiInstr.appendChild(txtSettingsAiInstr);
        pBody.appendChild(grpAiInstr);

        // Footer
        var pFooter = createElement("div", sFooter);
        var pBtnSave = createElement("button", sBtnGenerate);
        pBtnSave.textContent = "Save Settings";
        pBtnSave.style.cssText = "padding:8px 18px;border:none;background:#2563eb;color:white;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;box-shadow:0 1px 3px rgba(37,99,235,0.3);";

        addListener(pBtnSave, "click", function(){
            var newName = inpName.value.trim();
            if (newName) {
                currentQaDisplayName = newName;
                qaFirstName = newName.split(' ')[0];
                storage.set('qa_name', currentQaDisplayName);
            }

            var newEmail = inpEmail.value.trim() || DEFAULT_QA_EMAIL;
            QA_EMAIL = newEmail;
            storage.set('qa_email', QA_EMAIL);

            if (!newName) {
                qaFirstName = formatEmailToName(newEmail).split(' ')[0];
            }
            GEMINI_API_KEY = inpKey.value.trim();

            var chosenModel = inpModel.value.trim() || DEFAULT_GEMINI_MODEL;
            GEMINI_MODEL = chosenModel;
            if (!globalGeminiModels.some(function(m){ return m.toLowerCase() === chosenModel.toLowerCase(); })) {
                globalGeminiModels.push(chosenModel);
            }

            var newInstr = txtSettingsAiInstr.value.trim() || DEFAULT_GENERAL_INSTRUCTION;
            aiInstructions.general = newInstr;

            storage.set('gemini_key', GEMINI_API_KEY);
            storage.set('gemini_model', GEMINI_MODEL);
            storage.set('gemini_models', JSON.stringify(globalGeminiModels));
            storage.set('ai_gen_instr', newInstr);

            pBtnSave.disabled = true;
            pBtnSave.textContent = "Saving...";

            var supKey = SUPABASE_KEY || storage.get('supabase_key', DEFAULT_SUPABASE_KEY);
            var savePromise = supKey
                ? supabaseFetch('app_settings', 'POST', {
                    gemini_api_key: GEMINI_API_KEY,
                    gemini_model: GEMINI_MODEL,
                    updated_at: new Date().toISOString()
                }).catch(function(e){ console.warn("app_settings sync:", e); })
                : Promise.resolve();

            savePromise.finally(function(){
                pBtnSave.disabled = false;
                pBtnSave.textContent = "Save Settings";
                pOverlay.remove();
                showToast("Settings saved to local cache!", false);
                checkAndSyncData(true);
            });

            updateHeaderTitle();
        });

        pFooter.appendChild(pBtnSave);

        pModal.appendChild(pHeader);
        pModal.appendChild(pBody);
        pModal.appendChild(pFooter);
        pOverlay.appendChild(pModal);
        document.body.appendChild(pOverlay);
    };

    var loadAssignmentsFromSupabase = function() {
        var sKey = SUPABASE_KEY || storage.get('supabase_key', DEFAULT_SUPABASE_KEY);
        if (!sKey) return Promise.resolve(false);
        return supabaseFetch('assignments?order=date.desc', 'GET')
            .then(function(rows) {
                if (Array.isArray(rows) && rows.length > 0) {
                    globalAssignments = rows.map(function(r) {
                        return {
                            id: r.id,
                            date: normalizeDateStr(r.date),
                            qaEmail: r.qa_email,
                            agentEmail: r.agent_email,
                            agentName: r.agent_name,
                            agentSnapshot: r.agent_snapshot,
                            rubricId: r.rubric_id,
                            evaluationType: r.evaluation_type,
                            status: r.status
                        };
                    });

                    var curNorm = normalizeDateStr(inpDateEvaluation.value);
                    var hasCurrent = globalAssignments.some(function(a){ return normalizeDateStr(a.date) === curNorm; });
                    if (!hasCurrent && globalAssignments.length > 0) {
                        var pending = globalAssignments.filter(function(a){ return a.status !== 'Completed'; });
                        var pick = pending.length > 0 ? pending[0] : globalAssignments[0];
                        if (pick && pick.date) {
                            inpDateEvaluation.value = normalizeDateStr(pick.date);
                        }
                    }

                    updateAgentDropdown();
                    var matchedAuto = autoSelectAssignmentAndDate();
                    if (!matchedAuto || !selAgent.value) {
                        renderNoAgentSelectedPlaceholder();
                    }
                    console.log("Toast QA: Loaded " + globalAssignments.length + " assignments from Supabase.");
                    return true;
                }
                return false;
            })
            .catch(function(err) {
                console.warn('Supabase assignments fetch error:', err);
                return false;
            });
    };

    var loadSettingsFromSupabase = function() {
        var sKey = SUPABASE_KEY || storage.get('supabase_key', DEFAULT_SUPABASE_KEY);
        if (!sKey) return Promise.resolve(false);
        return supabaseFetch('app_settings?select=*&limit=1', 'GET')
            .then(function(rows) {
                if (Array.isArray(rows) && rows.length > 0) {
                    var val = rows[0];
                    if (val.gemini_api_key && !GEMINI_API_KEY) {
                        GEMINI_API_KEY = val.gemini_api_key;
                        storage.set('gemini_key', val.gemini_api_key);
                    }
                    if (val.gemini_model && !storage.get('gemini_model', '')) {
                        GEMINI_MODEL = val.gemini_model;
                        storage.set('gemini_model', val.gemini_model);
                    }
                    return true;
                }
                return false;
            })
            .catch(function() { return false; });
    };

    var loadTemplatesFromSupabase = function() {
        var sKey = SUPABASE_KEY || storage.get('supabase_key', DEFAULT_SUPABASE_KEY);
        if (!sKey) return Promise.resolve(false);
        return supabaseFetch('feedback_templates?select=*', 'GET')
            .then(function(rows) {
                if (Array.isArray(rows) && rows.length > 0) {
                    globalFeedbackTags = rows.map(function(t){
                        return {
                            buttonLabel: t.button_label,
                            feedbackText: t.feedback_text,
                            sectionIndex: t.section_index,
                            itemIndex: t.item_index,
                            optionIndex: t.option_index,
                            rubricId: t.rubric_id
                        };
                    });
                    refreshFeedbackTagsAndGeneral();
                    return true;
                }
                return false;
            })
            .catch(function() { return false; });
    };

    // --- Sync & Initialization Logic (Bulk Processing & Local IndexedDB Storage) ---
    var checkAndSyncData = function(forceRefresh) {
        showLoading("Loading Toast QA Data...");

        var targetQaEmail = QA_EMAIL || storage.get('qa_email', DEFAULT_QA_EMAIL);
        var trackerApiUrl = API_BASE_URL || DEFAULT_API_URL;

        // Try Next.js Tracker API init first for high-speed bundled data
        if (trackerApiUrl && trackerApiUrl.indexOf('/api/bookmarklet') !== -1) {
            apiGet(trackerApiUrl + '/init', { qa_email: targetQaEmail })
                .then(function(data){
                    if (data && data.success) {
                        if (data.qa_name) {
                            currentQaDisplayName = data.qa_name;
                            qaFirstName = data.qa_name.split(' ')[0];
                            storage.set('qa_name', data.qa_name);
                        }
                        if (data.qa_email) {
                            QA_EMAIL = data.qa_email;
                            storage.set('qa_email', data.qa_email);
                        }
                        if (data.geminiApiKey && !storage.get('gemini_key', '')) {
                            GEMINI_API_KEY = data.geminiApiKey;
                            storage.set('gemini_key', data.geminiApiKey);
                        }
                        if (data.geminiModel && !storage.get('gemini_model', '')) {
                            GEMINI_MODEL = data.geminiModel;
                            storage.set('gemini_model', data.geminiModel);
                        }
                        if (Array.isArray(data.evalTypes) && data.evalTypes.length > 0) {
                            globalEvalTypes = data.evalTypes;
                            updateEvalTypesDropdown();
                        }
                        if (Array.isArray(data.rubrics) && data.rubrics.length > 0) {
                            allRubrics = data.rubrics;
                        }
                        if (Array.isArray(data.feedbackTemplates) && data.feedbackTemplates.length > 0) {
                            globalFeedbackTags = data.feedbackTemplates.map(function(t){
                                return {
                                    buttonLabel: t.button_label,
                                    feedbackText: t.feedback_text,
                                    sectionIndex: t.section_index,
                                    itemIndex: t.item_index,
                                    optionIndex: t.option_index,
                                    rubricId: t.rubric_id
                                };
                            });
                        }
                        if (Array.isArray(data.assignments)) {
                            globalAssignments = data.assignments;
                        }

                        // Save to IndexedDB cache
                        idb.set('cached_payload', {
                            rubrics: allRubrics,
                            assignments: globalAssignments,
                            feedbackChips: globalFeedbackTags,
                            evalTypes: globalEvalTypes,
                            qaName: currentQaDisplayName,
                            qaFirstName: qaFirstName
                        });

                        updateHeaderTitle();
                        updateAgentDropdown();
                        autoSelectAssignmentAndDate();
                        updateLiveScore();
                        hideLoading();
                        showToast("Connected to Personal QA Tracker (" + globalAssignments.length + " assignments)", false);
                        return true;
                    }
                    throw new Error("Init did not succeed");
                })
                .catch(function(err){
                    console.warn("Tracker API init failed (" + err.message + "), falling back to Supabase/Cache...");
                    runDirectFallbackSync(forceRefresh);
                });
            return;
        }

        runDirectFallbackSync(forceRefresh);
    };

    var runDirectFallbackSync = function(forceRefresh) {
        // 1. Bulk restore from IndexedDB immediately (instant 0ms startup!)
        idb.get('cached_payload').then(function(cached){
            if (cached && !forceRefresh) {
                allRubrics = (cached.rubrics && cached.rubrics.length > 0) ? cached.rubrics : [DEFAULT_FALLBACK_RUBRIC];
                if (cached.assignments && cached.assignments.length > 0) {
                    globalAssignments = cached.assignments;
                }
                globalFeedbackTags = cached.feedbackChips || [];
                globalFeedbackGeneral = cached.feedbackGeneral || [];
                globalUsers = cached.users || [];
                if (cached.evalTypes && Array.isArray(cached.evalTypes) && cached.evalTypes.length > 0) {
                    globalEvalTypes = cached.evalTypes;
                    updateEvalTypesDropdown();
                }
                if (cached.qaName) currentQaDisplayName = cached.qaName;
                if (cached.qaFirstName) qaFirstName = cached.qaFirstName;
                updateHeaderTitle();

                var matchedAuto = autoSelectAssignmentAndDate();
                if (!matchedAuto || !selAgent.value) {
                    renderNoAgentSelectedPlaceholder();
                }
                updateLiveScore();
                hideLoading();
            } else {
                if (!selAgent.value) {
                    renderNoAgentSelectedPlaceholder();
                }
            }

            // 2. Fetch fresh Settings, Templates, and Assignments directly from Supabase
            Promise.all([
                loadSettingsFromSupabase(),
                loadTemplatesFromSupabase()
            ]).then(function(){
                updateHeaderTitle();
            });

            loadAssignmentsFromSupabase().then(function(loaded){
                hideLoading();
                if (loaded) {
                    showToast("Loaded " + globalAssignments.length + " assignments from Supabase!", false);
                }
            });
        });
    };

    checkAndSyncData(false);
})();