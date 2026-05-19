import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";

export const runtime = "nodejs";

const DUMMY_MEMBERS = [
  {
    full_name: "Alice Johnson",
    job_title: "Project Manager",
    skills: ["Agile", "Scrum", "Risk Management", "Stakeholder Communication", "JIRA"],
    capacity_hours_per_week: 40,
    hourly_rate: 75,
    performance_score: 92,
  },
  {
    full_name: "Bob Chen",
    job_title: "Senior Frontend Developer",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "UI Development"],
    capacity_hours_per_week: 40,
    hourly_rate: 70,
    performance_score: 88,
  },
  {
    full_name: "Sara Ahmed",
    job_title: "Backend Engineer",
    skills: ["Node.js", "PostgreSQL", "REST APIs", "Python", "Microservices"],
    capacity_hours_per_week: 40,
    hourly_rate: 72,
    performance_score: 90,
  },
  {
    full_name: "David Kim",
    job_title: "UI/UX Designer",
    skills: ["Figma", "Prototyping", "User Research", "Wireframing", "Design Systems"],
    capacity_hours_per_week: 32,
    hourly_rate: 60,
    performance_score: 85,
  },
  {
    full_name: "Maria Lopez",
    job_title: "DevOps Engineer",
    skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Terraform", "Security"],
    capacity_hours_per_week: 40,
    hourly_rate: 80,
    performance_score: 94,
  },
  {
    full_name: "James Patel",
    job_title: "QA Engineer",
    skills: ["Cypress", "Jest", "Test Automation", "Manual Testing", "Bug Tracking"],
    capacity_hours_per_week: 40,
    hourly_rate: 55,
    performance_score: 87,
  },
  {
    full_name: "Emily Zhang",
    job_title: "Full Stack Developer",
    skills: ["React", "Node.js", "MongoDB", "GraphQL", "TypeScript"],
    capacity_hours_per_week: 40,
    hourly_rate: 68,
    performance_score: 91,
  },
  {
    full_name: "Omar Hassan",
    job_title: "Database Administrator",
    skills: ["PostgreSQL", "MySQL", "Redis", "Query Optimization", "Data Modeling"],
    capacity_hours_per_week: 32,
    hourly_rate: 65,
    performance_score: 83,
  },
  {
    full_name: "Priya Singh",
    job_title: "Business Analyst",
    skills: ["Requirements Gathering", "Documentation", "Stakeholder Analysis", "SQL", "Process Mapping"],
    capacity_hours_per_week: 40,
    hourly_rate: 58,
    performance_score: 86,
  },
  {
    full_name: "Lucas Müller",
    job_title: "Security Engineer",
    skills: ["Penetration Testing", "OAuth", "OWASP", "Compliance", "Threat Modeling"],
    capacity_hours_per_week: 32,
    hourly_rate: 85,
    performance_score: 89,
  },
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceId, count = 7 } = await request.json();
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Only allow in dev / for workspace owners (safety guard)
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "PM") {
      return NextResponse.json({ error: "Only workspace PMs can seed dummy members" }, { status: 403 });
    }

    // Delete existing dummy members for this workspace so re-running is idempotent
    await supabase
      .from("team_resources")
      .delete()
      .eq("workspace_id", workspaceId)
      .is("user_id", null); // dummy members have no real user_id

    const clampedCount = Math.min(Math.max(count, 4), 10);
    const toInsert = DUMMY_MEMBERS.slice(0, clampedCount).map((m) => ({
      workspace_id: workspaceId,
      user_id: null,            // no real auth user — dummy only
      full_name: m.full_name,
      email: m.full_name.toLowerCase().replace(" ", ".") + "@demo.com",
      job_title: m.job_title,
      skills: m.skills,
      capacity_hours_per_week: m.capacity_hours_per_week,
      hourly_rate: m.hourly_rate,
      performance_score: m.performance_score,
      status: "offline",
    }));

    const { error } = await supabase
      .from("team_resources")
      .insert(toInsert);

    if (error) {
      console.error("Seed error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Inserted ${toInsert.length} dummy team members`,
    });
  } catch (err: any) {
    console.error("Seed dummy members error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceId } = await request.json();
    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "PM") {
      return NextResponse.json({ error: "Only workspace PMs can remove dummy members" }, { status: 403 });
    }

    const { error } = await supabase
      .from("team_resources")
      .delete()
      .eq("workspace_id", workspaceId)
      .is("user_id", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: "Dummy team members removed" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
