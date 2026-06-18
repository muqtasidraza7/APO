"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Target,
  ShieldAlert,
  Sparkles,
  Info,
  GripVertical,
  Save,
} from "lucide-react";

interface Milestone {
  title: string;
  week: number;
  deliverable: string;
  success_criteria?: string;
  // runtime fields preserved but not edited here
  status?: string;
  completion_percentage?: number;
  assigned_member_ids?: string[];
}

interface Risk {
  description: string;
  severity: "high" | "medium" | "low";
  mitigation: string;
}

interface ProjectData {
  name: string;
  summary: string;
  budget_estimate: number | null;
  currency: string;
  timeline_weeks: number | null;
  start_date: string;
  end_date: string;
  milestones: Milestone[];
  risks: Risk[];
  required_skills: string[];
  requirements: string[];
  constraints: string[];
  assumptions: string[];
  success_criteria_kpis: string[];
  client_name: string;
  client_contact: string;
  client_email: string;
}

interface ProjectBlueprintEditorProps {
  project: any;
  onClose: () => void;
  onSaved: () => void;
}

type Tab = "overview" | "milestones" | "risks";

const SEVERITY_OPTS = [
  { value: "high", label: "High", color: "text-red-600 bg-red-50 border-red-200" },
  { value: "medium", label: "Medium", color: "text-orange-600 bg-orange-50 border-orange-200" },
  { value: "low", label: "Low", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white placeholder:text-slate-300 transition-all";
const textareaCls = `${inputCls} resize-none`;

// Chip list editor (for skills, requirements, constraints, assumptions)
function ChipListEditor({
  items,
  onChange,
  placeholder,
  maxItems = 10,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  maxItems?: number;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v) || items.length >= maxItems) return;
    onChange([...items, v]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="hover:text-red-500 transition-colors ml-0.5"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-slate-400 italic">No items yet</span>
        )}
      </div>
      {items.length < maxItems && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder={placeholder}
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProjectBlueprintEditor({
  project,
  onClose,
  onSaved,
}: ProjectBlueprintEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const aiData = project.ai_data || {};

  const [data, setData] = useState<ProjectData>({
    name: project.name || "",
    summary: aiData.summary || "",
    budget_estimate: aiData.budget_estimate ?? null,
    currency: aiData.currency || "USD",
    timeline_weeks: aiData.timeline_weeks ?? null,
    start_date: aiData.start_date || "",
    end_date: aiData.end_date || "",
    milestones: (aiData.milestones || []).map((m: any) => ({ ...m })),
    risks: (aiData.risks || []).map((r: any) => ({
      description: r.description || (typeof r === "string" ? r : ""),
      severity: r.severity || "medium",
      mitigation: r.mitigation || "",
    })),
    required_skills: aiData.required_skills || [],
    requirements: project.custom_fields?.requirements || [],
    constraints: project.custom_fields?.constraints || [],
    assumptions: project.custom_fields?.assumptions || [],
    success_criteria_kpis: project.success_criteria?.kpis || [],
    client_name: project.client_info?.name || "",
    client_contact: project.client_info?.contact_person || "",
    client_email: project.client_info?.email || "",
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const set = <K extends keyof ProjectData>(key: K, value: ProjectData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  // ── Milestone helpers ──────────────────────────────────────────────────────
  const addMilestone = () => {
    const maxWeek = data.milestones.reduce((acc, m) => Math.max(acc, m.week || 0), 0);
    setData((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { title: "", week: maxWeek + 1, deliverable: "", success_criteria: "" },
      ],
    }));
  };

  const updateMilestone = (idx: number, field: keyof Milestone, value: any) => {
    setData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === idx ? { ...m, [field]: value } : m
      ),
    }));
  };

  const deleteMilestone = (idx: number) => {
    setData((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== idx),
    }));
  };

  // ── Risk helpers ───────────────────────────────────────────────────────────
  const addRisk = () => {
    setData((prev) => ({
      ...prev,
      risks: [...prev.risks, { description: "", severity: "medium", mitigation: "" }],
    }));
  };

  const updateRisk = (idx: number, field: keyof Risk, value: any) => {
    setData((prev) => ({
      ...prev,
      risks: prev.risks.map((r, i) =>
        i === idx ? { ...r, [field]: value } : r
      ),
    }));
  };

  const deleteRisk = (idx: number) => {
    setData((prev) => ({
      ...prev,
      risks: prev.risks.filter((_, i) => i !== idx),
    }));
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveError("");

    // Validate milestones: each must have title + deliverable
    const invalidMs = data.milestones.findIndex((m) => !m.title.trim() || !m.deliverable.trim());
    if (invalidMs !== -1) {
      setSaveError(`Milestone ${invalidMs + 1} is missing a title or deliverable.`);
      setSaving(false);
      setActiveTab("milestones");
      return;
    }

    try {
      const payload = {
        projectId: project.id,
        name: data.name.trim() || project.name,
        ai_data: {
          summary: data.summary,
          budget_estimate: data.budget_estimate,
          currency: data.currency,
          timeline_weeks: data.timeline_weeks,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          milestones: [...data.milestones].sort((a, b) => (a.week || 0) - (b.week || 0)),
          risks: data.risks,
          required_skills: data.required_skills,
          requirements: data.requirements,
        },
        client_info: {
          name: data.client_name || null,
          contact_person: data.client_contact || null,
          email: data.client_email || null,
        },
        success_criteria: { kpis: data.success_criteria_kpis },
        custom_fields: {
          requirements: data.requirements,
          constraints: data.constraints,
          assumptions: data.assumptions,
        },
      };

      const res = await fetch("/api/update-project-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      onSaved();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "milestones", label: `Milestones (${data.milestones.length})`, icon: Target },
    { id: "risks", label: `Risks & Skills`, icon: ShieldAlert },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="w-full max-w-2xl bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles size={17} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Edit Project Blueprint</h2>
              <p className="text-xs text-slate-400">Changes save directly to the project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <>
              <Field label="Project Name">
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputCls}
                  placeholder="Project name"
                />
              </Field>

              <Field label="Executive Summary">
                <textarea
                  rows={3}
                  value={data.summary}
                  onChange={(e) => set("summary", e.target.value)}
                  className={textareaCls}
                  placeholder="2-3 sentence description of the project's purpose and primary goal"
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Budget Estimate">
                  <input
                    type="number"
                    value={data.budget_estimate ?? ""}
                    onChange={(e) => set("budget_estimate", e.target.value ? Number(e.target.value) : null)}
                    className={inputCls}
                    placeholder="e.g. 50000"
                    min={0}
                  />
                </Field>
                <Field label="Currency">
                  <input
                    type="text"
                    value={data.currency}
                    onChange={(e) => set("currency", e.target.value.toUpperCase())}
                    className={inputCls}
                    placeholder="USD"
                    maxLength={5}
                  />
                </Field>
                <Field label="Timeline (weeks)">
                  <input
                    type="number"
                    value={data.timeline_weeks ?? ""}
                    onChange={(e) => set("timeline_weeks", e.target.value ? Number(e.target.value) : null)}
                    className={inputCls}
                    placeholder="e.g. 12"
                    min={1}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date">
                  <input
                    type="date"
                    value={data.start_date}
                    onChange={(e) => set("start_date", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="End Date">
                  <input
                    type="date"
                    value={data.end_date}
                    onChange={(e) => set("end_date", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <p className="text-sm font-bold text-slate-700 mb-3">Client Information</p>
                <div className="space-y-3">
                  <Field label="Client Name">
                    <input
                      type="text"
                      value={data.client_name}
                      onChange={(e) => set("client_name", e.target.value)}
                      className={inputCls}
                      placeholder="Organization or individual name"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Contact Person">
                      <input
                        type="text"
                        value={data.client_contact}
                        onChange={(e) => set("client_contact", e.target.value)}
                        className={inputCls}
                        placeholder="Full name"
                      />
                    </Field>
                    <Field label="Contact Email">
                      <input
                        type="email"
                        value={data.client_email}
                        onChange={(e) => set("client_email", e.target.value)}
                        className={inputCls}
                        placeholder="email@example.com"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <p className="text-sm font-bold text-slate-700 mb-3">Project Success Criteria (KPIs)</p>
                <ChipListEditor
                  items={data.success_criteria_kpis}
                  onChange={(v) => set("success_criteria_kpis", v)}
                  placeholder="e.g. System handles 10k concurrent users"
                  maxItems={6}
                />
              </div>
            </>
          )}

          {/* ── MILESTONES TAB ────────────────────────────────────────────── */}
          {activeTab === "milestones" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Define milestones in chronological order. Each needs a measurable success criterion.
                </p>
                <button
                  type="button"
                  onClick={addMilestone}
                  disabled={data.milestones.length >= 8}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <Plus size={13} /> Add Milestone
                </button>
              </div>

              {data.milestones.length === 0 && (
                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Target size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400 font-medium">No milestones yet</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Add Milestone" to start</p>
                </div>
              )}

              <div className="space-y-4">
                {data.milestones.map((ms, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-slate-300" />
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                          M{idx + 1}
                        </span>
                        {ms.status && ms.status !== "pending" && (
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                            ms.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            ms.status === "in_progress" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {ms.status.replace("_", " ")}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMilestone(idx)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-3">
                          <SectionLabel>Title</SectionLabel>
                          <input
                            type="text"
                            value={ms.title}
                            onChange={(e) => updateMilestone(idx, "title", e.target.value)}
                            className={inputCls}
                            placeholder="e.g. User Authentication Module"
                          />
                        </div>
                        <div>
                          <SectionLabel>Week</SectionLabel>
                          <input
                            type="number"
                            value={ms.week}
                            onChange={(e) => updateMilestone(idx, "week", Number(e.target.value))}
                            className={inputCls}
                            min={1}
                            max={52}
                          />
                        </div>
                      </div>

                      <div>
                        <SectionLabel>Deliverable</SectionLabel>
                        <textarea
                          rows={2}
                          value={ms.deliverable}
                          onChange={(e) => updateMilestone(idx, "deliverable", e.target.value)}
                          className={textareaCls}
                          placeholder="Concrete output — e.g. 'Fully tested login/signup with JWT and password reset'"
                        />
                      </div>

                      <div>
                        <SectionLabel>Success Criteria</SectionLabel>
                        <input
                          type="text"
                          value={ms.success_criteria || ""}
                          onChange={(e) => updateMilestone(idx, "success_criteria", e.target.value)}
                          className={inputCls}
                          placeholder="Measurable acceptance criterion — e.g. '95% test coverage, <200ms response'"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── RISKS & SKILLS TAB ────────────────────────────────────────── */}
          {activeTab === "risks" && (
            <>
              {/* Risks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ShieldAlert size={15} className="text-red-500" />
                    Risks
                  </p>
                  <button
                    type="button"
                    onClick={addRisk}
                    disabled={data.risks.length >= 6}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Plus size={13} /> Add Risk
                  </button>
                </div>

                {data.risks.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <p className="text-sm text-slate-400 font-medium">No risks identified yet</p>
                  </div>
                )}

                <div className="space-y-3">
                  {data.risks.map((risk, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Risk {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteRisk(idx)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <SectionLabel>Description</SectionLabel>
                          <textarea
                            rows={2}
                            value={risk.description}
                            onChange={(e) => updateRisk(idx, "description", e.target.value)}
                            className={textareaCls}
                            placeholder="Clear risk statement — e.g. 'Third-party API rate limits may delay data sync'"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <SectionLabel>Severity</SectionLabel>
                            <select
                              value={risk.severity}
                              onChange={(e) => updateRisk(idx, "severity", e.target.value)}
                              className={inputCls}
                            >
                              {SEVERITY_OPTS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <SectionLabel>Mitigation</SectionLabel>
                            <input
                              type="text"
                              value={risk.mitigation}
                              onChange={(e) => updateRisk(idx, "mitigation", e.target.value)}
                              className={inputCls}
                              placeholder="Concrete action to reduce or prevent this risk"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Skills */}
              <div className="border-t border-slate-100 pt-5">
                <p className="text-sm font-bold text-slate-700 mb-3">Required Skills</p>
                <ChipListEditor
                  items={data.required_skills}
                  onChange={(v) => set("required_skills", v)}
                  placeholder="e.g. React, PostgreSQL, Docker"
                  maxItems={10}
                />
              </div>

              {/* Requirements */}
              <div className="border-t border-slate-100 pt-5">
                <p className="text-sm font-bold text-slate-700 mb-3">Key Requirements</p>
                <ChipListEditor
                  items={data.requirements}
                  onChange={(v) => set("requirements", v)}
                  placeholder="e.g. Multi-tenant authentication"
                  maxItems={8}
                />
              </div>

              {/* Constraints */}
              <div className="border-t border-slate-100 pt-5">
                <p className="text-sm font-bold text-slate-700 mb-3">Constraints</p>
                <ChipListEditor
                  items={data.constraints}
                  onChange={(v) => set("constraints", v)}
                  placeholder="e.g. Must use existing AWS infrastructure"
                  maxItems={5}
                />
              </div>

              {/* Assumptions */}
              <div className="border-t border-slate-100 pt-5">
                <p className="text-sm font-bold text-slate-700 mb-3">Assumptions</p>
                <ChipListEditor
                  items={data.assumptions}
                  onChange={(v) => set("assumptions", v)}
                  placeholder="e.g. Client will provide API access by Week 2"
                  maxItems={5}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-100 px-6 py-4">
          {saveError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-3 text-sm text-red-700">
              <AlertTriangle size={15} />
              {saveError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-indigo-200"
            >
              {saving ? (
                <><Loader2 size={15} className="animate-spin" /> Saving…</>
              ) : (
                <><Save size={15} /> Save Blueprint</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
