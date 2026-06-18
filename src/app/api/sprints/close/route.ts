import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";
import { createNotification } from "../../../utils/notifications";
import { getGroqModel } from "../../../utils/ai";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

export const runtime = "nodejs";

const behavioralSchema = z.object({
  insights: z.array(z.object({
    type: z.enum(["collaboration_positive", "collaboration_concern", "performance_insight"]),
    member_ids: z.array(z.string()).describe("Exact team member IDs from the data"),
    reason: z.string().describe("Specific, data-backed observation (mention names and numbers)"),
    severity: z.enum(["info", "caution", "blocker"]),
  })).describe("2-6 insights derived from sprint data and retrospective notes"),
});

async function analyzeSprintBehavior(
  sprintId: string,
  workspaceId: string,
  projectId: string,
  retrospective_notes: string | null
) {
  try {
    const admin = createAdminClient();

    // Fetch sprint tasks with assignee info
    const { data: tasks } = await admin
      .from("sprint_tasks")
      .select("id, title, status, assigned_to, time_estimate_hours, completed_at, parent_milestone_id")
      .eq("sprint_id", sprintId);

    if (!tasks || tasks.length === 0) return;

    // Fetch team members in workspace
    const { data: members } = await admin
      .from("team_members")
      .select("id, full_name, job_title, performance_score")
      .eq("workspace_id", workspaceId);

    if (!members || members.length === 0) return;

    const memberMap: Record<string, any> = {};
    for (const m of members) memberMap[m.id] = m;

    // Per-member stats
    const memberStats: Record<string, { name: string; role: string; assigned: number; done: number; lateCount: number; hours: number }> = {};

    for (const task of tasks) {
      const mid = task.assigned_to;
      if (!mid || !memberMap[mid]) continue;
      if (!memberStats[mid]) {
        memberStats[mid] = {
          name: memberMap[mid].full_name || memberMap[mid].job_title || mid,
          role: memberMap[mid].job_title || "Team Member",
          assigned: 0,
          done: 0,
          lateCount: 0,
          hours: 0,
        };
      }
      memberStats[mid].assigned++;
      if (task.status === "done") memberStats[mid].done++;
      memberStats[mid].hours += task.time_estimate_hours || 0;
    }

    // Build collaboration pairs (members who both had tasks in this sprint)
    const activeMembers = Object.keys(memberStats).filter(id => memberStats[id].assigned > 0);
    const pairs: string[] = [];
    for (let i = 0; i < activeMembers.length; i++) {
      for (let j = i + 1; j < activeMembers.length; j++) {
        pairs.push(`${activeMembers[i]} + ${activeMembers[j]}`);
      }
    }

    const statsText = Object.entries(memberStats)
      .map(([id, s]) => {
        const rate = s.assigned > 0 ? Math.round((s.done / s.assigned) * 100) : 0;
        return `  - ${s.name} (ID: ${id}, Role: ${s.role}): ${s.done}/${s.assigned} tasks done (${rate}%), ~${s.hours}h estimated`;
      })
      .join("\n");

    const model = getGroqModel(0.3);
    const structuredModel = model.withStructuredOutput(behavioralSchema);

    const promptTemplate = PromptTemplate.fromTemplate(`
You are a behavioral analytics AI for a project management system. Analyze a completed sprint and extract meaningful behavioral insights.

SPRINT TASK COMPLETION STATS:
{stats}

TEAM MEMBERS WHO COLLABORATED (worked in same sprint):
{pairs}

RETROSPECTIVE NOTES:
{retro}

INSTRUCTIONS:
1. Generate 2-6 behavioral insights based ONLY on the data above.
2. For high-performers (≥80% completion rate), generate a "collaboration_positive" or "performance_insight" with severity "info".
3. For low-performers (<50% completion rate), generate a "performance_insight" with severity "caution".
4. If retrospective notes mention any collaboration issues or wins, generate appropriate patterns.
5. For collaboration patterns, use EXACTLY TWO member IDs in member_ids.
6. For individual performance patterns, use EXACTLY ONE member ID in member_ids.
7. Only use IDs from the SPRINT TASK COMPLETION STATS section.
8. Be specific: mention completion rates, task counts, and retrospective notes in the reason.
9. If there are fewer than 2 members or insufficient data, return an empty insights array.
`);

    const prompt = await promptTemplate.invoke({
      stats: statsText || "No task data.",
      pairs: pairs.length > 0 ? pairs.join(", ") : "None (single-member sprint)",
      retro: retrospective_notes || "No retrospective notes provided.",
    });

    const result = await structuredModel.invoke(prompt);

    if (!result.insights || result.insights.length === 0) return;

    // Save patterns to DB
    const validMemberIds = new Set(members.map((m: any) => m.id));
    const toInsert: any[] = [];

    for (const insight of result.insights) {
      // Validate all member IDs exist
      if (!insight.member_ids.every((id) => validMemberIds.has(id))) continue;

      if (insight.type === "collaboration_positive" && insight.member_ids.length >= 2) {
        toInsert.push({
          workspace_id: workspaceId,
          project_id: projectId,
          pattern_type: "collaboration_positive",
          member_id_a: insight.member_ids[0],
          member_id_b: insight.member_ids[1],
          reason: insight.reason,
          severity: "info",
          resolved: false,
        });
      } else if (insight.type === "collaboration_concern" && insight.member_ids.length >= 2) {
        toInsert.push({
          workspace_id: workspaceId,
          project_id: projectId,
          pattern_type: "group_conflict",
          member_id_a: insight.member_ids[0],
          member_id_b: insight.member_ids[1],
          reason: insight.reason,
          severity: insight.severity,
          resolved: false,
        });
      } else if (insight.type === "performance_insight" && insight.member_ids.length >= 1) {
        toInsert.push({
          workspace_id: workspaceId,
          project_id: projectId,
          pattern_type: "performance_insight",
          member_id: insight.member_ids[0],
          reason: insight.reason,
          severity: insight.severity,
          resolved: false,
        });
      }
    }

    if (toInsert.length > 0) {
      await admin.from("worker_patterns").insert(toInsert);
    }
  } catch (err) {
    console.warn("Sprint behavioral analysis failed (non-fatal):", err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sprintId, retrospective_notes } = await request.json();
    if (!sprintId) return NextResponse.json({ error: "sprintId required" }, { status: 400 });

    // Fetch sprint to get workspace_id for role check
    const { data: sprintLookup } = await supabase.from("sprints").select("workspace_id").eq("id", sprintId).single();
    if (!sprintLookup) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

    const [{ data: ws }, { data: callerMember }] = await Promise.all([
      supabase.from("workspaces").select("owner_id").eq("id", sprintLookup.workspace_id).single(),
      supabase.from("workspace_members").select("role").eq("user_id", user.id).eq("workspace_id", sprintLookup.workspace_id).maybeSingle(),
    ]);
    if (ws?.owner_id !== user.id && callerMember?.role !== "pm") {
      return NextResponse.json({ error: "Only owners and PMs can close sprints" }, { status: 403 });
    }

    const { data: sprint, error } = await supabase
      .from("sprints")
      .update({ status: "completed", retrospective_notes: retrospective_notes || null })
      .eq("id", sprintId)
      .select()
      .single();

    if (error) throw error;

    // Fire-and-forget behavioral analysis (non-blocking)
    if (sprint?.workspace_id && sprint?.project_id) {
      analyzeSprintBehavior(sprintId, sprint.workspace_id, sprint.project_id, retrospective_notes || null)
        .catch(err => console.warn("Behavioral analysis background error:", err));
    }

    // Notify all members who had tasks in this sprint (fire-and-forget)
    if (sprint?.project_id) {
      (async () => {
        try {
          const admin = createAdminClient();
          const { data: tasks } = await admin
            .from("sprint_tasks")
            .select("assigned_to")
            .eq("sprint_id", sprintId)
            .not("assigned_to", "is", null);

          const memberIds = [...new Set((tasks || []).map((t: any) => t.assigned_to).filter(Boolean))];
          if (memberIds.length === 0) return;

          const { data: members } = await admin
            .from("team_members")
            .select("id, user_id")
            .in("id", memberIds);

          for (const member of (members || [])) {
            if (!member.user_id) continue;
            createNotification({
              userId: member.user_id,
              type: "sprint_closed",
              title: "Sprint closed",
              body: `Sprint "${sprint.name || "Sprint"}" has been completed`,
              link: `/dashboard/projects/${sprint.project_id}/sprints`,
            });
          }
        } catch {
          // Non-fatal
        }
      })();
    }

    return NextResponse.json({ success: true, sprint });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
