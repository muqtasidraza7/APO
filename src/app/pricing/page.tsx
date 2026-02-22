"use client";

import Link from "next/link";
import { Check, Sparkles, Zap, Building2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function PricingPage() {
  const tiers = [
    {
      name: "Starter",
      price: "$0",
      description: "Perfect for students and hobby projects.",
      features: [
        "1 Active Workspace",
        "Manual Project Creation",
        "Basic Task Board",
        "Up to 3 Team Members",
      ],
      cta: "Get Started",
      href: "/register",
      featured: false,
    },
    {
      name: "Professional",
      price: "$29",
      period: "/month",
      description: "For project managers who need AI automation.",
      features: [
        "Unlimited Workspaces",
        "AI Document Parsing (PDF/Docx)",
        "Smart Resource Allocation",
        "Gantt Chart & Simulations",
        "Priority Support",
      ],
      cta: "Start Free Trial",
      href: "/register?plan=pro",
      featured: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations requiring control.",
      features: [
        "SSO (Okta/Azure AD)",
        "Dedicated Success Manager",
        "Custom AI Model Fine-tuning",
        "Audit Logs & Compliance",
        "SLA Guarantee",
      ],
      cta: "Contact Sales",
      href: "mailto:sales@projectofficer.com",
      featured: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-4">
              Simple Pricing
            </h2>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Invest in your{" "}
              <span className="text-indigo-600">Productivity</span>.
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Stop wasting hours on manual planning. Let our AI handle the setup
              so you can focus on execution.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-white rounded-2xl p-8 border transition-all duration-300 hover:shadow-xl ${
                tier.featured
                  ? "border-indigo-600 shadow-indigo-100 ring-4 ring-indigo-50 scale-105 z-10"
                  : "border-slate-200 shadow-sm hover:border-indigo-200"
              }`}
            >
              {tier.featured && (
                <div className="absolute top-0 right-0 left-0 -mt-4 flex justify-center">
                  <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider">
                    <Sparkles size={12} /> Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">
                  {tier.name}
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  {tier.description}
                </p>
              </div>

              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-slate-500">{tier.period}</span>
                )}
              </div>

              <Link
                href={tier.href}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  tier.featured
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {tier.cta}
                {tier.featured && <ArrowRight size={18} />}
              </Link>

              <div className="mt-8 space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  What's included
                </p>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-slate-600"
                    >
                      <Check
                        size={18}
                        className="text-indigo-600 shrink-0 mt-0.5"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAQ / Trust Section */}
      <div className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h3 className="text-lg font-semibold text-slate-900 mb-8">
          Trusted by future-forward teams
        </h3>
        <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale">
          {/* Simple placeholders for logos */}
          <div className="flex items-center gap-2 text-xl font-bold text-slate-400">
            <Zap className="fill-current" /> Acme Inc.
          </div>
          <div className="flex items-center gap-2 text-xl font-bold text-slate-400">
            <Building2 className="fill-current" /> Globex
          </div>
          <div className="flex items-center gap-2 text-xl font-bold text-slate-400">
            <Sparkles className="fill-current" /> StarkInd
          </div>
        </div>
      </div>
    </div>
  );
}
