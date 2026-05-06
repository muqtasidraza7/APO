"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  Send, Hash, Users, User, Search, Loader2, 
  MessageSquare, Plus, ChevronRight, Globe, Inbox
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: {
    full_name: string;
    user_id: string;
  };
}

interface ChatContext {
  type: "workspace" | "project" | "dm";
  id: string;
  name: string;
}

export default function MessagesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<ChatContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 1. Get ALL workspaces user belongs to
      const { data: memberships } = await supabase
        .from("team_members")
        .select("workspace_id, workspaces(*)")
        .eq("user_id", user?.id);

      if (memberships && memberships.length > 0) {
        const member = memberships[0]; // Use the first workspace as default
        setWorkspace(member.workspaces);
        setActiveChat({ type: "workspace", id: member.workspace_id, name: "General Workspace" });

        // 2. Get Projects for this workspace
        const { data: projData } = await supabase
          .from("projects")
          .select("id, name")
          .eq("workspace_id", member.workspace_id);
        setProjects(projData || []);

        // 3. Get Team Members for this workspace
        const { data: teamData } = await supabase
          .from("team_members")
          .select("id, full_name, user_id")
          .eq("workspace_id", member.workspace_id)
          .neq("user_id", user?.id);
        setTeam(teamData || []);
      } else {
        console.log("No workspace memberships found for user", user?.id);
      }
      setLoading(false);
    };
    init();
  }, []);

  // 2. Fetch History when activeChat changes
  const fetchHistory = useCallback(async () => {
    if (!activeChat || !workspace) return;
    
    let url = `/api/messages/history?workspaceId=${workspace.id}`;
    if (activeChat.type === "project") url += `&projectId=${activeChat.id}`;
    if (activeChat.type === "dm") url += `&receiverId=${activeChat.id}`;

    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) setMessages(data.messages);
  }, [activeChat, workspace]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 3. Real-time Subscription
  useEffect(() => {
    if (!workspace) return;

    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const msg = payload.new;
          // Only add if it belongs to current active chat
          const isRelevant = 
            (activeChat?.type === "workspace" && !msg.project_id && !msg.receiver_id) ||
            (activeChat?.type === "project" && msg.project_id === activeChat.id) ||
            (activeChat?.type === "dm" && (msg.sender_id === activeChat.id || msg.receiver_id === activeChat.id));

          if (isRelevant) {
            // Re-fetch or manually add with sender info
            fetchHistory(); 
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspace, activeChat, fetchHistory]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !activeChat || !workspace) return;

    setSending(true);
    const payload: any = {
      workspaceId: workspace.id,
      content: newMessage
    };
    if (activeChat.type === "project") payload.projectId = activeChat.id;
    if (activeChat.type === "dm") payload.receiverId = activeChat.id;

    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setNewMessage("");
    }
    setSending(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  );

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare className="text-indigo-500" size={20} /> Messages
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Search chats..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-6 pb-6">
          {/* Workspace Channel */}
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Workspace</p>
            <button 
              onClick={() => workspace && setActiveChat({ type: "workspace", id: workspace.id, name: "General Workspace" })}
              disabled={!workspace}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeChat?.type === "workspace" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-600 hover:bg-white"} ${!workspace ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Globe size={16} className={activeChat?.type === "workspace" ? "text-indigo-200" : "text-indigo-500"} />
              General Chat
            </button>
          </div>

          {/* Projects */}
          <div>
            <div className="px-3 flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projects</p>
              <Plus 
                size={14} 
                className="text-slate-400 cursor-pointer hover:text-indigo-500 transition-colors" 
                onClick={() => router.push("/dashboard/projects")}
              />
            </div>
            <div className="space-y-1">
              {projects.map(p => (
                <button 
                  key={p.id}
                  onClick={() => setActiveChat({ type: "project", id: p.id, name: p.name })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeChat?.id === p.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-600 hover:bg-white"}`}
                >
                  <Hash size={16} className={activeChat?.id === p.id ? "text-indigo-200" : "text-slate-400"} />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages */}
          <div>
            <div className="px-3 flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Direct Messages</p>
              <Plus 
                size={14} 
                className="text-slate-400 cursor-pointer hover:text-indigo-500 transition-colors" 
                title="Start new DM"
                onClick={() => alert("To start a DM, please add a team member in the 'Team' tab first.")}
              />
            </div>
            <div className="space-y-1">
              {team.map(member => (
                <button 
                  key={member.id}
                  onClick={() => setActiveChat({ type: "dm", id: member.user_id, name: member.full_name })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeChat?.id === member.user_id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-600 hover:bg-white"}`}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {member.full_name[0]}
                  </div>
                  <span className="truncate">{member.full_name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-20 border-b border-slate-100 flex items-center justify-between px-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  {activeChat.type === "project" ? <Hash size={20} /> : activeChat.type === "dm" ? <User size={20} /> : <Globe size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{activeChat.name}</h3>
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><Users size={20} /></button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><Inbox size={20} /></button>
              </div>
            </div>

            {/* Message List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={32} />
                  </div>
                  <p className="text-sm font-medium">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user?.id;
                  const prevMsg = messages[idx - 1];
                  const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${showAvatar ? (isMe ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-500 shadow-sm") : "invisible h-0"}`}>
                        {msg.sender.full_name[0]}
                      </div>
                      <div className={`max-w-[70%] space-y-1 ${isMe ? "items-end" : ""}`}>
                        {showAvatar && (
                          <div className={`flex items-center gap-2 text-[10px] font-bold text-slate-400 ${isMe ? "flex-row-reverse" : ""}`}>
                            <span>{msg.sender.full_name}</span>
                            <span>•</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                        <div className={`px-4 py-2.5 text-sm shadow-sm ${isMe ? "bg-indigo-600 text-white rounded-2xl rounded-tr-none" : "bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-none"}`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${activeChat.name}...`}
                  className="flex-1 bg-slate-100 border-none rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-indigo-100"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 bg-indigo-50 rounded-[40px] flex items-center justify-center mb-6 text-indigo-500">
              <MessageSquare size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Team Workspace</h2>
            <p className="text-slate-500 max-w-sm mx-auto mb-8">Select a channel or team member from the sidebar to start collaborating in real-time.</p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-left">
                <Hash size={20} className="text-indigo-500 mb-3" />
                <p className="text-xs font-bold text-slate-900 mb-1">Project Channels</p>
                <p className="text-[10px] text-slate-400">Keep discussions focused on specific project goals.</p>
              </div>
              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-left">
                <User size={20} className="text-violet-500 mb-3" />
                <p className="text-xs font-bold text-slate-900 mb-1">Direct Messages</p>
                <p className="text-[10px] text-slate-400">Private 1-on-1 chats for quick check-ins.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
