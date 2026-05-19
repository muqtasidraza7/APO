"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Clock,
  Zap,
  CheckCircle2,
  ArrowRight,
  Loader2,
  FolderOpen,
  LayoutGrid,
  List,
  Trash2,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import ProjectCardActions from "../../../components/ProjectCardActions";
import { restoreProject } from "./actions";

interface EnrichedProject {
  id: string;
  name: string;
  status: string | null;
  ai_status: string | null;
  created_at: string;
  sprintCount: number;
  taskCount: number;
  completedTaskCount: number;
  milestoneCount: number;
  completedMilestoneCount: number;
  milestoneProgress: number | null;
}

interface DeletedProject {
  id: string;
  name: string;
  deleted_at: string;
  status: string | null;
  ai_status: string | null;
}

interface Props {
  projects: EnrichedProject[];
  deletedProjects: DeletedProject[];
  workspace: { id: string; name: string; owner_id: string };
  isAdmin: boolean;
  stats: { total: number; active: number; completed: number; pending: number };
}

type FilterType = "all" | "active" | "pending" | "completed";

function getStatusConfig(project: EnrichedProject) {
  const status = project.status || (project.ai_status === "completed" ? "active" : "pending");
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        headerGradient: "from-emerald-400 to-teal-500",
        ringColor: "#10b981",
        ringTrack: "#d1fae5",
        statusBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        value: "completed" as FilterType,
      };
    case "active":
      return {
        label: "Active",
        headerGradient: "from-indigo-500 to-violet-500",
        ringColor: "#6366f1",
        ringTrack: "#e0e7ff",
        statusBadge: "bg-indigo-50 text-indigo-700 border-indigo-200",
        dot: "bg-indigo-500",
        value: "active" as FilterType,
      };
    default:
      return {
        label: "Pending",
        headerGradient: "from-amber-400 to-orange-400",
        ringColor: "#f59e0b",
        ringTrack: "#fef3c7",
        statusBadge: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
        value: "pending" as FilterType,
      };
  }
}

function CircularProgress({
  percent,
  color,
  trackColor,
}: {
  percent: number;
  color: string;
  trackColor: string;
}) {
  const radius = 33;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <svg width="82" height="82" viewBox="0 0 82 82" className="flex-shrink-0">
      <circle cx="41" cy="41" r={radius} fill="none" stroke={trackColor} strokeWidth="6" />
      <circle
        cx="41"
        cy="41"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform="rotate(-90 41 41)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x="41"
        y="37"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="#1e293b"
      >
        {clamped}%
      </text>
      <text x="41" y="51" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">
        DONE
      </text>
    </svg>
  );
}

