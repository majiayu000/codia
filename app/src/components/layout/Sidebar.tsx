"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  User,
  Sliders,
  Volume2,
  Mic,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  onNewChat?: () => void;
  currentSection?: string;
  onSectionChange?: (section: string) => void;
}

const navItems = [
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "character", icon: User, label: "Character" },
  { id: "voice", icon: Volume2, label: "Voice" },
  { id: "settings", icon: Sliders, label: "Settings" },
];

export function Sidebar({
  isOpen,
  onClose,
  onNewChat,
  currentSection = "chat",
  onSectionChange,
}: SidebarProps) {
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : "-100%",
          width: isOpen ? "auto" : 0,
        }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-[var(--border-default)] bg-[var(--bg-surface)]",
          "md:relative md:top-0 md:z-0 md:h-full md:translate-x-0",
          !isOpen && "md:w-64"
        )}
      >
        <div className="flex h-full flex-col p-4">
          <Button
            variant="primary"
            className="w-full justify-start gap-2 mb-6"
            onClick={onNewChat}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange?.(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius-default)] px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--primary-100)] text-[var(--primary-700)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--secondary-100)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                  {isActive && (
                    <ChevronRight className="ml-auto h-4 w-4" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-4 border-t border-[var(--border-default)]">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-[var(--secondary-200)] flex items-center justify-center">
                <User className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  Guest User
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Free Plan
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
