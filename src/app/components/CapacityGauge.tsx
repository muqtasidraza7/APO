

"use client";

import React from 'react';
import { Users, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
    const getUtilizationColor = (percentage: number) => {
        if (percentage >= 85) return 'from-red-500 to-orange-500';
        if (percentage >= 70) return 'from-orange-500 to-yellow-500';
        if (percentage >= 50) return 'from-green-500 to-emerald-500';
        return 'from-blue-500 to-indigo-500';
    };

    const getUtilizationStatus = (percentage: number) => {
        if (percentage >= 85) return { label: 'High Utilization', icon: AlertTriangle, color: 'text-red-600' };
        if (percentage >= 70) return { label: 'Optimal', icon: CheckCircle2, color: 'text-green-600' };
        return { label: 'Low Utilization', icon: TrendingUp, color: 'text-blue-600' };
    };

    const status = getUtilizationStatus(utilizationPercentage);
    const StatusIcon = status.icon;

    return (
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-2xl p-6 shadow-sm">
            
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users size={20} className="text-indigo-600" />
                    Team Capacity Dashboard
                </h2>
                <div className={`flex items-center gap-1 ${status.color} font-semibold text-sm`}>
                    <StatusIcon size={16} />
                    {status.label}
                </div>
            </div>

            <div className="mb-6">
                <div className="flex items-end justify-between mb-3">
                    <span className="text-sm font-medium text-slate-600">Team Utilization</span>
                    <span className="text-4xl font-bold text-indigo-700">
                        {utilizationPercentage.toFixed(0)}%
                    </span>
                </div>

                <div className="w-full bg-white rounded-full h-4 overflow-hidden border border-indigo-200 shadow-inner">
                    <div
                        className={`h-full bg-gradient-to-r ${getUtilizationColor(
                            utilizationPercentage
                        )} transition-all duration-700 ease-out`}
                        style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white/70 backdrop-blur rounded-xl p-3 border border-indigo-100">
                    <div className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                        <Users size={12} />
                        Members
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{totalMembers}</div>
                </div>

                <div className="bg-white/70 backdrop-blur rounded-xl p-3 border border-indigo-100">
                    <div className="text-xs text-slate-600 mb-1">Active Tasks</div>
                    <div className="text-2xl font-bold text-slate-900">{totalTasks}</div>
                </div>

                <div className="bg-white/70 backdrop-blur rounded-xl p-3 border border-indigo-100">
                    <div className="text-xs text-slate-600 mb-1">Available</div>
                    <div className="text-2xl font-bold text-slate-900">{availableHours}h</div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-2xl font-bold text-red-700">{overloadedCount}</div>
                            <div className="text-xs text-red-600 font-medium">Overloaded</div>
                        </div>
                        <AlertTriangle size={20} className="text-red-400" />
                    </div>
                </div>

                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-2xl font-bold text-green-700">{balancedCount}</div>
                            <div className="text-xs text-green-600 font-medium">Balanced</div>
                        </div>
                        <CheckCircle2 size={20} className="text-green-400" />
                    </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-2xl font-bold text-blue-700">{underutilizedCount}</div>
                            <div className="text-xs text-blue-600 font-medium">Available</div>
                        </div>
                        <TrendingUp size={20} className="text-blue-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}
