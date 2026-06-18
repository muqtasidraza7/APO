// Fire-and-forget server-side broadcast via Supabase Realtime REST API.
// Bypasses RLS — all subscribers on `topic` receive the event regardless of their DB permissions.
export function broadcastToChannel(topic: string, event: string, payload: unknown): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ messages: [{ topic, event, payload }] }),
  }).catch(() => {});
}

export function channelTopic(type: "general" | "project", id: string): string {
  return type === "general" ? `workspace:${id}` : `project:${id}`;
}
