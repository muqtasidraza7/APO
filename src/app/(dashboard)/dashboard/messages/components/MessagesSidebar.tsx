"use client";

import type { ReactNode } from "react";
import { Globe, Hash, MessageSquare } from "lucide-react";
import { truncateChannelName } from "../lib";
import type { ActiveChannel, WorkspaceProject } from "../types";

interface ChannelEntryProps {
  channel: ActiveChannel;
  isActive: boolean;
  hasUnread?: boolean;
  onSelect: (channel: ActiveChannel) => void;
}

function ChannelEntry({ channel, isActive, hasUnread, onSelect }: ChannelEntryProps) {
  const Icon = channel.type === "general" ? Globe : Hash;
  const displayName =
    channel.type === "project" ? truncateChannelName(channel.name) : channel.name;

  return (
    <button
      onClick={() => onSelect(channel)}
      title={channel.name}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all text-left group ${
        isActive
          ? "bg-violet-600/20 text-white font-semibold"
          : "text-slate-400 hover:bg-white/[0.06] hover:text-white font-normal"
      }`}
    >
      <Icon
        size={14}
        className={`flex-shrink-0 ${
          isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
        }`}
      />
      <span className="truncate flex-1">{displayName}</span>
      {hasUnread && !isActive && (
        <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
      )}
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-bold tracking-widest uppercase text-slate-500">
      {label}
    </p>
  );
}

export interface MessagesSidebarProps {
  workspaceId: string | null;
  projects: WorkspaceProject[];
  activeChannel: ActiveChannel | null;
  userRole: string;
  onSelectChannel: (channel: ActiveChannel) => void;
}

export default function MessagesSidebar({
  workspaceId,
  projects,
  activeChannel,
  userRole,
  onSelectChannel,
}: MessagesSidebarProps) {
  const isOwnerOrPM = userRole === "owner" || userRole === "pm";

  const sidebarShell = (children: ReactNode) => (
    <aside className="w-60 flex-shrink-0 bg-[#0D1117] flex flex-col border-r border-white/[0.06] overflow-y-auto">
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare size={14} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Messages</p>
            <p className="text-[10px] text-slate-500 capitalize">
              {isOwnerOrPM ? "All channels" : "Your channels"}
            </p>
          </div>
        </div>
      </div>
      {children}
    </aside>
  );

  // Show skeleton while workspace data is loading
  if (!workspaceId) {
    return sidebarShell(
      <div className="flex-1 px-4 py-4 flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 bg-white/[0.05] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const generalChannel: ActiveChannel = {
    type: "general",
    id: workspaceId,
    name: "General",
    workspaceId,
  };

  return sidebarShell(
    <nav className="flex-1 px-2 pb-4">
      <SectionLabel label="Workspace" />
      <ChannelEntry
        channel={generalChannel}
        isActive={activeChannel?.type === "general" && activeChannel.workspaceId === workspaceId}
        onSelect={onSelectChannel}
      />

      {projects.length > 0 && (
        <>
          <SectionLabel label="Projects" />
          <div className="space-y-0.5">
            {projects.map((project) => {
              const projectChannel: ActiveChannel = {
                type: "project",
                id: project.id,
                name: project.name,
                workspaceId,
              };
              return (
                <ChannelEntry
                  key={project.id}
                  channel={projectChannel}
                  isActive={
                    activeChannel?.type === "project" && activeChannel.id === project.id
                  }
                  onSelect={onSelectChannel}
                />
              );
            })}
          </div>
        </>
      )}

      {projects.length === 0 && !isOwnerOrPM && (
        <p className="px-3 pt-2 text-xs text-slate-600 leading-relaxed">
          You&apos;ll see project channels here once you&apos;re assigned to a project.
        </p>
      )}
    </nav>
  );
}
