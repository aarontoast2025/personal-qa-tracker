"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractSheetId } from "@/lib/google/sheets";

export async function saveGoogleSheetId(formData: FormData) {
  const rawInput = (formData.get("google_sheet_id") as string) || "";
  const sheetId = extractSheetId(rawInput);

  if (!sheetId) {
    return { error: "Please enter a valid Google Sheet ID or URL." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if an existing settings row exists
  const { data: existing } = await supabase
    .from("app_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  let error;
  if (existing) {
    const res = await supabase
      .from("app_settings")
      .update({
        google_sheet_id: sheetId,
        user_id: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    error = res.error;
  } else {
    const res = await supabase.from("app_settings").insert({
      google_sheet_id: sheetId,
      user_id: user?.id,
      updated_at: new Date().toISOString(),
    });
    error = res.error;
  }

  if (error) {
    return { error: error.message || "Failed to save Google Sheet ID." };
  }

  revalidatePath("/settings");
  revalidatePath("/assignments");
  return { success: true, sheetId };
}

export async function saveGeminiApiKey(formData: FormData) {
  const geminiApiKey = ((formData.get("gemini_api_key") as string) || "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("app_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  let error;
  if (existing) {
    const res = await supabase
      .from("app_settings")
      .update({
        gemini_api_key: geminiApiKey,
        user_id: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    error = res.error;
  } else {
    const res = await supabase.from("app_settings").insert({
      gemini_api_key: geminiApiKey,
      user_id: user?.id,
      updated_at: new Date().toISOString(),
    });
    error = res.error;
  }

  if (error) {
    return { error: error.message || "Failed to save Gemini API Key." };
  }

  revalidatePath("/settings");
  return { success: true, geminiApiKey };
}
