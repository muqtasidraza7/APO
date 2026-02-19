/**
 * Team Dashboard Page
 * People-centric dashboard showing team capacity, workload, and task assignments
 */

"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from "../../../utils/supabase/client";
import {
  Users,
  UserPlus,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';
import TeamMemberCard from "../../../components/TeamMemberCard";
import CapacityGauge from "../../../components/CapacityGauge";

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
  workload?: any;
  active_tasks?: any[];
  completed_this_month?: number;
}

export default function TeamDashboardPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const supabase = createClient();

  // Fetch team members
  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);

      // Get current user's workspace
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user found");
        setTeamMembers([]);
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .single();

      if (membershipError || !membership) {
        console.error("No workspace membership found:", membershipError);
        setTeamMembers([]);
        return;
      }

      console.log("Fetching team members for workspace:", membership.workspace_id);

      // Fetch team members (simplified - no view join)
      const { data: members, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("workspace_id", membership.workspace_id);

      if (error) {
        console.error("Error fetching team members:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        // If table doesn't exist, show empty state
        if (error.message && error.message.includes('does not exist')) {
          console.warn("Team members table not found. Please run database migrations.");
        }
        setTeamMembers([]);
        return;
      }

      console.log("Found team members:", members?.length || 0);

      // If no members, just set empty array
      if (!members || members.length === 0) {
        console.log("No team members found in database");
        setTeamMembers([]);
        return;
      }

      // Map members with basic data
      const membersWithDetails = members.map((member) => ({
        ...member,
        full_name: member.job_title || 'Team Member',
        email: '',
        workload: {
          total_tasks: 0,
          active_tasks: 0,
          completed_tasks: 0,
          estimated_hours_remaining: 0,
          total_hours_logged: 0,
          utilization_percentage: 0,
        },
        active_tasks: [],
        completed_this_month: 0,
      }));

      console.log("Processed team members:", membersWithDetails);
      setTeamMembers(membersWithDetails);
    } catch (error) {
      console.error("Unexpected error:", error);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate team-wide metrics
  const calculateMetrics = () => {
    const totalMembers = teamMembers.length;
    const totalTasks = teamMembers.reduce((sum, m) => sum + (m.workload?.active_tasks || 0), 0);
    const totalCapacity = teamMembers.reduce((sum, m) => sum + m.capacity_hours_per_week, 0);
    const totalEstimated = teamMembers.reduce((sum, m) => sum + (m.workload?.estimated_hours_remaining || 0), 0);
    const availableHours = totalCapacity - totalEstimated;
    const utilizationPercentage = totalCapacity > 0 ? (totalEstimated / totalCapacity) * 100 : 0;

    const overloadedCount = teamMembers.filter(m => (m.workload?.utilization_percentage || 0) >= 90).length;
    const balancedCount = teamMembers.filter(m => {
      const util = m.workload?.utilization_percentage || 0;
      return util >= 50 && util < 90;
    }).length;
    const underutilizedCount = teamMembers.filter(m => (m.workload?.utilization_percentage || 0) < 50).length;

    return {
      totalMembers,
      totalTasks,
      availableHours: Math.max(0, availableHours),
      utilizationPercentage,
      overloadedCount,
      balancedCount,
      underutilizedCount,
    };
  };

  const metrics = calculateMetrics();

  // Filter members
  const filteredMembers = teamMembers.filter(member => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'online') return member.status === 'online' || member.status === 'busy';
    if (filterStatus === 'overloaded') return (member.workload?.utilization_percentage || 0) >= 90;
    if (filterStatus === 'available') return (member.workload?.utilization_percentage || 0) < 50;
    return true;
  });

  const handleAssignTask = (memberId: string) => {
    // TODO: Open task assignment modal
    console.log('Assign task to:', memberId);
  };

  const handleMessage = (memberId: string) => {
    // TODO: Open messaging interface
    console.log('Message member:', memberId);
  };

  const handleViewDetails = (memberId: string) => {
    // TODO: Navigate to member details page
    console.log('View details for:', memberId);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw size={40} className="animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading team dashboard...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (teamMembers.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users size={40} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">No Team Members Yet</h2>
          <p className="text-slate-600 mb-4 max-w-md mx-auto">
            Start building your team by inviting members. They'll appear here with their workload and task assignments.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto mb-8">
            <p className="text-sm text-blue-800 font-medium mb-2">
              📋 First time here? Run the database migrations first:
            </p>
            <ol className="text-sm text-blue-700 text-left space-y-1 max-w-xl mx-auto">
              <li>1. Open Supabase Dashboard → SQL Editor</li>
              <li>2. Run migrations: <code className="bg-blue-100 px-2 py-0.5 rounded">006_create_team_members.sql</code></li>
              <li>3. Then run: <code className="bg-blue-100 px-2 py-0.5 rounded">007_create_task_assignments.sql</code></li>
              <li>4. Finally run: <code className="bg-blue-100 px-2 py-0.5 rounded">008_create_team_activity_skills.sql</code></li>
            </ol>
            <p className="text-xs text-blue-600 mt-3">
              See <code>database/migrations/TEAM_DASHBOARD_SETUP.md</code> for detailed instructions
            </p>
          </div>
          <button className="btn btn-primary">
            <UserPlus size={18} className="mr-2" />
            Invite Team Member
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">People Management</p>
          <h1 className="text-3xl font-bold text-slate-900">Team Dashboard</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTeamMembers}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
          <button className="btn btn-primary">
            <UserPlus size={18} className="mr-2" />
            Add Member
          </button>
        </div>
      </div>

      {/* Capacity Overview */}
      <CapacityGauge {...metrics} />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter size={18} className="text-slate-500" />
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All Members' },
            { value: 'online', label: 'Online' },
            { value: 'overloaded', label: 'Overloaded' },
            { value: 'available', label: 'Available' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === filter.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500 ml-auto">
          Showing {filteredMembers.length} of {teamMembers.length} members
        </span>
      </div>

      {/* Team Member Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            onAssignTask={handleAssignTask}
            onMessage={handleMessage}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No team members match the current filter.</p>
        </div>
      )}
    </div>
  );
}
