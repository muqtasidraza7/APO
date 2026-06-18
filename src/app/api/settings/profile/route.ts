import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const [{ data: wsMember }, { data: teamMember }] = await Promise.all([
      supabase
        .from("workspace_members")
        .select("workspace_id, user_skills, job_title, experience_level, years_of_experience")
        .eq("user_id", user.id)
        .single(),
      admin
        .from("team_members")
        .select("id, full_name, job_title, performance_score, skills, capacity_hours_per_week, notify_tasks, notify_risks, notify_sprints, notify_mentions")
        .eq("user_id", user.id)
        .single(),
    ]);

    const workspaceId = wsMember?.workspace_id;
    const teamMemberId = teamMember?.id;

    let sprintCompletion = "No sprint history";
    let milestoneCompletion = "No milestone history";

    if (workspaceId && teamMemberId) {
      const [{ data: sprintTasks }, { data: projects }] = await Promise.all([
        admin.from("sprint_tasks").select("assigned_to, status").eq("workspace_id", workspaceId),
        admin.from("projects").select("ai_data").eq("workspace_id", workspaceId),
      ]);

      const myTasks = (sprintTasks || []).filter((t: any) => t.assigned_to === teamMemberId);
      if (myTasks.length > 0) {
        const done = myTasks.filter((t: any) => t.status === "done").length;
        sprintCompletion = `${Math.round((done / myTasks.length) * 100)}% (${done}/${myTasks.length} tasks)`;
      }

      let msTotal = 0, msDone = 0;
      for (const p of (projects || [])) {
        for (const ms of (p.ai_data?.milestones || [])) {
          if ((ms.assigned_member_ids || []).includes(teamMemberId)) {
            msTotal++;
            if (ms.status === "completed") msDone++;
          }
        }
      }
      if (msTotal > 0) {
        milestoneCompletion = `${Math.round((msDone / msTotal) * 100)}% (${msDone}/${msTotal} milestones)`;
      }
    }

    return NextResponse.json({
      email: user.email,
      avatar_url: user.user_metadata?.avatar_url || null,
      full_name: teamMember?.full_name || user.user_metadata?.full_name || "",
      skills: wsMember?.user_skills || teamMember?.skills || [],
      job_title: wsMember?.job_title || teamMember?.job_title || "",
      experience_level: wsMember?.experience_level || "",
      years_of_experience: wsMember?.years_of_experience ?? null,
      capacity_hours_per_week: teamMember?.capacity_hours_per_week ?? 40,
      performance_score: teamMember?.performance_score ?? 100,
      sprint_completion: sprintCompletion,
      milestone_completion: milestoneCompletion,
      notify_tasks: teamMember?.notify_tasks ?? true,
      notify_risks: teamMember?.notify_risks ?? true,
      notify_sprints: teamMember?.notify_sprints ?? true,
      notify_mentions: teamMember?.notify_mentions ?? true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { skills, job_title, experience_level, years_of_experience, capacity_hours_per_week, full_name, notify_tasks, notify_risks, notify_sprints, notify_mentions } = await request.json();

    const admin = createAdminClient();

    const wsUpdate: Record<string, any> = { user_skills: skills ?? [] };
    if (job_title !== undefined) wsUpdate.job_title = job_title;
    if (experience_level !== undefined) wsUpdate.experience_level = experience_level;
    if (years_of_experience !== undefined) wsUpdate.years_of_experience = years_of_experience;

    const { error: wsError } = await supabase
      .from("workspace_members")
      .update(wsUpdate)
      .eq("user_id", user.id);

    if (wsError) return NextResponse.json({ error: wsError.message }, { status: 500 });

    const tmUpdate: Record<string, any> = { skills: skills ?? [] };
    if (job_title !== undefined) tmUpdate.job_title = job_title;
    if (capacity_hours_per_week !== undefined) tmUpdate.capacity_hours_per_week = capacity_hours_per_week;
    if (full_name?.trim()) tmUpdate.full_name = full_name.trim();
    if (notify_tasks !== undefined) tmUpdate.notify_tasks = notify_tasks;
    if (notify_risks !== undefined) tmUpdate.notify_risks = notify_risks;
    if (notify_sprints !== undefined) tmUpdate.notify_sprints = notify_sprints;
    if (notify_mentions !== undefined) tmUpdate.notify_mentions = notify_mentions;

    const { error: tmError } = await admin
      .from("team_members")
      .update(tmUpdate)
      .eq("user_id", user.id);

    if (tmError) console.warn("team_members update partial fail:", tmError.message);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
