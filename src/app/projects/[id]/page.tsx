"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  PlusCircle,
  ChevronLeft,
  MoreVertical,
  Edit3,
  Download,
  Share2,
  Clock,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  Flag,
  MessageSquare,
  BarChart3,
  Settings,
  Filter,
  Search,
} from "lucide-react";

const project = {
  name: "Project Alpha",
  client: "ABC Corp",
  deadline: "2025-11-01",
  startDate: "2025-09-01",
  budget: "$50,000",
  spent: "$32,500",
  progress: 75,
  status: "On Track",
  description:
    "Development of a comprehensive AI-powered project management platform with real-time analytics and predictive insights.",
  clientContact: "Jane Smith - jane@abccorp.com",
};

const tasks = [
  {
    id: 1,
    title: "Requirement Gathering",
    assignee: { name: "John", avatar: "J" },
    due: "2025-10-10",
    status: "Completed",
    priority: "High",
    estimatedHours: 40,
    actualHours: 38,
    description:
      "Collect and document all project requirements from stakeholders",
  },
  {
    id: 2,
    title: "UI Design",
    assignee: { name: "Sarah", avatar: "S" },
    due: "2025-10-15",
    status: "In Progress",
    priority: "Medium",
    estimatedHours: 60,
    actualHours: 45,
    description: "Create wireframes and high-fidelity mockups for all screens",
  },
  {
    id: 3,
    title: "Backend Setup",
    assignee: { name: "Michael", avatar: "M" },
    due: "2025-10-20",
    status: "Pending",
    priority: "High",
    estimatedHours: 80,
    actualHours: 0,
    description: "Set up database schema and API endpoints",
  },
];

const resources = [
  {
    name: "John",
    skill: "Frontend",
    load: "80%",
    avatar: "J",
    projects: 3,
    capacity: "40h/week",
  },
  {
    name: "Sarah",
    skill: "UI/UX",
    load: "60%",
    avatar: "S",
    projects: 2,
    capacity: "35h/week",
  },
  {
    name: "Michael",
    skill: "Backend",
    load: "100%",
    avatar: "M",
    projects: 4,
    capacity: "40h/week",
  },
];

const insights = [
  {
    message: "Backend developer is overloaded across multiple projects.",
    severity: "High",
    type: "resource",
    suggestion:
      "Consider redistributing tasks or bringing in additional backend support.",
    timestamp: "2 hours ago",
  },
  {
    message: "Design phase is progressing 25% faster than estimated.",
    severity: "Low",
    type: "progress",
    suggestion:
      "Great work! The team is ahead of schedule on design deliverables.",
    timestamp: "5 hours ago",
  },
  {
    message: "Budget utilization is tracking 5% below projections.",
    severity: "Low",
    type: "budget",
    suggestion:
      "Current spending is efficient. Consider reallocating saved budget.",
    timestamp: "1 day ago",
  },
];

const milestones = [
  { name: "Planning Complete", date: "2025-09-15", status: "completed" },
  { name: "Design Approval", date: "2025-10-20", status: "upcoming" },
  { name: "Development Complete", date: "2025-11-15", status: "upcoming" },
  { name: "Testing & QA", date: "2025-11-25", status: "upcoming" },
  { name: "Project Delivery", date: "2025-12-01", status: "upcoming" },
];

