"use client";

import { useState } from "react";
import { Settings, Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
  onSettingsClick?: () => void;
}

export function Header({
  onMenuToggle,
  isSidebarOpen,
  onSettingsClick,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const newValue = !prev;
      document.documentElement.classList.toggle("dark", newValue);
      return newValue;
    });
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="md:hidden"
          aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
        >
          {isSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)] flex items-center justify-center">
            <span className="text-sm font-bold text-white">C</span>
          </div>
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            Codia
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-[var(--accent-amber)]" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
