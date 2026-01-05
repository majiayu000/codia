"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { Send, Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

interface ChatInputProps {
  onSend: (message: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  isLoading?: boolean;
  isRecording?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onVoiceStart,
  onVoiceEnd,
  isLoading = false,
  isRecording = false,
  disabled = false,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = message.trim();
    if (trimmed && !disabled && !isLoading) {
      onSend(trimmed);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [message, disabled, isLoading, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleVoiceClick = () => {
    if (isRecording) {
      onVoiceEnd?.();
    } else {
      onVoiceStart?.();
    }
  };

  return (
    <div className="border-t border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "flex items-end gap-2 rounded-[var(--radius-lg)] border bg-[var(--bg-elevated)] p-2 transition-colors",
            isRecording
              ? "border-[var(--accent-cyan)] shadow-[var(--shadow-glow-voice)]"
              : "border-[var(--border-default)] focus-within:border-[var(--border-focus)]"
          )}
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={disabled || isLoading || isRecording}
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none disabled:opacity-50"
            aria-label="Message input"
          />

          <div className="flex items-center gap-1">
            {onVoiceStart && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleVoiceClick}
                disabled={disabled || isLoading}
                className={cn(
                  "h-9 w-9",
                  isRecording && "text-[var(--accent-cyan)] animate-pulse"
                )}
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
              >
                {isRecording ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="icon"
              onClick={handleSubmit}
              disabled={!message.trim() || disabled || isLoading}
              className="h-9 w-9"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
