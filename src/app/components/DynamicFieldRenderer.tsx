

import React from 'react';
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
} from 'lucide-react';

interface DynamicFieldRendererProps {
    data: any;
    projectType?: string;
}

export default function DynamicFieldRenderer({ data, projectType }: DynamicFieldRendererProps) {
    if (!data) return null;

    return (
        <div className="space-y-6">
            
            {data.client_info && Object.keys(data.client_info).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Building2 size={20} className="text-[var(--color-accent)]" />
                        Client Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {data.client_info.name && (
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Company Name</p>
                                <p className="font-medium text-slate-900">{data.client_info.name}</p>
                            </div>
                        )}
                        {data.client_info.contact_person && (
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Contact Person</p>
                                <p className="font-medium text-slate-900">{data.client_info.contact_person}</p>
                            </div>
                        )}
                        {data.client_info.email && (
                            <div className="flex items-center gap-2">
                                <Mail size={16} className="text-slate-400" />
                                <a href={`mailto:${data.client_info.email}`} className="text-[var(--color-accent)] hover:underline">
                                    {data.client_info.email}
                                </a>
                            </div>
                        )}
                        {data.client_info.phone && (
                            <div className="flex items-center gap-2">
                                <Phone size={16} className="text-slate-400" />
                                <a href={`tel:${data.client_info.phone}`} className="text-slate-700">
                                    {data.client_info.phone}
                                </a>
                            </div>
                        )}
                    </div>

                    {data.client_info.stakeholders && data.client_info.stakeholders.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm text-slate-500 mb-2 flex items-center gap-1">
                                <Users size={14} />
                                Stakeholders
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {data.client_info.stakeholders.map((stakeholder: string, idx: number) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm border border-slate-200"
                                    >
                                        {stakeholder}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {data.success_criteria && Object.keys(data.success_criteria).length > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                        <Target size={20} className="text-green-600" />
                        Success Criteria
                    </h3>

                    {data.success_criteria.kpis && data.success_criteria.kpis.length > 0 && (
                        <div className="mb-4">
                            <p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                                <TrendingUp size={14} />
                                Key Performance Indicators
                            </p>
                            <ul className="space-y-2">
                                {data.success_criteria.kpis.map((kpi: string, idx: number) => (
                                    <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                                        <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                                        {kpi}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {data.success_criteria.acceptance_criteria && data.success_criteria.acceptance_criteria.length > 0 && (
                        <div className="mb-4">
                            <p className="text-sm font-semibold text-green-800 mb-2">Acceptance Criteria</p>
                            <ul className="space-y-2">
                                {data.success_criteria.acceptance_criteria.map((criteria: string, idx: number) => (
                                    <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                        {criteria}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {data.success_criteria.quality_metrics && data.success_criteria.quality_metrics.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-green-800 mb-2">Quality Metrics</p>
                            <div className="flex flex-wrap gap-2">
                                {data.success_criteria.quality_metrics.map((metric: string, idx: number) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm border border-green-200"
                                    >
                                        {metric}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {data.custom_fields?.constraints && Object.keys(data.custom_fields.constraints).length > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                        <Shield size={20} className="text-orange-600" />
                        Constraints
                    </h3>

                    {data.custom_fields.constraints.technical && data.custom_fields.constraints.technical.length > 0 && (
                        <div className="mb-4">
                            <p className="text-sm font-semibold text-orange-800 mb-2">Technical Constraints</p>
                            <ul className="space-y-2">
                                {data.custom_fields.constraints.technical.map((constraint: string, idx: number) => (
                                    <li key={idx} className="text-sm text-orange-700 flex items-start gap-2">
                                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                        {constraint}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {data.custom_fields.constraints.business && data.custom_fields.constraints.business.length > 0 && (
                        <div className="mb-4">
                            <p className="text-sm font-semibold text-orange-800 mb-2">Business Constraints</p>
                            <ul className="space-y-2">
                                {data.custom_fields.constraints.business.map((constraint: string, idx: number) => (
                                    <li key={idx} className="text-sm text-orange-700 flex items-start gap-2">
                                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                        {constraint}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {data.custom_fields.constraints.regulatory && data.custom_fields.constraints.regulatory.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-orange-800 mb-2">Regulatory Constraints</p>
                            <ul className="space-y-2">
                                {data.custom_fields.constraints.regulatory.map((constraint: string, idx: number) => (
                                    <li key={idx} className="text-sm text-orange-700 flex items-start gap-2">
                                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                        {constraint}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {data.custom_fields?.assumptions && data.custom_fields.assumptions.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <Lightbulb size={20} className="text-blue-600" />
                        Project Assumptions
                    </h3>
                    <ul className="space-y-2">
                        {data.custom_fields.assumptions.map((assumption: string, idx: number) => (
                            <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                {assumption}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {data.custom_fields?.requirements && data.custom_fields.requirements.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-[var(--color-accent)]" />
                        Detailed Requirements
                    </h3>
                    <div className="space-y-3">
                        {data.custom_fields.requirements.map((req: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="w-6 h-6 bg-[var(--color-accent)] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {idx + 1}
                                </div>
                                <p className="text-sm text-slate-700">{req}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.custom_fields && Object.keys(data.custom_fields).some(
                key => !['constraints', 'assumptions', 'requirements'].includes(key) && data.custom_fields[key]
            ) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Additional Information</h3>
                        <div className="space-y-3">
                            {Object.entries(data.custom_fields)
                                .filter(([key]) => !['constraints', 'assumptions', 'requirements'].includes(key))
                                .map(([key, value]: [string, any]) => (
                                    <div key={key} className="border-b border-slate-200 pb-3 last:border-0">
                                        <p className="text-sm font-semibold text-slate-700 mb-1 capitalize">
                                            {key.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-sm text-slate-600">
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
