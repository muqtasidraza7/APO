"use client";

import { Globe, Hash } from "lucide-react";
import { truncateChannelName } from "../lib";
import type { ActiveChannel, MessagesSidebarProps, WorkspaceProject } from "../types";

// ---------------------------------------------------------------------------
// ChannelEntry
// ---------------------------------------------------------------------------

interface ChannelEntryProps {
  channel: ActiveChannel;
  isActive: boolean;
  onSelect: (channel: ActiveChannel) => void;
}

function ChannelEntry({ channel, isActive, onSelect }: ChannelEntryProps) {
  const Icon = channel.type === "general" ? Globe : Hash;
  const displayName =
    channel.type === "project"
      ? truncateChannelName(channel.name)
      : channel.name;

  return (
    <button
      onClick={() => onSelect(channel)}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-left ${
        isActive
          ? "bg-indigo-600 text-white font-semibold"
          : "text-slate-300 hover:bg-slate-700 hover:text-white font-normal"
      }`}
      title={channel.name}
    >
      <Icon size={14} className="flex-shrink-0" />
      <span className="truncate">{displayName}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// SidebarSection
// ---------------------------------------------------------------------------

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
}

function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="mb-4">
      <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessagesSidebar
// ---------------------------------------------------------------------------

export interface MessagesSidebarProps {
  workspaceId: string | null;
  projects: WorkspaceProject[];
  activeChannel: ActiveChannel | null;
  onSelectChannel: (channel: ActiveChannel) => void;
}

export default function MessagesSidebar({
  workspaceId,
  projects,
  activeChannel,
  onSelectChannel,
}: MessagesSidebarProps) {
  const generalChannel: ActiveChannel = {
    type: "general",
    id: workspaceId ?? "",
    name: "General",
    workspaceId: workspaceId ?? "",
  };

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-800 flex flex-col py-4 overflow-y-auto">
      <div className="px-3 mb-4">
        <h2 className="text-white font-bold text-base">Messages</h2>
      </div>

      {/* Workspace section — General channel */}
      <SidebarSection title="Workspace">
        <ChannelEntry
          channel={generalChannel}
          isActive={
            activeChannel?.type === "general" &&
            activeChannel.workspaceId === workspaceId
          }
          onSelect={onSelectChannel}
        />
      </SidebarSection>

      {/* Projects section */}
      {projects.length > 0 && (
        <SidebarSection title="Projects">
          {projects.map((project) => {
            const projectChannel: ActiveChannel = {
              type: "project",
              id: project.id,
              name: project.name,
              workspaceId: workspaceId ?? "",
            };
            return (
              <ChannelEntry
                key={project.id}
                channel={projectChannel}
                isActive={
                  activeChannel?.type === "project" &&
                  activeChannel.id === project.id
                }
                onSelect={onSelectChannel}
              />
            );
          })}
        </SidebarSection>
      )}
    </aside>
  );
}
