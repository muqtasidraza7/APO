"use client";

import { createClient } from "../../../../utils/supabase/client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  DollarSign,
  Target,
  Users,
  RefreshCw,
} from "lucide-react";
import DynamicFieldRenderer from "../../../../components/DynamicFieldRenderer";
import { getProjectTemplate } from "../../../../utils/projectTemplates";
import MilestoneList from "../../../../components/MilestoneList";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const handleMilestoneUpdate = async (milestoneId: string, updates: any) => {
    try {
      const response = await fetch('/api/update-milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId,
          projectId: id,
          updates
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update milestone');
      }

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setProject(data);
    } catch (error) {
      console.error('Error updating milestone:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchProject = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setProject(data);
      setLoading(false);
    };

    fetchProject();

    const channel = supabase
      .channel("project-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "projects",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log("Real-time update received:", payload.new);
          setProject(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  useEffect(() => {
    if (project?.ai_status === "parsing") {
      console.log("Triggering AI Analysis...");
      fetch("/api/process-document", {
        method: "POST",
        body: JSON.stringify({ projectId: id }),
      }).catch((err) => console.error("Trigger Error", err));
    }
  }, [project?.ai_status, id]);

  if (loading)
    return (
      <div className="p-12 text-center text-slate-400">Loading Project...</div>
    );

  if (!project)
    return (
      <div className="p-12 text-center text-red-500">Project not found</div>
    );

  if (project.ai_status === "parsing" || project.ai_status === "idle") {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-[var(--color-accent)]">
            <FileText size={32} />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          Analyzing "{project.name}"
        </h1>
        <p className="text-slate-500 text-lg mb-8 leading-relaxed max-w-md mx-auto">
          Our AI is reading your document to extract milestones, budget, and
          resource requirements.
        </p>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left space-y-4 shadow-sm max-w-md mx-auto">
          <div className="flex items-center gap-3 text-slate-900 font-medium">
            <CheckCircle2 size={20} className="text-green-500" />
            <span>Document Uploaded</span>
          </div>
          <div className="flex items-center gap-3 text-indigo-600 font-medium">
            <Loader2 size={20} className="animate-spin" />
            <span>Extracting Data (AI)</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <Clock size={20} />
            <span>Generating Timeline</span>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-8 text-sm text-slate-400 hover:text-slate-600 flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={14} /> Stuck? Refresh Page
        </button>
      </div>
    );
  }

  if (project.ai_status === "completed") {
    const data = project.ai_data || {};

    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} /> AI Analysis Complete
              </span>
              {project.project_type && project.project_type !== 'general' && (
                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                  {getProjectTemplate(project.project_type).icon} {getProjectTemplate(project.project_type).name}
                </span>
              )}
            </div>
            <h1 className="text-4xl font-bold text-slate-900">
              {project.name}
            </h1>
            <p className="text-lg text-slate-500 mt-4 max-w-4xl leading-relaxed">
              {data.summary}
            </p>
          </div>

          <Link
            href={`/dashboard/projects/${id}/allocation`}
            className="btn btn-primary shadow-lg shadow-indigo-100"
          >
            <Users size={18} className="mr-2" />
            View Resource Allocation
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <DollarSign size={20} />
              <span className="font-semibold uppercase text-xs tracking-wider">
                Estimated Budget
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {data.currency || "$"}{" "}
              {data.budget_estimate?.toLocaleString() || "0"}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Calendar size={20} />
              <span className="font-semibold uppercase text-xs tracking-wider">
                Timeline
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {data.timeline_weeks || 0} Weeks
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <AlertTriangle size={20} />
              <span className="font-semibold uppercase text-xs tracking-wider">
                Risks Identified
              </span>
            </div>
            <div className="text-3xl font-bold text-red-600">
              {data.risks?.length || 0}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Target size={20} className="text-[var(--color-accent)]" />
              Project Milestones
            </h2>
            <MilestoneList
              milestones={data.milestones || []}
              projectId={project.id}
              editable={true}
            />
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users size={20} className="text-[var(--color-accent)]" />
              Required Skills
            </h2>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex flex-wrap gap-2">
                {data.required_skills?.map((skill: string) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
              <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} /> Risk Assessment
              </h3>
              <ul className="space-y-3">
                {data.risks?.map((risk: any, i: number) => {
                  
                  const isObject = typeof risk === 'object' && risk !== null;
                  const description = isObject ? risk.description : risk;
                  const severity = isObject ? risk.severity : null;
                  const mitigation = isObject ? risk.mitigation : null;

                  return (
                    <li
                      key={i}
                      className="text-sm text-red-700 bg-white/50 rounded-lg p-3 border border-red-200"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-medium text-red-800">{description}</p>
                            {severity && (
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${severity === 'high' || severity === 'critical'
                                ? 'bg-red-200 text-red-900'
                                : severity === 'medium'
                                  ? 'bg-orange-200 text-orange-900'
                                  : 'bg-yellow-200 text-yellow-900'
                                }`}>
                                {severity}
                              </span>
                            )}
                          </div>
                          {mitigation && (
                            <p className="text-xs text-red-600 mt-2">
                              <strong>Mitigation:</strong> {mitigation}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <DynamicFieldRenderer
          data={{
            client_info: project.client_info,
            success_criteria: project.success_criteria,
            custom_fields: project.custom_fields
          }}
          projectType={project.project_type}
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-xl font-bold">Analysis Failed</h2>
      <p className="text-slate-500 mt-2">The AI could not read the document.</p>
      <button
        onClick={() => window.location.reload()}
        className="btn btn-outline mt-6"
      >
        Try Again
      </button>
    </div>
  );
}
