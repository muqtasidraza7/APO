import { createClient } from "../../../../../utils/supabase/server";
import { redirect } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import AllocationClient from "./AllocationClient";

export default async function AllocationPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", id)
    .single();

  if (!project) redirect("/dashboard");

  // Role check — only owners and PMs can access Team Allocation
  const [{ data: ws }, { data: membership }] = await Promise.all([
    supabase.from("workspaces").select("owner_id").eq("id", project.workspace_id).single(),
    supabase.from("workspace_members").select("role").eq("workspace_id", project.workspace_id).eq("user_id", user.id).maybeSingle(),
  ]);

  const isAdmin = ws?.owner_id === user.id || membership?.role === "pm";

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={36} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Access Restricted</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          Team Allocation is a project management feature. Only the workspace owner or project manager can assign team members to milestones.
        </p>
        <Link
          href={`/dashboard/projects/${id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Project
        </Link>
      </div>
    );
  }

  return <AllocationClient />;
}
