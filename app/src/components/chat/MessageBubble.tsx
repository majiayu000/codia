"use client";

import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  emotion?: string;
}

interface MessageBubbleProps {
  message: Message;
  isLatest?: boolean;
}

export function MessageBubble({ message, isLatest }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-[var(--primary-100)] text-[var(--primary-600)]"
            : "bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--primary-500)] text-white"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      <div
        className={cn(
          "max-w-[80%] rounded-[var(--radius-lg)] px-4 py-3",
          isUser
            ? "bg-[var(--primary-500)] text-white rounded-br-[var(--radius-sm)]"
            : "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-bl-[var(--radius-sm)]"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <span
          className={cn(
            "mt-1 block text-xs",
            isUser ? "text-white/70" : "text-[var(--text-muted)]"
          )}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
