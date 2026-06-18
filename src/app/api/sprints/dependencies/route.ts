import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BFS from `startId` following "depends_on" edges. Returns true if `targetId` is reachable.
// Used to detect cycles: before adding dep (taskId → dependsOnId), check if dependsOnId can reach taskId.
async function wouldCreateCycle(
  admin: ReturnType<typeof createAdminClient>,
  taskId: string,
  dependsOnId: string,
  projectId: string
): Promise<boolean> {
  const { data: allDeps } = await admin
    .from("task_dependencies")
    .select("task_id, depends_on_id")
    .eq("project_id", projectId);

  const deps = allDeps || [];
  // BFS from taskId: follow "is depended upon by" edges (i.e., tasks that list taskId as a blocker)
  // If we can reach dependsOnId from taskId, adding dependsOnId → taskId creates a cycle.
  const visited = new Set<string>();
  const queue = [taskId];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === dependsOnId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    // All tasks that depend on `cur` (cur is a blocker for them)
    deps.filter((d: any) => d.depends_on_id === cur).forEach((d: any) => queue.push(d.task_id));
  }
  return false;
}

// GET /api/sprints/dependencies?sprint_id=...
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get("sprint_id");
    if (!sprintId) return NextResponse.json({ error: "sprint_id required" }, { status: 400 });

    // Get all task IDs in this sprint first
    const admin = createAdminClient();
    const { data: taskIds } = await admin
      .from("sprint_tasks")
      .select("id")
      .eq("sprint_id", sprintId);

    if (!taskIds?.length) return NextResponse.json({ dependencies: [] });

    const ids = taskIds.map((t: any) => t.id);

    // Get all dependencies where either side is in this sprint
    const { data: deps, error } = await admin
      .from("task_dependencies")
      .select("id, task_id, depends_on_id, created_at")
      .or(`task_id.in.(${ids.join(",")}),depends_on_id.in.(${ids.join(",")})`);

    if (error) throw error;
    return NextResponse.json({ dependencies: deps ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/sprints/dependencies
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId, dependsOnId, projectId, workspaceId } = await request.json();

    if (!taskId || !dependsOnId || !projectId || !workspaceId) {
      return NextResponse.json({ error: "taskId, dependsOnId, projectId, workspaceId required" }, { status: 400 });
    }
    if (taskId === dependsOnId) {
      return NextResponse.json({ error: "A task cannot depend on itself" }, { status: 400 });
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("team_members").select("user_id")
      .eq("user_id", user.id).eq("workspace_id", workspaceId).maybeSingle();
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const admin = createAdminClient();

    // Cycle detection
    const cycle = await wouldCreateCycle(admin, taskId, dependsOnId, projectId);
    if (cycle) {
      return NextResponse.json(
        { error: "This dependency would create a circular dependency chain" },
        { status: 422 }
      );
    }

    const { data: dep, error } = await admin
      .from("task_dependencies")
      .insert({ task_id: taskId, depends_on_id: dependsOnId, project_id: projectId, workspace_id: workspaceId })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "This dependency already exists" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, dependency: dep });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/sprints/dependencies?id=...
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const depId = searchParams.get("id");
    if (!depId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from("task_dependencies").delete().eq("id", depId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
