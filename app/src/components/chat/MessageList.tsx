"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { MessageBubble, type Message } from "./MessageBubble";
import { LoadingDots } from "@/components/ui";

interface MessageListProps {
  messages: Message[];
  isTyping?: boolean;
}

export function MessageList({ messages, isTyping = false }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (messages.length === 0 && !isTyping) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)] flex items-center justify-center">
          <span className="text-2xl font-bold text-white">C</span>
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Welcome to Codia
        </h2>
        <p className="mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
          Your AI virtual companion is ready to chat. Start a conversation or
          try voice input!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLatest={index === messages.length - 1}
            />
          ))}
        </AnimatePresence>

        {isTyping && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--primary-500)]">
              <span className="text-xs font-bold text-white">C</span>
            </div>
            <div className="rounded-[var(--radius-lg)] rounded-bl-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-default)] px-4 py-3">
              <LoadingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
