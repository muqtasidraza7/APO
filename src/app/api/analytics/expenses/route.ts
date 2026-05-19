import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = [
  "hosting", "license", "tools", "hardware", "design",
  "marketing", "travel", "training", "contractor", "other",
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });

    const admin = createAdminClient();
    const { data: expenses, error } = await admin
      .from("project_expenses")
      .select("*")
      .eq("project_id", projectId)
      .order("expense_date", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ expenses: expenses ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, workspaceId, category, description, amount, expense_date } = await request.json();

    if (!projectId || !workspaceId || !description || amount === undefined) {
      return NextResponse.json({ error: "projectId, workspaceId, description, amount required" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    const cat = VALID_CATEGORIES.includes(category) ? category : "other";

    // Verify workspace membership
    const { data: member } = await supabase
      .from("team_members").select("user_id")
      .eq("user_id", user.id).eq("workspace_id", workspaceId).maybeSingle();
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const admin = createAdminClient();
    const { data: expense, error } = await admin
      .from("project_expenses")
      .insert({
        project_id: projectId,
        workspace_id: workspaceId,
        created_by: user.id,
        category: cat,
        description: description.trim(),
        amount: parsedAmount,
        expense_date: expense_date || new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, expense });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get("id");
    if (!expenseId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const admin = createAdminClient();

    // Verify the requester created it
    const { data: existing } = await admin
      .from("project_expenses").select("created_by").eq("id", expenseId).maybeSingle();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await admin.from("project_expenses").delete().eq("id", expenseId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
