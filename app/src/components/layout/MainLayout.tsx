"use client";

import { useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentSection, setCurrentSection] = useState("chat");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleMenuToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleNewChat = () => {
    // TODO: Implement new chat functionality
    console.log("New chat");
  };

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-canvas)]">
      <Header
        onMenuToggle={handleMenuToggle}
        isSidebarOpen={isSidebarOpen}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onNewChat={handleNewChat}
            currentSection={currentSection}
            onSectionChange={setCurrentSection}
          />
        )}

        <main
          className={cn(
            "flex-1 overflow-auto transition-all duration-200",
            showSidebar && isSidebarOpen && "md:ml-0"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