export default function ProjectDetail() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTask, setSelectedTask] = useState<(typeof tasks)[0] | null>(
    null
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Completed":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "In Progress":
        return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "Pending":
        return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case "High":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      case "Medium":
        return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      case "Low":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "High":
        return "text-red-400";
      case "Medium":
        return "text-orange-400";
      case "Low":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="pt-24 px-6 min-h-screen bg-[var(--color-primary)] text-white">
      {/* Header with Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {project.name}
            </h1>
            <p className="text-gray-400">Client: {project.client}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
          >
            <Share2 size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
          >
            <Download size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
          >
            <Edit3 size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusCircle size={20} />
            Add Task
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-1 bg-white/5 rounded-2xl p-1 mb-8 w-fit border border-white/10"
      >
        {[
          "overview",
          "tasks",
          "resources",
          "timeline",
          "documents",
          "settings",
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl capitalize transition-all duration-200 ${
              activeTab === tab
                ? "bg-[var(--color-accent)] text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab}
          </button>
        ))}
      </motion.div>

      {/* Project Overview Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {[
          {
            icon: Calendar,
            label: "Timeline",
            value: `${project.startDate} - ${project.deadline}`,
          },
          {
            icon: DollarSign,
            label: "Budget",
            value: `${project.spent} / ${project.budget}`,
          },
          {
            icon: Users,
            label: "Team Size",
            value: `${resources.length} members`,
          },
          {
            icon: BarChart3,
            label: "Progress",
            value: `${project.progress}% Complete`,
          },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-[var(--color-surface)] p-6 rounded-2xl border border-white/10 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[var(--color-accent)]/20 rounded-xl">
                <item.icon className="text-[var(--color-accent)]" size={24} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Progress Section */}
          <motion.div className="bg-[var(--color-surface)] rounded-2xl border border-white/10 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Project Progress</h2>
              <span className="text-2xl font-bold text-[var(--color-accent)]">
                {project.progress}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${project.progress}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-4 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-blue-600"
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-400">3</p>
                <p className="text-gray-400 text-sm">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">5</p>
                <p className="text-gray-400 text-sm">In Progress</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">2</p>
                <p className="text-gray-400 text-sm">Pending</p>
              </div>
            </div>
          </motion.div>

          {/* Tasks Section */}
          <motion.div className="bg-[var(--color-surface)] rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold">Tasks</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--color-accent)] transition-colors text-sm"
                  />
                </div>
                <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                  <Filter size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-white/10">
                    <th className="p-4 font-medium">Task</th>
                    <th className="p-4 font-medium">Assignee</th>
                    <th className="p-4 font-medium">Due Date</th>
                    <th className="p-4 font-medium">Priority</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, idx) => (
                    <motion.tr
                      key={task.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTask(task)}
                    >
                      <td className="p-4">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-gray-400 line-clamp-1">
                          {task.description}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {task.assignee.avatar}
                          </div>
                          <span>{task.assignee.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">{task.due}</div>
                      </td>
                      <td className="p-4">
                        <div
                          className={`flex items-center gap-1 text-sm ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          <Flag size={14} />
                          {task.priority}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            task.status
                          )} border`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-lg">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resources */}
          <motion.div className="bg-[var(--color-surface)] rounded-2xl border border-white/10 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-4">Team Resources</h3>
            <div className="space-y-4">
              {resources.map((resource, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-[var(--color-accent)] to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {resource.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{resource.name}</p>
                      <p className="text-gray-400 text-xs">{resource.skill}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{resource.load}</div>
                    <div className="text-gray-400 text-xs">Load</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Insights */}
          <motion.div className="bg-[var(--color-surface)] rounded-2xl border border-white/10 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-[var(--color-accent)]" size={20} />
              <h3 className="text-lg font-semibold">AI Insights</h3>
            </div>
            <div className="space-y-4">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${getSeverityColor(
                    insight.severity
                  )}`}
                >
                  <p className="text-gray-200 text-sm mb-2">
                    {insight.message}
                  </p>
                  <p className="text-gray-400 text-xs mb-2">
                    {insight.suggestion}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{insight.timestamp}</span>
                    <span
                      className={`px-2 py-1 rounded-full ${getSeverityColor(
                        insight.severity
                      )}`}
                    >
                      {insight.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Milestones */}
          <motion.div className="bg-[var(--color-surface)] rounded-2xl border border-white/10 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-4">Project Milestones</h3>
            <div className="space-y-3">
              {milestones.map((milestone, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      milestone.status === "completed"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {milestone.status === "completed" ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{milestone.name}</p>
                    <p className="text-gray-400 text-xs">{milestone.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
