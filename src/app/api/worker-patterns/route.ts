import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";

export const runtime = "nodejs";

// GET /api/worker-patterns?workspace_id=xxx&member_id=yyy (member_id optional)
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const workspace_id = searchParams.get("workspace_id");
        const member_id = searchParams.get("member_id");

        if (!workspace_id) {
            return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
        }

        let query = supabase
            .from("worker_patterns")
            .select("*")
            .eq("workspace_id", workspace_id)
            .eq("resolved", false)
            .order("created_at", { ascending: false });

        if (member_id) {
            query = query.or(`member_id.eq.${member_id},member_id_a.eq.${member_id},member_id_b.eq.${member_id}`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ patterns: data || [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/worker-patterns — create a new pattern
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const {
            workspace_id,
            pattern_type,   // 'task_incompatibility' | 'group_conflict'
            member_id,
            task_type,
            task_title,
            project_id,
            member_id_a,
            member_id_b,
            reason,
            severity = "caution",
        } = body;

        if (!workspace_id || !pattern_type || !reason) {
            return NextResponse.json({ error: "workspace_id, pattern_type, and reason are required" }, { status: 400 });
        }

        if (pattern_type === "task_incompatibility" && !member_id) {
            return NextResponse.json({ error: "member_id is required for task_incompatibility patterns" }, { status: 400 });
        }

        if (pattern_type === "group_conflict" && (!member_id_a || !member_id_b)) {
            return NextResponse.json({ error: "member_id_a and member_id_b are required for group_conflict patterns" }, { status: 400 });
        }

        const { data: pattern, error: insertError } = await supabase
            .from("worker_patterns")
            .insert({
                workspace_id,
                pattern_type,
                member_id: pattern_type === "task_incompatibility" ? member_id : null,
                task_type: task_type || null,
                task_title: task_title || null,
                project_id: project_id || null,
                member_id_a: pattern_type === "group_conflict" ? member_id_a : null,
                member_id_b: pattern_type === "group_conflict" ? member_id_b : null,
                reason,
                severity,
                resolved: false,
                created_by: user.id,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Recalculate performance_score for affected members
        if (pattern_type === "task_incompatibility" && member_id) {
            await recalculateScore(supabase, member_id, workspace_id);
        } else if (pattern_type === "group_conflict") {
            if (member_id_a) await recalculateScore(supabase, member_id_a, workspace_id);
            if (member_id_b) await recalculateScore(supabase, member_id_b, workspace_id);
        }

        return NextResponse.json({ success: true, pattern });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/worker-patterns — resolve/update a pattern
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id, resolved } = await request.json();
        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

        const { data: pattern, error: fetchError } = await supabase
            .from("worker_patterns")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !pattern) {
            return NextResponse.json({ error: "Pattern not found" }, { status: 404 });
        }

        const { error: updateError } = await supabase
            .from("worker_patterns")
            .update({ resolved: resolved ?? true })
            .eq("id", id);

        if (updateError) throw updateError;

        // Recalculate scores after resolving
        if (pattern.member_id) await recalculateScore(supabase, pattern.member_id, pattern.workspace_id);
        if (pattern.member_id_a) await recalculateScore(supabase, pattern.member_id_a, pattern.workspace_id);
        if (pattern.member_id_b) await recalculateScore(supabase, pattern.member_id_b, pattern.workspace_id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Helper: recalculate performance_score for a member based on unresolved patterns
async function recalculateScore(supabase: any, memberId: string, workspaceId: string) {
    const { data: patterns } = await supabase
        .from("worker_patterns")
        .select("severity")
        .eq("workspace_id", workspaceId)
        .eq("resolved", false)
        .or(`member_id.eq.${memberId},member_id_a.eq.${memberId},member_id_b.eq.${memberId}`);

    const deductions = (patterns || []).reduce((sum: number, p: any) => {
        if (p.severity === "blocker") return sum + 20;
        if (p.severity === "caution") return sum + 10;
        return sum + 3;
    }, 0);

    const score = Math.max(0, 100 - deductions);

    await supabase
        .from("team_members")
        .update({ performance_score: score })
        .eq("id", memberId);
}
