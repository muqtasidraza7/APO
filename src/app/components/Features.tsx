"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  FileText,
  Users,
  CalendarClock,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

export default function Features() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-24 bg-[var(--color-surface)] overflow-hidden"
    >
      <div className="container mx-auto px-6 max-w-7xl">
        
        <div className="mb-16 md:text-center max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-[var(--color-text)] mb-6 tracking-tight"
          >
            Capabilities that feel like{" "}
            <span className="gradient-text">Magic.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-lg text-[var(--color-text-light)]"
          >
            Everything you need to turn raw documents into executed projects.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative overflow-hidden rounded-3xl bg-white border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all"
          >
            <div className="p-8 h-full flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[var(--color-accent)]">
                  <FileText size={24} />
                </div>
                <h3 className="text-2xl font-bold text-[var(--color-text)]">
                  AI Document Parsing
                </h3>
                <p className="text-[var(--color-text-light)] leading-relaxed">
                  Don't start from scratch. Upload your project charter or PDF,
                  and watch as our AI instantly extracts budgets, timelines, and
                  required skills.
                </p>
              </div>

              {/* Abstract UI Visual */}
              <div className="flex-1 w-full bg-[var(--color-surface)] rounded-2xl p-6 relative overflow-hidden min-h-[200px] flex flex-col gap-3 border border-slate-100">
                {/* Simulated Document Scanning Animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-accent)]/50 shadow-[0_0_20px_rgba(79,70,229,0.5)] animate-scan" />
                <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse delay-75" />
                <div className="w-full h-24 bg-white rounded-lg border border-slate-200 mt-2 p-3 space-y-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <div className="w-20 h-2 bg-slate-100 rounded" />
                  </div>
                  <div className="w-full h-2 bg-slate-50 rounded" />
                  <div className="w-5/6 h-2 bg-slate-50 rounded" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Resource Management (Tall Vertical) */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-1 group relative overflow-hidden rounded-3xl bg-white border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all"
          >
            <div className="p-8 h-full flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-6">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-3">
                Smart Allocation
              </h3>
              <p className="text-[var(--color-text-light)] mb-8 text-sm">
                Automatically match the right people to tasks based on their
                skills and availability.
              </p>

              {/* Visual: Avatar Bubbles */}
              <div className="mt-auto flex -space-x-3 items-center justify-center py-6 bg-[var(--color-surface)] rounded-xl border border-slate-100">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-white relative z-${
                      i * 10
                    }`}
                    style={{
                      background: `var(--color-accent${
                        i === 2 ? "" : "-light"
                      })`,
                      color: i === 2 ? "white" : "var(--color-accent)",
                    }}
                  >
                    {i === 2 ? "AI" : "U"}
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 text-xs shadow-sm z-40">
                  +
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Scheduling (Wide Bottom) */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-3 group relative overflow-hidden rounded-3xl bg-[var(--color-text)] text-white shadow-lg"
          >
            {/* Dark Card for Contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800" />
            <div className="relative p-8 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-lg">
                <div className="flex items-center gap-3 text-emerald-400 mb-2">
                  <CalendarClock size={24} />
                  <span className="font-semibold tracking-wider text-sm uppercase">
                    Auto-Scheduling
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white">
                  Multi-Project Sync
                </h3>
                <p className="text-gray-400">
                  The AI resolves conflicts before they happen. If a deadline
                  shifts in Project A, resources in Project B are automatically
                  adjusted.
                </p>
              </div>

              {/* Visual: Timeline Bars */}
              <div className="w-full md:w-1/2 bg-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
                <div className="flex justify-between text-xs text-gray-500 mb-4">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                </div>
                <div className="space-y-3">
                  <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: "70%" } : {}}
                      transition={{ delay: 0.5, duration: 1 }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                  <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: "40%" } : {}}
                      transition={{ delay: 0.7, duration: 1 }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>
                  <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: "90%" } : {}}
                      transition={{ delay: 0.9, duration: 1 }}
                      className="h-full bg-purple-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% {
            top: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </section>
  );
}
