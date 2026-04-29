"use client";

import { useState, useEffect, useRef } from "react";
import { Search, FolderKanban, Users, Loader2, ArrowRight } from "lucide-react";
import { createClient } from "../utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ projects: any[], team: any[] }>({ projects: [], team: [] });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults({ projects: [], team: [] });
        return;
      }

      setLoading(true);
      const supabase = createClient();
      
      // We need workspace_id from the user session to scope the search
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Let's get the user's workspace
      const { data: profiles } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();
        
      const workspaceId = profiles?.workspace_id;

      let projectQuery = supabase.from("projects").select("id, name, status").ilike("name", `%${query}%`).limit(5);
      let teamQuery = supabase.from("team_members").select("id, full_name, job_title").ilike("full_name", `%${query}%`).limit(5);

      if (workspaceId) {
          projectQuery = projectQuery.eq("workspace_id", workspaceId);
          teamQuery = teamQuery.eq("workspace_id", workspaceId);
      }

      const [projectsRes, teamRes] = await Promise.all([projectQuery, teamQuery]);

      setResults({
        projects: projectsRes.data || [],
        team: teamRes.data || [],
      });
      setLoading(false);
    };

    const debounceTimer = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  const hasResults = results.projects.length > 0 || results.team.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md hidden md:block">
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search projects or team members..."
          className="bg-transparent border-none outline-none text-sm ml-2 w-full text-slate-700 placeholder:text-slate-400"
        />
        {loading && <Loader2 size={14} className="animate-spin text-slate-400" />}
      </div>

      {isOpen && query.trim() !== "" && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 transform origin-top animate-in fade-in slide-in-from-top-2 duration-200">
          
          {!loading && !hasResults && (
            <div className="p-6 text-center text-slate-500 text-sm">
              No results found for "{query}"
            </div>
          )}

          <div className="max-h-[400px] overflow-y-auto">
            {results.projects.length > 0 && (
              <div className="py-2">
                <div className="px-3 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderKanban size={12} /> Projects
                </div>
                {results.projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(`/dashboard/projects/${p.id}`)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                      <div className="text-xs text-slate-500 capitalize">{p.status || "Active"}</div>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {results.projects.length > 0 && results.team.length > 0 && <hr className="border-slate-100" />}

            {results.team.length > 0 && (
              <div className="py-2">
                <div className="px-3 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={12} /> Team Members
                </div>
                {results.team.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(`/dashboard/team`)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{t.full_name}</div>
                      <div className="text-xs text-slate-500">{t.job_title}</div>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
