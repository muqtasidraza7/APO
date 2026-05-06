"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Github, Slack, Calendar, Trello, Copy, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export default function IntegrationsPage() {
  const [copied, setCopied] = useState(false);
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/github` : 'https://your-domain.com/api/webhooks/github';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-500 mt-2 text-lg">
          Connect APO with your favorite tools to automate task tracking and status updates.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* GitHub Integration Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start"
        >
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white flex-shrink-0">
            <Github size={32} />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">GitHub Configuration</h2>
              <p className="text-slate-500 mt-1">Automatically close tasks when a Pull Request is merged. Include <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">Closes Task-Name</code> in your PR description.</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Webhook URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={webhookUrl}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-600 focus:outline-none"
                />
                <button 
                  onClick={copyToClipboard}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 text-sm text-indigo-800">
              <ArrowRight size={20} className="flex-shrink-0 text-indigo-500" />
              <p>Go to your GitHub Repository <strong>Settings &gt; Webhooks</strong>. Click <strong>Add webhook</strong>, paste the URL above, and select <strong>application/json</strong>. Select "Let me select individual events" and choose <strong>Pull requests</strong>.</p>
            </div>
          </div>
        </motion.div>

        {/* Coming Soon Integrations */}
        <div className="grid md:grid-cols-3 gap-6 pt-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-slate-200 border-dashed rounded-3xl p-6 opacity-60 flex flex-col items-center text-center"
          >
            <Slack size={32} className="text-[#E01E5A] mb-4" />
            <h3 className="font-bold text-slate-900 mb-1">Slack</h3>
            <p className="text-xs text-slate-500 mb-4">Get daily summaries and alerts for pattern blocks.</p>
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold uppercase tracking-wider">Coming Soon</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-slate-200 border-dashed rounded-3xl p-6 opacity-60 flex flex-col items-center text-center"
          >
            <Calendar size={32} className="text-blue-500 mb-4" />
            <h3 className="font-bold text-slate-900 mb-1">Google Calendar</h3>
            <p className="text-xs text-slate-500 mb-4">Sync task deadlines and track team member PTO automatically.</p>
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold uppercase tracking-wider">Coming Soon</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-slate-200 border-dashed rounded-3xl p-6 opacity-60 flex flex-col items-center text-center"
          >
            <Trello size={32} className="text-blue-600 mb-4" />
            <h3 className="font-bold text-slate-900 mb-1">Jira / Trello</h3>
            <p className="text-xs text-slate-500 mb-4">Two-way sync milestones to tickets in your current issue tracker.</p>
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold uppercase tracking-wider">Coming Soon</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
