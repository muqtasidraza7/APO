"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
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
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-white overflow-hidden pt-12">
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-slate-50/30 pointer-events-none"></div>

      {/* Floating Accent Element */}
      <div className="absolute top-20 right-10 w-40 h-40 bg-blue-100/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-10 w-32 h-32 bg-blue-50/30 rounded-full blur-2xl"></div>

      <div className="relative container mx-auto flex flex-col items-center justify-center gap-12 px-6 py-12 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-8 max-w-3xl"
        >
          {/* Main Heading */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-[var(--color-text)] md:whitespace-nowrap"
          >
            AI Project <span className="gradient-text">Officer</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-[var(--color-text-light)] max-w-4xl leading-relaxed"
          >
            Intelligent project management that works the way you think. Plan
            smarter, execute faster, achieve more effortlessly.
          </motion.p>

          {/* CTA Button */}
          <motion.div variants={itemVariants}>
            <Link
              href="/register"
              className="inline-flex items-center gap-3 bg-black !text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-900 transition-all"
            >
              Try Project Officer
              <ArrowRight size={20} />
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-4">
            <div className="text-4xl text-black py-5 text font-semibold">
              Your AI-Powered Project Manager
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
