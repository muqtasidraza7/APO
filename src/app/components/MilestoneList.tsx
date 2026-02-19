/**
 * Interactive Milestone Component
 * Displays milestones with status tracking and completion functionality
 */

"use client";

import React, { useState } from 'react';
import {
    Target,
    CheckCircle2,
    Circle,
    Clock,
    AlertCircle,
    Calendar,
    TrendingUp,
} from 'lucide-react';

interface Milestone {
    id?: string;
    title: string;
    deliverable: string;
    success_criteria?: string;
    week?: number;
    week_number?: number;
    due_date?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
    completion_percentage?: number;
}

interface MilestoneListProps {
    milestones: Milestone[];
    projectId: string;
    onMilestoneUpdate?: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>;
    editable?: boolean;
}

export default function MilestoneList({
    milestones,
    projectId,
    onMilestoneUpdate,
    editable = true
}: MilestoneListProps) {
    const [localMilestones, setLocalMilestones] = useState<Milestone[]>(
        milestones.map((m, idx) => ({
            ...m,
            id: m.id || `temp-${idx}`,
            status: m.status || 'pending',
            completion_percentage: m.completion_percentage || 0,
        }))
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 size={20} className="text-green-600" />;
            case 'in_progress':
                return <Clock size={20} className="text-blue-600" />;
            case 'blocked':
                return <AlertCircle size={20} className="text-red-600" />;
            default:
                return <Circle size={20} className="text-slate-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-50 border-green-200';
            case 'in_progress':
                return 'bg-blue-50 border-blue-200';
            case 'blocked':
                return 'bg-red-50 border-red-200';
            default:
                return 'bg-slate-50 border-slate-200';
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            completed: 'bg-green-100 text-green-700 border-green-300',
            in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
            blocked: 'bg-red-100 text-red-700 border-red-300',
            pending: 'bg-slate-100 text-slate-700 border-slate-300',
        };
        return badges[status as keyof typeof badges] || badges.pending;
    };

    const handleStatusChange = async (milestoneId: string, newStatus: string) => {
        const milestone = localMilestones.find(m => m.id === milestoneId);
        if (!milestone) return;

        const updates: Partial<Milestone> = {
            status: newStatus as any,
            completion_percentage: newStatus === 'completed' ? 100 :
                newStatus === 'in_progress' ? 50 : 0,
        };

        // Optimistic update
        setLocalMilestones(prev =>
            prev.map(m => m.id === milestoneId ? { ...m, ...updates } : m)
        );

        // Call API if handler provided
        if (onMilestoneUpdate) {
            try {
                await onMilestoneUpdate(milestoneId, updates);
            } catch (error) {
                console.error('Failed to update milestone:', error);
                // Revert on error
                setLocalMilestones(prev =>
                    prev.map(m => m.id === milestoneId ? milestone : m)
                );
            }
        }
    };

    const toggleComplete = (milestoneId: string) => {
        const milestone = localMilestones.find(m => m.id === milestoneId);
        if (!milestone) return;

        const newStatus = milestone.status === 'completed' ? 'pending' : 'completed';
        handleStatusChange(milestoneId, newStatus);
    };

    // Calculate overall progress
    const totalMilestones = localMilestones.length;
    const completedCount = localMilestones.filter(m => m.status === 'completed').length;
    const inProgressCount = localMilestones.filter(m => m.status === 'in_progress').length;
    const overallProgress = totalMilestones > 0
        ? Math.round((completedCount / totalMilestones) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Progress Overview */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-600" />
                        Milestone Progress
                    </h3>
                    <span className="text-2xl font-bold text-indigo-700">{overallProgress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white rounded-full h-3 mb-4 overflow-hidden border border-indigo-200">
                    <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500 ease-out"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-white/50 rounded-lg p-2 border border-indigo-100">
                        <div className="text-2xl font-bold text-slate-900">{totalMilestones}</div>
                        <div className="text-xs text-slate-600">Total</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                        <div className="text-2xl font-bold text-green-700">{completedCount}</div>
                        <div className="text-xs text-green-600">Completed</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                        <div className="text-2xl font-bold text-blue-700">{inProgressCount}</div>
                        <div className="text-xs text-blue-600">In Progress</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <div className="text-2xl font-bold text-slate-700">{totalMilestones - completedCount - inProgressCount}</div>
                        <div className="text-xs text-slate-600">Pending</div>
                    </div>
                </div>
            </div>

            {/* Milestone List */}
            <div className="space-y-4">
                {localMilestones.map((milestone, index) => (
                    <div
                        key={milestone.id}
                        className={`border rounded-2xl p-5 transition-all duration-200 ${getStatusColor(milestone.status || 'pending')}`}
                    >
                        <div className="flex items-start gap-4">
                            {/* Checkbox */}
                            {editable && (
                                <button
                                    onClick={() => toggleComplete(milestone.id!)}
                                    className="mt-1 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg"
                                    aria-label={`Mark milestone ${index + 1} as ${milestone.status === 'completed' ? 'incomplete' : 'complete'}`}
                                >
                                    {milestone.status === 'completed' ? (
                                        <CheckCircle2 size={24} className="text-green-600 hover:text-green-700 transition-colors" />
                                    ) : (
                                        <Circle size={24} className="text-slate-400 hover:text-indigo-500 transition-colors" />
                                    )}
                                </button>
                            )}

                            {/* Week Badge */}
                            <div className="flex-shrink-0 w-14 h-14 bg-white rounded-xl flex items-center justify-center border-2 border-indigo-200 shadow-sm">
                                <div className="text-center">
                                    <div className="text-xs text-slate-500 font-medium">Week</div>
                                    <div className="text-lg font-bold text-indigo-700">
                                        {milestone.week || milestone.week_number || index + 1}
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className={`font-bold text-lg ${milestone.status === 'completed'
                                            ? 'text-slate-500 line-through'
                                            : 'text-slate-900'
                                        }`}>
                                        {milestone.title}
                                    </h3>

                                    {/* Status Badge */}
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusBadge(milestone.status || 'pending')} flex-shrink-0`}>
                                        {milestone.status || 'pending'}
                                    </span>
                                </div>

                                <p className="text-slate-600 text-sm mb-3">{milestone.deliverable}</p>

                                {/* Success Criteria */}
                                {milestone.success_criteria && (
                                    <div className="bg-white/70 rounded-lg p-3 border border-green-200 mb-3">
                                        <p className="text-sm text-green-800 flex items-start gap-2">
                                            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-green-600" />
                                            <span>
                                                <strong className="text-green-900">Success Criteria:</strong>{' '}
                                                {milestone.success_criteria}
                                            </span>
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                {editable && milestone.status !== 'completed' && (
                                    <div className="flex gap-2 mt-3">
                                        {milestone.status !== 'in_progress' && (
                                            <button
                                                onClick={() => handleStatusChange(milestone.id!, 'in_progress')}
                                                className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors border border-blue-300"
                                            >
                                                Start Working
                                            </button>
                                        )}
                                        {milestone.status === 'in_progress' && (
                                            <button
                                                onClick={() => handleStatusChange(milestone.id!, 'completed')}
                                                className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors border border-green-300"
                                            >
                                                Mark Complete
                                            </button>
                                        )}
                                        {milestone.status !== 'blocked' && (
                                            <button
                                                onClick={() => handleStatusChange(milestone.id!, 'blocked')}
                                                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition-colors border border-red-300"
                                            >
                                                Mark Blocked
                                            </button>
                                        )}
                                        {milestone.status === 'blocked' && (
                                            <button
                                                onClick={() => handleStatusChange(milestone.id!, 'pending')}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors border border-slate-300"
                                            >
                                                Unblock
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Completion Message */}
                                {milestone.status === 'completed' && (
                                    <div className="mt-3 text-sm text-green-700 font-medium flex items-center gap-2">
                                        <CheckCircle2 size={16} />
                                        Milestone completed!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
