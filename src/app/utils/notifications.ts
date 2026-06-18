import { createAdminClient } from "./supabase/admin";

const TYPE_TO_PREF: Record<string, string> = {
  task_assigned: "notify_tasks",
  sprint_closed: "notify_sprints",
  milestone_risk: "notify_risks",
  mention: "notify_mentions",
  dependency_unblocked: "notify_tasks",
};

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
}: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    const admin = createAdminClient();

    const prefCol = TYPE_TO_PREF[type];
    if (prefCol) {
      const { data: member } = await admin
        .from("team_members")
        .select(prefCol)
        .eq("user_id", userId)
        .maybeSingle();

      if (member && (member as unknown as Record<string, unknown>)[prefCol] === false) return;
    }

    await admin.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      link: link ?? null,
    });
  } catch {
    // Non-fatal — never let notification errors break the main flow
  }
}
