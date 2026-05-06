"use client";

import { useState, useTransition } from "react";
import { Trash2, X, AlertTriangle, Loader2 } from "lucide-react";
import { deleteProject } from "../(dashboard)/dashboard/projects/actions";
import { useRouter } from "next/navigation";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
}

export default function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (confirmText !== projectName) return;
    setError("");
    startTransition(async () => {
      const result = await deleteProject(projectId);
      if (result?.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.push("/dashboard/projects");
        router.refresh();
      }
    });
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent the Link navigation on the card
    e.stopPropagation();
    setConfirmText("");
    setError("");
    setIsOpen(true);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all p-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 rounded-lg z-10"
        title="Delete Project"
      >
        <Trash2 size={15} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Delete Project</h2>
                  <p className="text-xs text-slate-500">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-red-100 rounded-xl transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                You are about to permanently delete{" "}
                <span className="font-bold text-slate-900">"{projectName}"</span>.
                This will remove all tasks, assignments, timelines, and financial data associated with this project.
              </p>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-semibold text-amber-800 mb-1">⚠ Warning</p>
                <p className="text-xs text-amber-700">
                  All AI-generated data, team assignments, and budget forecasts will be permanently lost.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Type <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-red-600">{projectName}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={projectName}
                  autoFocus
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 font-mono"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== projectName || isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-200 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <><Loader2 size={15} className="animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 size={15} /> Delete Project</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
