import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bookmarklet-Token",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY is not configured in Vercel Environment Variables.",
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { prompt, systemInstruction, isJson, model } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Prompt is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const chosenModel = (model && typeof model === "string" ? model.trim() : "") || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${apiKey}`;

    const payload: any = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    if (isJson) {
      payload.generationConfig = { responseMimeType: "application/json" };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `Gemini API error (${res.status})`;
      return NextResponse.json(
        { success: false, error: msg },
        { status: res.status, headers: corsHeaders }
      );
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .join("")
        .trim() || "";

    return NextResponse.json(
      { success: true, text },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Gemini API proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process Gemini AI request.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
