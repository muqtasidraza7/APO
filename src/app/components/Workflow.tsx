"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Zap, Sparkles, Check, AlertCircle } from "lucide-react";

// The Data
const steps = [
  {
    title: "Upload & Parse",
    desc: "Drop your PDF or Docx. Our AI instantly reads unstructured data, identifying budget constraints, deadlines, and requirements.",
    color: "blue",
    tag: "Extraction Engine",
  },
  {
    title: "Skill Matching",
    desc: "The system scans your employee database to find the perfect human resources based on the extracted technical requirements.",
    color: "indigo",
    tag: "Resource AI",
  },
  {
    title: "Auto-Scheduling",
    desc: "Visualizing the timeline. The AI automatically resolves overlap conflicts and suggests the optimal path to delivery.",
    color: "purple",
    tag: "Constraint Solver",
  },
  {
    title: "Live Execution",
    desc: "Track progress in real-time. The system monitors burn rates and deliverables, alerting you before risks become issues.",
    color: "emerald",
    tag: "Active Monitor",
  },
];

export default function VerticalWorkflow() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      id="workflow"
      className="py-24 bg-white overflow-hidden relative"
      ref={containerRef}
    >
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        {/* Header */}
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--color-text)] tracking-tight mb-6">
            Intelligent <span className="gradient-text">Processing</span>
          </h2>
          <p className="text-lg text-[var(--color-text-light)] max-w-2xl mx-auto">
            See how the AI transforms raw documents into managed projects.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="relative">
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-slate-100 transform md:-translate-x-1/2" />
          <motion.div
            style={{ height: lineHeight }}
            className="absolute left-8 md:left-1/2 top-0 w-0.5 bg-gradient-to-b from-[var(--color-accent)] to-purple-500 transform md:-translate-x-1/2 origin-top"
          />

          <div className="space-y-32">
            {steps.map((step, index) => (
              <TimelineItem key={index} step={step} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineItem({ step, index }: { step: any; index: number }) {
  const isEven = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20%" }}
      transition={{ duration: 0.7 }}
      className={`relative flex flex-col md:flex-row items-center gap-12 md:gap-0 ${
        isEven ? "md:flex-row" : "md:flex-row-reverse"
      }`}
    >
      {/* 1. TEXT SIDE */}
      <div
        className={`flex-1 pl-20 md:pl-0 ${
          isEven ? "md:pr-24 md:text-right" : "md:pl-24 md:text-left"
        }`}
      >
        <div className="relative">
          <span
            className={`inline-block py-1 px-3 rounded-md bg-${step.color}-50 text-${step.color}-600 text-xs font-bold uppercase tracking-wider mb-4`}
          >
            {step.tag}
          </span>
          <h3 className="text-3xl font-bold text-[var(--color-text)] mb-4">
            {step.title}
          </h3>
          <p className="text-[var(--color-text-light)] text-lg leading-relaxed">
            {step.desc}
          </p>
        </div>
      </div>

      {/* 2. CENTER NODE */}
      <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-white border-4 border-slate-50 items-center justify-center z-10 shadow-sm">
        <div className={`w-3 h-3 rounded-full bg-${step.color}-500`} />
      </div>

      {/* 3. VISUAL SIDE (Custom Simulation) */}
      <div
        className={`flex-1 pl-20 md:pl-0 ${isEven ? "md:pl-24" : "md:pr-24"}`}
      >
        <div className="relative w-full max-w-md mx-auto aspect-video bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex items-center justify-center">
          <VisualSimulation index={index} color={step.color} />
        </div>
      </div>
    </motion.div>
  );
}

// This handles the specific "Mini-App" animation for each step
function VisualSimulation({ index, color }: { index: number; color: string }) {
  // 1. SCANNING ANIMATION
  if (index === 0)
    return (
      <div className="relative w-32 h-40 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="w-12 h-2 bg-slate-200 rounded" />
        <div className="space-y-2">
          <div className="w-full h-1 bg-slate-200 rounded" />
          <div className="w-full h-1 bg-slate-200 rounded" />
          <div className="w-2/3 h-1 bg-slate-200 rounded" />
        </div>
        {/* The Scanning Laser */}
        <motion.div
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
        />
        {/* Pop-up Data Tag */}
        <motion.div
          animate={{ opacity: [0, 1, 0], y: [10, 0, -10] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          className="absolute right-[-20px] top-10 bg-blue-600 text-white text-[10px] px-2 py-1 rounded shadow-lg"
        >
          Budget: $50k
        </motion.div>
      </div>
    );

  // 2. MATCHING ANIMATION
  if (index === 1)
    return (
      <div className="flex items-center gap-4">
        {/* Candidate Card */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-24 h-32 bg-white border border-indigo-100 rounded-lg shadow-sm p-3 flex flex-col items-center justify-center gap-2"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            JD
          </div>
          <div className="h-1 w-12 bg-slate-100 rounded" />
          <div className="h-1 w-8 bg-slate-100 rounded" />
        </motion.div>

        {/* Connection Line */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-1 bg-indigo-200 rounded-full mb-1" />
          <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            98%
          </div>
        </div>

        {/* Job Card */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-24 h-32 bg-indigo-50 border border-indigo-100 rounded-lg shadow-sm p-3 flex flex-col items-center justify-center gap-2"
        >
          <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
            <Sparkles size={14} className="text-indigo-500" />
          </div>
          <div className="text-[10px] font-semibold text-indigo-900">
            React Dev
          </div>
        </motion.div>
      </div>
    );

  // 3. SCHEDULING ANIMATION
  if (index === 2)
    return (
      <div className="w-full max-w-[200px] space-y-3">
        {/* Calendar Header */}
        <div className="flex justify-between border-b border-slate-100 pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-6 h-6 text-[10px] text-slate-400 flex items-center justify-center"
            >
              0{i}
            </div>
          ))}
        </div>
        {/* Task Bars */}
        <div className="relative h-20">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "60%" }}
            transition={{ duration: 1 }}
            className="absolute top-0 left-0 h-6 bg-purple-200 rounded-md border-l-4 border-purple-500 w-[60%]"
          />
          <motion.div
            initial={{ x: 0, width: "30%", backgroundColor: "#fee2e2" }} // Red initially
            whileInView={{ x: "65%", width: "30%", backgroundColor: "#f3e8ff" }} // Moves to purple
            transition={{ duration: 1.5, delay: 0.5 }}
            className="absolute top-8 left-0 h-6 rounded-md border-l-4 border-red-400"
            style={{ borderColor: "var(--color-accent)" }}
          >
            {/* Conflict Alert Icon */}
            <motion.div
              initial={{ opacity: 1 }}
              whileInView={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute -right-2 -top-2 text-red-500"
            >
              <AlertCircle size={12} fill="white" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    );

  // 4. ANALYTICS ANIMATION
  if (index === 3)
    return (
      <div className="flex items-end gap-2 h-24 items-end px-6 pb-4 w-full">
        <motion.div
          initial={{ height: "20%" }}
          whileInView={{ height: "40%" }}
          transition={{ duration: 0.5 }}
          className="flex-1 bg-emerald-100 rounded-t-sm"
        />
        <motion.div
          initial={{ height: "20%" }}
          whileInView={{ height: "70%" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 bg-emerald-200 rounded-t-sm"
        />
        <motion.div
          initial={{ height: "20%" }}
          whileInView={{ height: "55%" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-1 bg-emerald-300 rounded-t-sm"
        />
        <motion.div
          initial={{ height: "20%" }}
          whileInView={{ height: "90%" }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex-1 bg-emerald-500 rounded-t-sm relative group"
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            Peak
          </div>
        </motion.div>
      </div>
    );

  return null;
}
