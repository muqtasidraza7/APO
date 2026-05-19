import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";
import type { AppRole } from "../../../utils/roles";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: membership } = await admin
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) return NextResponse.json({ role: "member" as AppRole });

    const { data: ws } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", membership.workspace_id)
      .single();

    let role: AppRole = "member";
    if (ws?.owner_id === user.id) {
      role = "owner";
    } else {
      const r = (membership.role as string | null)?.toLowerCase();
      if (r === "pm") role = "pm";
      else if (r === "client") role = "client";
    }

    return NextResponse.json({ role, workspaceId: membership.workspace_id });
  } catch {
    return NextResponse.json({ role: "member" as AppRole });
  }
}
