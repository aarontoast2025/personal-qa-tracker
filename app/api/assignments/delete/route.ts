import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const assignmentId = body.assignmentId?.trim();
    if (!assignmentId) {
      return NextResponse.json(
        { success: false, error: "Missing required assignmentId." },
        { status: 400 }
      );
    }

    // 1. Delete associated evaluations from Supabase
    const evaluationId = body.evaluationId?.trim();
    if (evaluationId) {
      await supabase.from("evaluations").delete().eq("id", evaluationId);
    }
    await supabase.from("evaluations").delete().eq("assignment_id", assignmentId);

    // 2. Delete the assignment record from Supabase
    const { error: asgErr } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId);

    if (asgErr) {
      throw new Error(`Failed to delete assignment: ${asgErr.message}`);
    }

    // 3. Log delete action in sync_logs
    await supabase.from("sync_logs").insert({
      user_email: user?.email || null,
      target_table: "assignments",
      operation: "delete",
      rows_affected: 1,
      status: "success",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Assignment ${assignmentId} and related records deleted from Supabase.`,
    });
  } catch (err: any) {
    console.error("Delete assignment error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete assignment record." },
      { status: 500 }
    );
  }
}
