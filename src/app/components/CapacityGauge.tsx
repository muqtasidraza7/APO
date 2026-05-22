"use client";

import React from 'react';
import { Users, TrendingUp, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';

interface CapacityGaugeProps {
    totalMembers: number;
    totalTasks: number;
    availableHours: number;
    utilizationPercentage: number;
    overloadedCount: number;
    balancedCount: number;
    underutilizedCount: number;
}

export default function CapacityGauge({
    totalMembers,
    totalTasks,
    availableHours,
    utilizationPercentage,
    overloadedCount,
    balancedCount,
    underutilizedCount,
}: CapacityGaugeProps) {
    const pct = Math.min(utilizationPercentage, 100);

    const getBarColor = (p: number) => {
        if (p >= 85) return 'bg-red-500';
        if (p >= 70) return 'bg-orange-400';
        if (p >= 50) return 'bg-emerald-500';
        return 'bg-sky-500';
    };

    const getStatusConfig = (p: number) => {
        if (p >= 85) return { label: 'High Utilization', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
        if (p >= 70) return { label: 'Optimal',          icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
        if (p >= 50) return { label: 'Balanced',         icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
        return             { label: 'Under-utilized',    icon: TrendingUp,    color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-200' };
    };

    const cfg = getStatusConfig(utilizationPercentage);
    const StatusIcon = cfg.icon;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Top row: utilization bar */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Activity size={16} className="text-violet-500" />
                        <span className="text-sm font-bold text-slate-700">Team Utilization</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-slate-900 tabular-nums leading-none">
                            {utilizationPercentage.toFixed(0)}%
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                            <StatusIcon size={11} />
                            {cfg.label}
                        </span>
                    </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${getBarColor(utilizationPercentage)}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            {/* Bottom row: stat chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100">
                {/* Members */}
                <div className="px-4 py-3 flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Users size={9} /> Members
                    </span>
                    <span className="text-xl font-black text-slate-900 tabular-nums">{totalMembers}</span>
                </div>

                {/* Tasks */}
                <div className="px-4 py-3 flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Active Tasks</span>
                    <span className="text-xl font-black text-slate-900 tabular-nums">{totalTasks}</span>
                </div>

                {/* Capacity free */}
                <div className="px-4 py-3 flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Capacity Free</span>
                    <span className="text-xl font-black text-slate-900 tabular-nums">{availableHours}h</span>
                </div>

                {/* Overloaded */}
                <div className="px-4 py-3 flex flex-col">
                    <span className="text-[10px] font-semibold text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <AlertTriangle size={9} /> Overloaded
                    </span>
                    <span className="text-xl font-black text-red-600 tabular-nums">{overloadedCount}</span>
                </div>

                {/* Balanced */}
                <div className="px-4 py-3 flex flex-col">
                    <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <CheckCircle2 size={9} /> Balanced
                    </span>
                    <span className="text-xl font-black text-emerald-600 tabular-nums">{balancedCount}</span>
                </div>

                {/* Available */}
                <div className="px-4 py-3 flex flex-col">
                    <span className="text-[10px] font-semibold text-sky-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <TrendingUp size={9} /> Available
                    </span>
                    <span className="text-xl font-black text-sky-600 tabular-nums">{underutilizedCount}</span>
                </div>
            </div>
        </div>
    );
}
