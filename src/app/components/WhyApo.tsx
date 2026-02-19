"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Brain,
  Users,
  Timer,
  Shield,
  Sparkles,
  Target,
  ArrowRight,
  CheckCircle,
  BarChart3,
} from "lucide-react";

const benefits = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "AI-Powered Efficiency",
    desc: "Automates resource allocation, scheduling, and bottleneck detection — reducing manual work by 70%.",
    metrics: "70% faster setup",
    color: "from-blue-500 to-cyan-500",
    delay: 0,
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Smarter Collaboration",
    desc: "Keeps project managers in control while providing clients with transparent progress updates.",
    metrics: "50% less meetings",
    color: "from-purple-500 to-pink-500",
    delay: 0.1,
  },
  {
    icon: <Timer className="w-6 h-6" />,
    title: "On-Time Delivery",
    desc: "Predictive analytics and AI-driven replanning ensure deadlines are met even under shifting priorities.",
    metrics: "95% on-time rate",
    color: "from-orange-500 to-amber-500",
    delay: 0.2,
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Quality & Compliance",
    desc: "Built-in QA engine continuously monitors standards and compliance across deliverables.",
    metrics: "99% compliance rate",
    color: "from-green-500 to-emerald-500",
    delay: 0.3,
  },
];

const stats = [
  { value: "40%", label: "Faster Project Completion" },
  { value: "60%", label: "Reduced Manual Work" },
  { value: "95%", label: "On-Time Delivery Rate" },
];

export default function WhyChoose() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 40,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const statVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  return (
    <section
      id="why-choose"
      ref={sectionRef}
      className="relative py-24 bg-[var(--color-primary)] text-white overflow-hidden"
    >
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/15 via-transparent to-purple-900/10 pointer-events-none"></div>

      {/* Animated Background Elements */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="relative container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <motion.div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
              <Target size={16} className="text-[var(--color-accent)]" />
              <span className="text-sm font-medium">Why We're Different</span>
            </motion.div>

            <motion.h2 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Why Choose{" "}
              <span className="text-[var(--color-accent)]">APO?</span>
            </motion.h2>

            <motion.p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Unlike traditional project management tools, APO uses AI to not
              only organize but also{" "}
              <span className="text-[var(--color-accent)] font-semibold">
                optimize
              </span>{" "}
              — ensuring projects are delivered faster, smarter, and with higher
              quality.
            </motion.p>

            <motion.p className="text-gray-400 mb-8 leading-relaxed">
              By combining intelligent automation with transparency, APO
              empowers managers to focus on leadership instead of
              micromanagement.
            </motion.p>

            {/* Stats Grid */}
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-3 gap-6 mb-8"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  custom={index * 0.1}
                  className="text-center"
                >
                  <div className="text-2xl lg:text-3xl font-bold text-[var(--color-accent)] mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400 leading-tight">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Sparkles size={16} />
                Start Free Trial
                <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right Benefits Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid sm:grid-cols-2 gap-6"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                custom={benefit.delay}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                  transition: { duration: 0.2 },
                }}
                className="group relative"
              >
                {/* Gradient Border Effect */}
                <div
                  className={`absolute -inset-0.5 bg-gradient-to-r ${benefit.color} rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-300`}
                ></div>

                <div className="relative bg-[var(--color-surface)] p-6 rounded-xl border border-white/10 backdrop-blur-sm h-full group-hover:border-white/20 transition-all duration-300">
                  {/* Animated Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={
                      isInView
                        ? { scale: 1, rotate: 0 }
                        : { scale: 0, rotate: -180 }
                    }
                    transition={{
                      duration: 0.6,
                      delay: benefit.delay,
                      type: "spring",
                      stiffness: 200,
                    }}
                    className={`inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-r ${benefit.color} text-white shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                  >
                    {benefit.icon}
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-lg font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all duration-300">
                    {benefit.title}
                  </h3>

                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                    {benefit.desc}
                  </p>

                  {/* Metrics Badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={
                      isInView
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0, scale: 0 }
                    }
                    transition={{ duration: 0.4, delay: benefit.delay + 0.3 }}
                    className="inline-flex items-center gap-1 bg-white/5 rounded-full px-3 py-1 border border-white/10"
                  >
                    <CheckCircle
                      size={12}
                      className="text-[var(--color-accent)]"
                    />
                    <span className="text-xs font-medium text-gray-300">
                      {benefit.metrics}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom Trust Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-20"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-8 bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-[var(--color-accent)]" size={24} />
              <span className="text-lg font-semibold">
                Trusted by project teams at
              </span>
            </div>
            <div className="flex flex-wrap gap-6 items-center justify-center">
              {[
                "TechCorp",
                "StartupX",
                "InnovateCo",
                "FutureLabs",
                "ScaleUp",
              ].map((company, index) => (
                <motion.div
                  key={company}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={
                    isInView
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0 }
                  }
                  transition={{ duration: 0.4, delay: 1 + index * 0.1 }}
                  className="text-gray-300 font-medium text-sm opacity-70 hover:opacity-100 transition-opacity duration-200"
                >
                  {company}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
