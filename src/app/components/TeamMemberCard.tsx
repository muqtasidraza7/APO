

"use client";

import React from 'react';
import {
    User,
    Circle,
    CheckCircle2,
    Clock,
    AlertCircle,
    MessageSquare,
    UserPlus,
    TrendingUp,
    Trash2,
} from 'lucide-react';

interface Task {
    id: string;
    title: string;
    status: string;
    completion_percentage?: number;
    priority?: string;
}

interface TeamMember {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    job_title?: string;
    avatar_url?: string;
    status: 'online' | 'away' | 'offline' | 'busy';
    skills: string[];
    capacity_hours_per_week: number;
    workload?: {
        total_tasks: number;
        active_tasks: number;
        completed_tasks: number;
        estimated_hours_remaining: number;
        total_hours_logged: number;
        utilization_percentage: number;
    };
    active_tasks?: Task[];
    completed_this_month?: number;
}

interface TeamMemberCardProps {
    member: TeamMember;
    onAssignTask?: (memberId: string) => void;
    onMessage?: (memberId: string) => void;
    onViewDetails?: (memberId: string) => void;
}

export default function TeamMemberCard({
    member,
    onAssignTask,
    onMessage,
    onViewDetails,
}: TeamMemberCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online':
                return 'bg-green-500';
            case 'busy':
                return 'bg-red-500';
            case 'away':
                return 'bg-yellow-500';
            default:
                return 'bg-slate-400';
        }
    };

    const getStatusLabel = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const getUtilizationColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 75) return 'bg-orange-500';
        if (percentage >= 50) return 'bg-green-500';
        return 'bg-blue-500';
    };

    const getUtilizationStatus = (percentage: number) => {
        if (percentage >= 90) return { label: 'Overloaded', color: 'text-red-700 bg-red-50' };
        if (percentage >= 75) return { label: 'High Load', color: 'text-orange-700 bg-orange-50' };
        if (percentage >= 50) return { label: 'Balanced', color: 'text-green-700 bg-green-50' };
        return { label: 'Available', color: 'text-blue-700 bg-blue-50' };
    };

    const workload = member.workload || {
        total_tasks: 0,
        active_tasks: 0,
        completed_tasks: 0,
        estimated_hours_remaining: 0,
        total_hours_logged: 0,
        utilization_percentage: 0,
    };

    const utilizationStatus = getUtilizationStatus(workload.utilization_percentage);

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200">
            
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                    
                    <div className="relative">
                        {member.avatar_url ? (
                            <img
                                src={member.avatar_url}
                                alt={member.full_name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-slate-200">
                                <User size={24} className="text-indigo-600" />
                            </div>
                        )}
                        
                        <div
                            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(
                                member.status
                            )}`}
                            title={getStatusLabel(member.status)}
                        />
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">{member.full_name}</h3>
                        {member.job_title && (
                            <p className="text-sm text-slate-500">{member.job_title}</p>
                        )}
                    </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold ${utilizationStatus.color}`}>
                    {utilizationStatus.label}
                </span>
            </div>

            <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600 font-medium">Workload</span>
                    <span className="font-bold text-slate-900">
                        {workload.utilization_percentage.toFixed(0)}%{' '}
                        <span className="text-slate-500 font-normal">
                            ({workload.estimated_hours_remaining}h / {member.capacity_hours_per_week}h)
                        </span>
                    </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${getUtilizationColor(
                            workload.utilization_percentage
                        )}`}
                        style={{ width: `${Math.min(workload.utilization_percentage, 100)}%` }}
                    />
                </div>
            </div>

            {member.active_tasks && member.active_tasks.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <Clock size={14} />
                        Active Tasks ({member.active_tasks.length})
                    </h4>
                    <div className="space-y-2">
                        {member.active_tasks.slice(0, 3).map((task) => (
                            <div
                                key={task.id}
                                className="bg-slate-50 rounded-lg p-2 border border-slate-100"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-slate-800 truncate flex-1">
                                        {task.title}
                                    </span>
                                    {task.priority === 'high' && (
                                        <AlertCircle size={14} className="text-red-500 flex-shrink-0 ml-2" />
                                    )}
                                </div>
                                {task.completion_percentage !== undefined && (
                                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                                        <div
                                            className="bg-indigo-500 h-full rounded-full transition-all"
                                            style={{ width: `${task.completion_percentage}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                        {member.active_tasks.length > 3 && (
                            <button
                                onClick={() => onViewDetails?.(member.id)}
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                +{member.active_tasks.length - 3} more tasks
                            </button>
                        )}
                    </div>
                </div>
            )}

            {member.skills && member.skills.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {member.skills.slice(0, 5).map((skill, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100"
                            >
                                {skill}
                            </span>
                        ))}
                        {member.skills.length > 5 && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                +{member.skills.length - 5}
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-4 pt-4 border-t border-slate-100">
                <div className="text-center">
                    <div className="text-lg font-bold text-slate-900">{workload.active_tasks}</div>
                    <div className="text-xs text-slate-500">Active</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{workload.completed_tasks}</div>
                    <div className="text-xs text-slate-500">Done</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-indigo-600">
                        {member.completed_this_month || 0}
                    </div>
                    <div className="text-xs text-slate-500">This Month</div>
                </div>
            </div>

            <div className="flex gap-2">
                {workload.utilization_percentage >= 100 ? (
                    <button
                        onClick={() => onAssignTask?.(member.id)}
                        className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                    >
                        <Trash2 size={15} />
                        At Capacity — Manage Tasks
                    </button>
                ) : (
                    <button
                        onClick={() => onAssignTask?.(member.id)}
                        className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                    >
                        <UserPlus size={16} />
                        Assign Task
                    </button>
                )}
                <button
                    onClick={() => onMessage?.(member.id)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    title="Message"
                >
                    <MessageSquare size={16} />
                </button>
                <button
                    onClick={() => onViewDetails?.(member.id)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    title="View Details"
                >
                    <TrendingUp size={16} />
                </button>
            </div>
        </div>
    );
}
