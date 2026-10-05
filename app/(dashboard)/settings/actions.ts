"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractSheetId } from "@/lib/google/sheets";
import { normalizeWebAppUrl } from "@/lib/google/web-app-client";

export async function saveGoogleSheetId(formData: FormData) {
  const rawInput = (formData.get("google_sheet_id") as string) || "";
  const webAppUrlInput = ((formData.get("google_web_app_url") as string) || "").trim();
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

  const updatePayload: Record<string, any> = {
    google_sheet_id: sheetId,
    user_id: user?.id,
    updated_at: new Date().toISOString(),
  };
  if (webAppUrlInput) {
    updatePayload.google_web_app_url = normalizeWebAppUrl(webAppUrlInput);
  }

  let error;
  if (existing) {
    const res = await supabase
      .from("app_settings")
      .update(updatePayload)
      .eq("id", existing.id);
    if (res.error && res.error.message?.includes("google_web_app_url")) {
      delete updatePayload.google_web_app_url;
      const retry = await supabase
        .from("app_settings")
        .update(updatePayload)
        .eq("id", existing.id);
      error = retry.error;
    } else {
      error = res.error;
    }
  } else {
    const res = await supabase.from("app_settings").insert(updatePayload);
    if (res.error && res.error.message?.includes("google_web_app_url")) {
      delete updatePayload.google_web_app_url;
      const retry = await supabase.from("app_settings").insert(updatePayload);
      error = retry.error;
    } else {
      error = res.error;
    }
  }

  if (error) {
    return { error: error.message || "Failed to save Google Sheet ID." };
  }

  revalidatePath("/settings");
  revalidatePath("/assignments");
  return { success: true, sheetId };
}

