"use client";

import React, { useState } from 'react';
import {
    Building2,
    Mail,
    Phone,
    Users,
    Target,
    AlertCircle,
    CheckCircle2,
    FileText,
    TrendingUp,
    Shield,
    Lightbulb,
    Sparkles,
    Loader2,
    X,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

interface DynamicFieldRendererProps {
    data: any;
    projectType?: string;
}

const PLACEHOLDER_VALUES = new Set([
    'unknown', 'n/a', 'na', 'none', 'not provided', 'not applicable',
    'tbd', 'tba', '-', 'null', 'undefined', 'unspecified', 'not specified',
]);

function hasContent(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') {
        const t = value.trim();
        return t.length > 0 && !PLACEHOLDER_VALUES.has(t.toLowerCase());
    }
    if (typeof value === 'number' || typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0 && value.some(hasContent);
    if (typeof value === 'object') return Object.values(value).some(hasContent);
    return false;
}

// ── Elaborate button + panel ──────────────────────────────────────────────────
interface ElaborateState {
    loading: boolean;
    text?: string;
}

function ElaborateButton({
    itemKey,
    text,
    projectType,
    section,
    elaborations,
    setElaborations,
    accentClass,
    panelClass,
}: {
    itemKey: string;
    text: string;
    projectType?: string;
    section: string;
    elaborations: Record<string, ElaborateState>;
    setElaborations: React.Dispatch<React.SetStateAction<Record<string, ElaborateState>>>;
    accentClass: string;
    panelClass: string;
}) {
    const state = elaborations[itemKey];

    const toggle = async () => {
        if (state?.text) {
            setElaborations(prev => { const n = { ...prev }; delete n[itemKey]; return n; });
            return;
        }
        if (state?.loading) return;
        setElaborations(prev => ({ ...prev, [itemKey]: { loading: true } }));
        try {
            const res = await fetch('/api/elaborate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, projectType, section }),
            });
            const json = await res.json();
            setElaborations(prev => ({
                ...prev,
                [itemKey]: { loading: false, text: json.elaboration || 'No elaboration available.' },
            }));
        } catch {
            setElaborations(prev => ({ ...prev, [itemKey]: { loading: false, text: 'Could not load elaboration.' } }));
        }
    };

    return (
        <div>
            <button
                onClick={toggle}
                disabled={state?.loading}
                className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all select-none ${
                    state?.text
                        ? `${accentClass} opacity-80`
                        : `bg-white/70 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300`
                } ${state?.loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                {state?.loading ? (
                    <Loader2 size={10} className="animate-spin" />
                ) : state?.text ? (
                    <ChevronUp size={10} />
                ) : (
                    <Sparkles size={10} />
                )}
                {state?.loading ? 'Elaborating…' : state?.text ? 'Collapse' : 'Explain with AI'}
            </button>

            {state?.text && (
                <div className={`mt-2 rounded-xl border p-3 ${panelClass}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={10} className="opacity-60" />
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">AI Insight</span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">{state.text}</p>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DynamicFieldRenderer({ data, projectType }: DynamicFieldRendererProps) {
    const [elaborations, setElaborations] = useState<Record<string, ElaborateState>>({});

    if (!data) return null;

    const elabProps = (key: string, text: string, section: string, accentClass: string, panelClass: string) => ({
        itemKey: key,
        text,
        projectType,
        section,
        elaborations,
        setElaborations,
        accentClass,
        panelClass,
    });

    return (
        <div className="space-y-5">

            {/* ── Client Information ───────────────────────────────────────────── */}
            {hasContent(data.client_info) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center">
                            <Building2 size={13} className="text-indigo-600" />
                        </div>
                        Client Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {hasContent(data.client_info.name) && (
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company</p>
                                <p className="text-sm font-semibold text-slate-900">{data.client_info.name}</p>
                            </div>
                        )}
                        {hasContent(data.client_info.contact_person) && (
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact</p>
                                <p className="text-sm font-semibold text-slate-900">{data.client_info.contact_person}</p>
                            </div>
                        )}
                        {hasContent(data.client_info.email) && (
                            <div className="flex items-center gap-2">
                                <Mail size={14} className="text-slate-400 flex-shrink-0" />
                                <a href={`mailto:${data.client_info.email}`} className="text-sm text-indigo-600 hover:underline font-medium">
                                    {data.client_info.email}
                                </a>
                            </div>
                        )}
                        {hasContent(data.client_info.phone) && (
                            <div className="flex items-center gap-2">
                                <Phone size={14} className="text-slate-400 flex-shrink-0" />
                                <a href={`tel:${data.client_info.phone}`} className="text-sm text-slate-700 font-medium">
                                    {data.client_info.phone}
                                </a>
                            </div>
                        )}
                    </div>
                    {data.client_info.stakeholders && data.client_info.stakeholders.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-slate-100">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Users size={11} /> Stakeholders
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {data.client_info.stakeholders.map((s: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Success Criteria ─────────────────────────────────────────────── */}
            {hasContent(data.success_criteria) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                        <div className="w-7 h-7 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center">
                            <Target size={13} className="text-emerald-600" />
                        </div>
                        Success Criteria
                    </h3>

                    {data.success_criteria.kpis && data.success_criteria.kpis.length > 0 && (
                        <div className="mb-5">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <TrendingUp size={11} /> Key Performance Indicators
                            </p>
                            <div className="space-y-2">
                                {data.success_criteria.kpis.map((kpi: string, i: number) => (
                                    <div key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                                {i + 1}
                                            </div>
                                            <p className="text-sm text-slate-800 font-medium leading-snug flex-1">{kpi}</p>
                                        </div>
                                        <div className="ml-8">
                                            <ElaborateButton {...elabProps(`kpi-${i}`, kpi, 'KPI', 'bg-emerald-100 border-emerald-200 text-emerald-700', 'bg-emerald-50 border-emerald-200 text-emerald-800')} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.success_criteria.acceptance_criteria && data.success_criteria.acceptance_criteria.length > 0 && (
                        <div className="mb-5">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Acceptance Criteria</p>
                            <div className="space-y-2">
                                {data.success_criteria.acceptance_criteria.map((c: string, i: number) => (
                                    <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-slate-700 leading-snug flex-1">{c}</p>
                                        </div>
                                        <div className="ml-6">
                                            <ElaborateButton {...elabProps(`ac-${i}`, c, 'acceptance criteria', 'bg-emerald-100 border-emerald-200 text-emerald-700', 'bg-emerald-50 border-emerald-200 text-emerald-800')} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.success_criteria.quality_metrics && data.success_criteria.quality_metrics.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Quality Metrics</p>
                            <div className="flex flex-wrap gap-2">
                                {data.success_criteria.quality_metrics.map((m: string, i: number) => (
                                    <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200">
                                        {m}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Constraints ──────────────────────────────────────────────────── */}
            {hasContent(data.custom_fields?.constraints) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                        <div className="w-7 h-7 bg-orange-50 border border-orange-100 rounded-lg flex items-center justify-center">
                            <Shield size={13} className="text-orange-500" />
                        </div>
                        Constraints
                    </h3>

                    {data.custom_fields.constraints.technical && data.custom_fields.constraints.technical.length > 0 && (
                        <div className="mb-4">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Technical</p>
                            <div className="space-y-2">
                                {data.custom_fields.constraints.technical.map((c: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2.5 p-3 bg-orange-50/60 border border-orange-100 rounded-xl">
                                        <AlertCircle size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-700 leading-snug">{c}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.custom_fields.constraints.business && data.custom_fields.constraints.business.length > 0 && (
                        <div className="mb-4">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Business</p>
                            <div className="space-y-2">
                                {data.custom_fields.constraints.business.map((c: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2.5 p-3 bg-orange-50/60 border border-orange-100 rounded-xl">
                                        <AlertCircle size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-700 leading-snug">{c}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.custom_fields.constraints.regulatory && data.custom_fields.constraints.regulatory.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Regulatory</p>
                            <div className="space-y-2">
                                {data.custom_fields.constraints.regulatory.map((c: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2.5 p-3 bg-orange-50/60 border border-orange-100 rounded-xl">
                                        <AlertCircle size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-700 leading-snug">{c}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Project Assumptions ──────────────────────────────────────────── */}
            {hasContent(data.custom_fields?.assumptions) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
                            <Lightbulb size={13} className="text-blue-600" />
                        </div>
                        Project Assumptions
                    </h3>
                    <div className="space-y-2">
                        {data.custom_fields.assumptions.map((assumption: string, i: number) => (
                            <div key={i} className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm text-slate-700 leading-snug flex-1">{assumption}</p>
                                </div>
                                <div className="ml-8">
                                    <ElaborateButton {...elabProps(`assumption-${i}`, assumption, 'project assumption', 'bg-blue-100 border-blue-200 text-blue-700', 'bg-blue-50 border-blue-200 text-blue-800')} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Detailed Requirements ────────────────────────────────────────── */}
            {hasContent(data.custom_fields?.requirements) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center">
                            <FileText size={13} className="text-indigo-600" />
                        </div>
                        Detailed Requirements
                    </h3>
                    <div className="space-y-3">
                        {data.custom_fields.requirements.map((req: string, i: number) => (
                            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm text-slate-800 leading-relaxed flex-1 font-medium">{req}</p>
                                </div>
                                <div className="ml-9 mt-1">
                                    <ElaborateButton {...elabProps(`req-${i}`, req, 'project requirement', 'bg-indigo-100 border-indigo-200 text-indigo-700', 'bg-indigo-50 border-indigo-200 text-indigo-800')} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Additional custom fields ─────────────────────────────────────── */}
            {data.custom_fields && Object.keys(data.custom_fields).some(
                key => !['constraints', 'assumptions', 'requirements'].includes(key) && hasContent(data.custom_fields[key])
            ) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Additional Information</h3>
                    <div className="space-y-3">
                        {Object.entries(data.custom_fields)
                            .filter(([key, value]) => !['constraints', 'assumptions', 'requirements'].includes(key) && hasContent(value))
                            .map(([key, value]: [string, any]) => (
                                <div key={key} className="border-b border-slate-100 pb-3 last:border-0">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        {key.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-sm text-slate-700">
                                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                    </p>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
