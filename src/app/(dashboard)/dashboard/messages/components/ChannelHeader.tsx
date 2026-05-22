"use client";

import { Globe, Hash, WifiOff, Search, X, RefreshCw, Users } from "lucide-react";
import { useState } from "react";
import type { ActiveChannel } from "../types";

export interface ChannelHeaderProps {
  channel: ActiveChannel;
  connectionError: boolean;
  searchQuery: string;
  memberCount?: number;
  onSearchChange: (q: string) => void;
  onReconnect: () => void;
}

export default function ChannelHeader({
  channel,
  connectionError,
  searchQuery,
  memberCount,
  onSearchChange,
  onReconnect,
}: ChannelHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const Icon = channel.type === "general" ? Globe : Hash;

  const closeSearch = () => {
    setSearchOpen(false);
    onSearchChange("");
  };

  return (
    <div className="flex-shrink-0 border-b border-slate-100 bg-white">
      <div className="flex items-center gap-3 px-5 py-3">
        {searchOpen ? (
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search messages…"
              className="flex-1 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
            <button
              onClick={closeSearch}
              className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors rounded"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  channel.type === "general"
                    ? "bg-emerald-100"
                    : "bg-violet-100"
                }`}
              >
                <Icon
                  size={16}
                  className={
                    channel.type === "general" ? "text-emerald-600" : "text-violet-600"
                  }
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-slate-800 truncate leading-tight">
                  {channel.name}
                </h1>
                {memberCount !== undefined && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Users size={9} />
                    {memberCount} member{memberCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {connectionError && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs mr-1">
                  <WifiOff size={11} />
                  <span className="font-medium">Reconnecting…</span>
                  <button
                    onClick={onReconnect}
                    className="ml-1 flex items-center gap-0.5 text-amber-600 hover:text-amber-800 font-semibold transition-colors"
                  >
                    <RefreshCw size={10} /> Retry
                  </button>
                </div>
              )}
              <button
                onClick={() => setSearchOpen(true)}
                title="Search messages"
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              >
                <Search size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