function ProjectCard({
  project,
  workspace,
  isAdmin,
}: {
  project: EnrichedProject;
  workspace: Props["workspace"];
  isAdmin: boolean;
}) {
  const cfg = getStatusConfig(project);
  const progress = project.milestoneProgress ?? 0;
  const hasProgress = project.milestoneCount > 0;
  const aiDone = project.ai_status === "completed";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group flex flex-col">
      {/* Gradient Header */}
      <Link href={`/dashboard/projects/${project.id}`} className="block">
        <div className={`bg-gradient-to-br ${cfg.headerGradient} px-5 pt-5 pb-6 relative overflow-hidden rounded-t-2xl`}>
          {/* Subtle dot texture */}
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1.2px, transparent 1.2px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="relative z-10">
            <h3 className="text-white font-bold text-xl leading-tight truncate group-hover:opacity-90 transition-opacity">
              {project.name}
            </h3>
            <p className="text-white/55 text-xs font-medium mt-1 truncate">
              {workspace.name}
            </p>
          </div>
        </div>
      </Link>

      {/* Body */}
      <div className="px-5 pt-4 pb-2 flex-1 flex flex-col gap-3">
        {/* Progress Ring + Meta */}
        <div className="flex items-center gap-4">
          {/* Ring */}
          {hasProgress ? (
            <CircularProgress
              percent={progress}
              color={cfg.ringColor}
              trackColor={cfg.ringTrack}
            />
          ) : (
            <div className="w-[82px] h-[82px] rounded-full border-[6px] border-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-slate-300 text-sm font-bold">—</span>
            </div>
          )}

          {/* Meta list */}
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${cfg.statusBadge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <Zap size={12} className="text-indigo-400 flex-shrink-0" />
              {project.sprintCount} Sprint{project.sprintCount !== 1 ? "s" : ""}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
              {project.completedTaskCount}/{project.taskCount} Tasks
            </div>

            {aiDone ? (
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
                <CheckCircle2 size={12} className="text-indigo-400 flex-shrink-0" />
                AI Plan Ready
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                <Loader2 size={12} className="animate-spin flex-shrink-0" />
                Building AI Plan…
              </div>
            )}
          </div>
        </div>

        {/* Milestone sub-line */}
        {hasProgress && (
          <p className="text-[11px] text-slate-400 font-medium -mt-1">
            {project.completedMilestoneCount} of {project.milestoneCount} milestones completed
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Clock size={12} />
          {new Date(project.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
        <div className="flex items-center gap-1">
          <ProjectCardActions
            projectId={project.id}
            projectName={project.name}
            isAdmin={isAdmin}
          />
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors group/link pl-1"
          >
            Open
            <ArrowRight
              size={13}
              className="group-hover/link:translate-x-0.5 transition-transform"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  workspace,
  isAdmin,
}: {
  project: EnrichedProject;
  workspace: Props["workspace"];
  isAdmin: boolean;
}) {
  const cfg = getStatusConfig(project);
  const progress = project.milestoneProgress ?? 0;
  const aiDone = project.ai_status === "completed";

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex items-center gap-4 group">
      {/* Status dot stripe */}
      <div className={`w-1 h-12 rounded-full flex-shrink-0 ${cfg.dot}`} />

      {/* Name + workspace */}
      <Link href={`/dashboard/projects/${project.id}`} className="flex-1 min-w-0 block">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-700 transition-colors">
            {project.name}
          </h3>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${cfg.statusBadge}`}
          >
            <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-slate-400 font-medium">{workspace.name}</p>
      </Link>

      {/* Progress bar */}
      <div className="hidden md:block w-28">
        <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
          <span>Progress</span>
          <span className="text-slate-700">
            {project.milestoneCount > 0 ? `${progress}%` : "—"}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full`}
            style={{
              width: `${project.milestoneCount > 0 ? progress : 0}%`,
              backgroundColor: cfg.ringColor,
            }}
          />
        </div>
      </div>

      {/* Meta pills */}
      <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600">
          <Zap size={10} className="text-indigo-400" />
          {project.sprintCount}
        </div>
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600">
          <CheckCircle2 size={10} className="text-emerald-400" />
          {project.completedTaskCount}/{project.taskCount}
        </div>
        {aiDone ? (
          <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600">
            <CheckCircle2 size={10} /> AI Ready
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg text-[10px] font-bold text-amber-600">
            <Loader2 size={10} className="animate-spin" /> Processing
          </div>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium flex-shrink-0">
        <Clock size={12} />
        {new Date(project.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <ArrowRight size={16} />
        </Link>
        <ProjectCardActions
          projectId={project.id}
          projectName={project.name}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}

export default function ProjectsClient({ projects, deletedProjects, workspace, isAdmin, stats }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [trashOpen, setTrashOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const getEffectiveStatus = (p: EnrichedProject): FilterType => {
    if (p.status === "completed") return "completed";
    if (p.status === "active" || (!p.status && p.ai_status === "completed")) return "active";
    return "pending";
  };

  const counts: Record<FilterType, number> = {
    all: projects.length,
    active: projects.filter((p) => getEffectiveStatus(p) === "active").length,
    pending: projects.filter((p) => getEffectiveStatus(p) === "pending").length,
    completed: projects.filter((p) => getEffectiveStatus(p) === "completed").length,
  };

  const filtered = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || getEffectiveStatus(p) === filter;
    return matchesSearch && matchesFilter;
  });

  const filterTabs: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
  ];

  async function handleRestore(projectId: string) {
    setRestoringId(projectId);
    setRestoreError(null);
    const result = await restoreProject(projectId);
    if (result?.error) {
      setRestoreError(result.error);
    }
    setRestoringId(null);
  }

  function daysRemaining(deletedAt: string) {
    const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">{workspace.name}</p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/projects/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium text-sm shadow-sm transition-colors self-start"
          >
            <Plus size={18} /> New Project
          </Link>
        )}
      </div>

      {/* Workspace Overview — segmented progress bar */}
      {stats.total > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-700">Workspace Overview</span>
            <span className="text-xs text-slate-400 font-medium">{stats.total} project{stats.total !== 1 ? "s" : ""}</span>
          </div>
          {/* Segmented bar */}
          <div className="h-2 rounded-full overflow-hidden flex gap-0.5">
            {stats.active > 0 && (
              <div
                className="bg-indigo-500 rounded-full transition-all duration-700"
                style={{ flex: stats.active }}
              />
            )}
            {stats.pending > 0 && (
              <div
                className="bg-amber-400 rounded-full transition-all duration-700"
                style={{ flex: stats.pending }}
              />
            )}
            {stats.completed > 0 && (
              <div
                className="bg-emerald-500 rounded-full transition-all duration-700"
                style={{ flex: stats.completed }}
              />
            )}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-5 mt-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
              {stats.active} Active
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              {stats.pending} Pending
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {stats.completed} Completed
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Filter tabs with count badges */}
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filter === tab.value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === tab.value
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {counts[tab.value]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* View toggle */}
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5 ml-auto flex-shrink-0">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-all ${
              viewMode === "grid"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-all ${
              viewMode === "list"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-700 font-bold text-lg mb-1">No projects found</p>
          <p className="text-slate-400 text-sm mb-6">
            {search
              ? `No results for "${search}"`
              : "No projects match the selected filter."}
          </p>
          {isAdmin && !search && (
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus size={16} /> Create your first project
            </Link>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              workspace={workspace}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              workspace={workspace}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Recently Deleted — admin only, only when there are deleted projects */}
      {isAdmin && deletedProjects.length > 0 && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => setTrashOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
              <Trash2 size={15} className="text-red-400" />
              Recently Deleted
              <span className="bg-red-50 text-red-500 border border-red-100 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {deletedProjects.length}
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform duration-200 ${trashOpen ? "rotate-180" : ""}`}
            />
          </button>

          {trashOpen && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {restoreError && (
                <div className="px-5 py-2.5 bg-red-50 text-red-600 text-xs font-medium">
                  {restoreError}
                </div>
              )}
              {deletedProjects.map((p) => {
                const days = daysRemaining(p.deleted_at);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {days > 0
                          ? `Permanently deleted in ${days} day${days !== 1 ? "s" : ""}`
                          : "Expires today"}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        days <= 3
                          ? "bg-red-50 text-red-600 border-red-200"
                          : days <= 7
                          ? "bg-amber-50 text-amber-600 border-amber-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      {days}d left
                    </span>
                    <button
                      onClick={() => handleRestore(p.id)}
                      disabled={restoringId === p.id}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {restoringId === p.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RotateCcw size={13} />
                      )}
                      Restore
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
