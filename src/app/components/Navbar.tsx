"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState("Home");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Overview", href: "/" },
    { name: "Plans", href: "/pricing" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
      },
    },
  };

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-[var(--color-border)]"
          : "bg-white/50 backdrop-blur-sm"
      }`}
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/"
            className="text-2xl font-bold text-[var(--color-text)] tracking-tight hover:scale-105 transition-transform duration-200"
          >
            APO<span className="text-[var(--color-accent)]">.</span>
          </Link>
        </motion.div>

        <div className="hidden md:flex items-center gap-12">
          <motion.div
            className="flex items-center gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {navLinks.map((link) => (
              <motion.div key={link.name} variants={itemVariants}>
                <Link
                  href={link.href}
                  className={`text-sm font-medium transition-colors duration-200 py-2 px-1 relative ${
                    activeLink === link.name
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text-light)] hover:text-[var(--color-text)]"
                  }`}
                  onClick={() => setActiveLink(link.name)}
                >
                  {link.name}
                  {activeLink === link.name && (
                    <motion.div
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-accent)]"
                      layoutId="activeIndicator"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="flex items-center gap-3 ml-8 border-l border-[var(--color-border)] pl-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <Link
                href="/login"
                className="text-sm font-medium text-[var(--color-text-light)] hover:text-[var(--color-text)] py-2 px-4 rounded-md transition-colors duration-200"
              >
                Login
              </Link>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Link
                href="/register"
                className="text-sm font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] py-2 px-5 rounded-md shadow-sm hover:shadow-md transition-all duration-200"
              >
                Sign Up
              </Link>
            </motion.div>
          </motion.div>
        </div>

        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-[var(--color-text)] p-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-border)] transition-all duration-300"
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-white/95 backdrop-blur-sm border-t border-[var(--color-border)] shadow-sm"
          >
            <motion.div
              className="flex flex-col items-center gap-2 py-6 px-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.name}
                  variants={itemVariants}
                  custom={index}
                  className="w-full text-center"
                >
                  <Link
                    href={link.href}
                    className={`text-sm font-medium py-2 px-6 rounded-md w-full block transition-all duration-200 ${
                      activeLink === link.name
                        ? "bg-[var(--color-surface)] text-[var(--color-accent)] font-semibold"
                        : "text-[var(--color-text-light)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                    }`}
                    onClick={() => {
                      setActiveLink(link.name);
                      setIsOpen(false);
                    }}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                className="flex flex-col gap-2 w-full max-w-xs mt-4 pt-4 border-t border-[var(--color-border)]"
                variants={itemVariants}
              >
                <Link
                  href="/login"
                  className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-accent)] w-full text-center py-2 rounded-md transition-colors duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] w-full text-center py-2 rounded-md shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  Sign Up
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
