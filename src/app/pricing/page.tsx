"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  Sparkles,
  ArrowRight,
  Zap,
  Brain,
  BarChart3,
  Users,
  MessageSquare,
  Bell,
  Shield,
  GitBranch,
  Clock,
} from "lucide-react";

const FEATURES = [
  { icon: Brain, label: "AI Resource Allocation", desc: "Automatically assigns team members to milestones based on skills and availability" },
  { icon: Zap, label: "Sprint Management", desc: "Create sprints, track tasks, monitor burndown velocity in real time" },
  { icon: BarChart3, label: "Cost & Analytics", desc: "Budget breakdowns, expense tracking, and project health dashboards" },
  { icon: Users, label: "Role-Based Access", desc: "Owner, PM, Member, and Client roles with granular permissions" },
  { icon: MessageSquare, label: "Team Messaging", desc: "Slack-style threaded channels with @mentions and file sharing" },
  { icon: Bell, label: "Real-Time Notifications", desc: "Live bell notifications for assignments, mentions, and project events" },
  { icon: GitBranch, label: "Gantt & Roadmap", desc: "Visual timeline views with dependency tracking" },
  { icon: Clock, label: "Workload Heatmap", desc: "See who's overloaded and rebalance before it becomes a bottleneck" },
];

const TIERS = [
  {
    name: "Starter",
    badge: null,
    price: "$0",
    period: null,
    description: "For small teams and solo PMs getting started.",
    features: [
      "1 workspace",
      "Up to 5 team members",
      "Manual project creation",
      "Sprint task board",
      "Basic notifications",
    ],
    cta: "Get Started Free",
    href: "/register",
    featured: false,
    accent: "slate",
  },
  {
    name: "Professional",
    badge: "Most Popular",
    price: "$29",
    period: "/month",
    description: "For PMs who want AI to handle the heavy lifting.",
    features: [
      "Unlimited workspaces",
      "Unlimited team members",
      "AI smart resource allocation",
      "Cost & budget analytics",
      "Sprint burndown charts",
      "Team messaging & channels",
      "Live workload heatmap",
      "Read-only project share links",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/register?plan=pro",
    featured: true,
    accent: "indigo",
  },
  {
    name: "Enterprise",
    badge: null,
    price: "Custom",
    period: null,
    description: "For large orgs that need control and compliance.",
    features: [
      "Everything in Professional",
      "SSO (Okta / Azure AD)",
      "Custom AI model fine-tuning",
      "Audit logs & compliance reports",
      "Dedicated success manager",
      "SLA guarantee",
      "On-premise deployment option",
    ],
    cta: "Contact Sales",
    href: "mailto:sardarhammad65@gmail.com",
    featured: false,
    accent: "violet",
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Hero */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <motion.div {...fadeUp()}>
            <span className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-bold px-4 py-1.5 rounded-full border border-indigo-100 mb-6 uppercase tracking-wider">
              <Sparkles size={13} /> Currently in Open Beta — All features free
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-5">
              Simple pricing for <br />
              <span className="text-indigo-600">AI-powered teams</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Stop wasting hours on manual planning, resource shuffling, and status updates.
              APO's AI handles it so your team can focus on shipping.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              {...fadeUp(i * 0.1)}
              className={`relative rounded-2xl p-8 border transition-all duration-300 ${
                tier.featured
                  ? "bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-200 scale-105 z-10"
                  : "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-4 inset-x-0 flex justify-center">
                  <span className="bg-amber-400 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow">
                    <Sparkles size={10} /> {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-lg font-black mb-1 ${tier.featured ? "text-white" : "text-slate-900"}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm leading-relaxed ${tier.featured ? "text-indigo-200" : "text-slate-500"}`}>
                  {tier.description}
                </p>
              </div>

              <div className={`flex items-baseline gap-1 mb-8 ${tier.featured ? "text-white" : "text-slate-900"}`}>
                <span className="text-5xl font-black">{tier.price}</span>
                {tier.period && (
                  <span className={`text-base font-medium ${tier.featured ? "text-indigo-200" : "text-slate-400"}`}>
                    {tier.period}
                  </span>
                )}
              </div>

              <Link
                href={tier.href}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm ${
                  tier.featured
                    ? "bg-white text-indigo-600 hover:bg-indigo-50 shadow-md"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                }`}
              >
                {tier.cta}
                <ArrowRight size={16} />
              </Link>

              <div className="mt-8 space-y-3">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${tier.featured ? "text-indigo-300" : "text-slate-400"}`}>
                  What's included
                </p>
                {tier.features.map((f) => (
                  <li key={f} className={`flex items-start gap-3 text-sm list-none ${tier.featured ? "text-indigo-100" : "text-slate-600"}`}>
                    <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${tier.featured ? "bg-white/20" : "bg-indigo-50"}`}>
                      <Check size={10} className={tier.featured ? "text-white" : "text-indigo-600"} strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <motion.div {...fadeUp(0.3)} className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 mb-3">Everything your team needs</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Built for software teams that juggle multiple projects, tight deadlines, and distributed talent.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              {...fadeUp(0.1 + i * 0.05)}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <f.icon size={17} className="text-indigo-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">{f.label}</h4>
              <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-indigo-600 py-20">
        <motion.div {...fadeUp(0.2)} className="max-w-2xl mx-auto px-6 text-center">
          <Shield size={32} className="text-indigo-300 mx-auto mb-5" />
          <h2 className="text-3xl font-black text-white mb-4">
            Start for free. No credit card required.
          </h2>
          <p className="text-indigo-200 mb-8 leading-relaxed">
            Create your workspace, invite your team, and let the AI allocate your first sprint in under 5 minutes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 font-black px-8 py-3.5 rounded-xl hover:bg-indigo-50 transition-all shadow-lg text-sm"
          >
            Create Free Account <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

    </div>
  );
}
