"use client";

import { Globe, Hash, WifiOff, Search, X, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { ActiveChannel } from "../types";

export interface ChannelHeaderProps {
  channel: ActiveChannel;
  connectionError: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onReconnect: () => void;
}

export default function ChannelHeader({
  channel,
  connectionError,
  searchQuery,
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
    <div className="flex-shrink-0 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        {searchOpen ? (
          <div className="flex-1 flex items-center gap-2">
            <Search size={15} className="text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search messages…"
              className="flex-1 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
            />
            <button onClick={closeSearch} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={15} />
            </button>
          </div>
        ) : (
          <>
            <Icon size={18} className="text-slate-500 flex-shrink-0" />
            <h1 className="text-base font-semibold text-slate-800 truncate flex-1">{channel.name}</h1>
            <button
              onClick={() => setSearchOpen(true)}
              title="Search messages"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Search size={15} />
            </button>
          </>
        )}
      </div>

      {connectionError && (
        <div role="alert" className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          <WifiOff size={14} className="flex-shrink-0" />
          <span className="flex-1">Connection lost — reconnecting…</span>
          <button
            onClick={onReconnect}
            className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
          >
            <RefreshCw size={11} /> Retry now
          </button>
        </div>
      )}
    </div>
  );
}
