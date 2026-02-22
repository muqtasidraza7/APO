"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileText,
  X,
  ArrowRight,
  Loader2,
  Sparkles,
  Info,
} from "lucide-react";
import { createProject } from "../actions";
import { createClient } from "../../../../utils/supabase/client";
import { useEffect } from "react";

export default function NewProjectPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchWorkspace = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .single();
        if (data) setWorkspaceId(data.workspace_id);
      }
    };
    fetchWorkspace();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      
      if (!projectName) {
        setProjectName(e.dataTransfer.files[0].name.split(".")[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !projectName || !workspaceId) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectName", projectName);
    formData.append("workspaceId", workspaceId);

    const result = await createProject(formData);
    if (result?.error) {
      alert(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="text-[var(--color-accent)]" size={24} />
          New AI Project
        </h1>
        <p className="text-slate-500 mt-2">
          Upload your project charter, RFP, or requirements document. Our AI
          will extract the details to set up your workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Website Redesign Q1"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all text-slate-900"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Upload Document
          </label>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 group ${
              isDragging
                ? "border-[var(--color-accent)] bg-indigo-50/50 scale-[1.01]"
                : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setFile(e.target.files[0]);
                  if (!projectName)
                    setProjectName(e.target.files[0].name.split(".")[0]);
                }
              }}
            />

            {!file ? (
              <>
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[var(--color-accent)] group-hover:scale-110 transition-all">
                  <UploadCloud size={32} />
                </div>
                <div>
                  <p className="text-slate-900 font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    PDF, DOCX or TXT (MAX. 10MB)
                  </p>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 w-full max-w-md relative"
              >
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <FileText size={24} />
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="font-semibold text-slate-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex gap-3 bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
          <Info size={18} className="shrink-0 mt-0.5" />
          <p>
            <strong>What happens next?</strong> Our AI will analyze this
            document to identify deliverables, milestones, and required skills.
            You will be able to review everything before the project goes live.
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <button
            disabled={!file || !projectName || isLoading}
            className="btn btn-primary px-8 py-3 text-base flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Uploading & Parsing...
              </>
            ) : (
              <>
                Start Analysis
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
