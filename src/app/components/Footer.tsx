"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Github, Linkedin, Twitter, Mail, ArrowUp } from "lucide-react";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const quickLinks = [
    { name: "Features", href: "#features" },
    { name: "Workflow", href: "#workflow" },
    { name: "Pricing", href: "#pricing" },
  ];

  const company = [
    { name: "About Us", href: "/about" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
  ];

  const socialLinks = [
    {
      icon: <Linkedin size={18} />,
      href: "https://linkedin.com",
      label: "LinkedIn",
    },
    {
      icon: <Twitter size={18} />,
      href: "https://twitter.com",
      label: "Twitter",
    },
    { icon: <Github size={18} />, href: "https://github.com", label: "GitHub" },
  ];

  return (
    <footer className="relative bg-white border-t border-[var(--color-border)] text-[var(--color-text-light)] pt-16 pb-8">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid lg:grid-cols-4 gap-12 mb-16">
          {/* 1. Brand Section */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="inline-flex items-center gap-1 group">
              <span className="text-2xl font-bold text-[var(--color-text)] tracking-tight">
                APO<span className="text-[var(--color-accent)]">.</span>
              </span>
            </Link>

            <p className="text-[var(--color-text-light)] text-sm leading-relaxed max-w-sm">
              Your AI-powered project management partner. Extract insights from
              documents, optimize resources, and execute smarter.
            </p>

            {/* Newsletter Input */}
            <div className="flex gap-2 max-w-xs pt-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-text-lighter)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
              />
              <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors">
                Subscribe
              </button>
            </div>
          </div>

          {/* 2. Navigation Columns */}
          <div>
            <h3 className="font-semibold text-[var(--color-text)] mb-4">
              Product
            </h3>
            <ul className="space-y-3 text-sm">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[var(--color-text-light)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-[var(--color-text)] mb-4">
              Company
            </h3>
            <ul className="space-y-3 text-sm">
              {company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[var(--color-text-light)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 3. Bottom Bar */}
        <div className="pt-8 border-t border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-text-lighter)]">
            © {new Date().getFullYear()} APO. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[var(--color-border)] text-[var(--color-text-light)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all"
              >
                {social.icon}
              </a>
            ))}

            <button
              onClick={scrollToTop}
              className="ml-4 p-2 bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-text-light)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all"
              aria-label="Scroll to top"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
