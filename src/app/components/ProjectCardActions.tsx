"use client";

import { useState, useEffect } from "react";
import { Trash2, X, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteProject } from "../(dashboard)/dashboard/projects/actions";
import { createPortal } from "react-dom";

interface ProjectCardActionsProps {
  projectId: string;
  projectName: string;
  isAdmin: boolean;
}

export default function ProjectCardActions({ projectId, projectName, isAdmin }: ProjectCardActionsProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = async () => {
    if (confirmText !== projectName) return;
    setError("");
    setIsDeleting(true);
    try {
      const result = await deleteProject(projectId);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsDeleteModalOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmText("");
    setError("");
    setIsDeleteModalOpen(true);
  };

  if (!isAdmin) return null;

  return (
    <>
      <button
        onClick={openModal}
        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="Delete project"
      >
        <Trash2 size={15} />
      </button>

      {isDeleteModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Delete Project?</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                You are about to permanently delete{" "}
                <span className="font-bold text-slate-900">"{projectName}"</span>. This action cannot be undone.
              </p>

              <div className="space-y-2 mb-8">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Type the project name to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={projectName}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs mb-6">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== projectName || isDeleting}
                  className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
