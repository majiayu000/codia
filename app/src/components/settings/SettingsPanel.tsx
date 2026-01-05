"use client";

import { useState } from "react";
import { X, Bot, Volume2, Palette, Database } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import { useSettingsStore, useCharacterStore } from "@/store";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "llm" | "voice" | "appearance" | "data";

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("llm");
  const settings = useSettingsStore();
  const character = useCharacterStore();

  const tabs = [
    { id: "llm" as const, label: "AI Model", icon: Bot },
    { id: "voice" as const, label: "Voice", icon: Volume2 },
    { id: "appearance" as const, label: "Theme", icon: Palette },
    { id: "data" as const, label: "Data", icon: Database },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <div className="flex h-[400px]">
        {/* Sidebar */}
        <nav className="w-40 border-r border-[var(--border-default)] pr-4">
          <ul className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-2 rounded-[var(--radius-default)] px-3 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-[var(--primary-100)] text-[var(--primary-700)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--secondary-100)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 pl-6 overflow-y-auto">
          {activeTab === "llm" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                AI Model Settings
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Provider
                  </label>
                  <select
                    value={settings.llmProvider}
                    onChange={(e) =>
                      settings.updateSettings({
                        llmProvider: e.target.value as "openai" | "anthropic" | "ollama",
                      })
                    }
                    className="mt-1 w-full rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="ollama">Ollama (Local)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Model
                  </label>
                  <select
                    value={settings.llmModel}
                    onChange={(e) =>
                      settings.updateSettings({ llmModel: e.target.value })
                    }
                    className="mt-1 w-full rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                  >
                    {settings.llmProvider === "openai" && (
                      <>
                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      </>
                    )}
                    {settings.llmProvider === "anthropic" && (
                      <>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                      </>
                    )}
                    {settings.llmProvider === "ollama" && (
                      <>
                        <option value="llama3.2">Llama 3.2</option>
                        <option value="mistral">Mistral</option>
                        <option value="gemma2">Gemma 2</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "voice" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Voice Settings
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    TTS Provider
                  </label>
                  <select
                    value={settings.ttsProvider}
                    onChange={(e) =>
                      settings.updateSettings({
                        ttsProvider: e.target.value as "kokoro" | "elevenlabs" | "none",
                      })
                    }
                    className="mt-1 w-full rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                  >
                    <option value="none">Disabled</option>
                    <option value="kokoro">Kokoro (Local)</option>
                    <option value="elevenlabs">ElevenLabs</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="asr-enabled"
                    checked={settings.asrEnabled}
                    onChange={(e) =>
                      settings.updateSettings({ asrEnabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-[var(--border-default)]"
                  />
                  <label
                    htmlFor="asr-enabled"
                    className="text-sm text-[var(--text-primary)]"
                  >
                    Enable voice input (Speech-to-Text)
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Appearance
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Theme
                  </label>
                  <select
                    value={settings.theme}
                    onChange={(e) =>
                      settings.updateSettings({
                        theme: e.target.value as "light" | "dark" | "system",
                      })
                    }
                    className="mt-1 w-full rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) =>
                      settings.updateSettings({
                        language: e.target.value as "en" | "zh" | "ja",
                      })
                    }
                    className="mt-1 w-full rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Data Management
              </h3>

              <div className="space-y-3">
                <Button variant="secondary" className="w-full justify-start">
                  Export All Data
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  Import Data
                </Button>
                <Button variant="danger" className="w-full justify-start">
                  Clear All Data
                </Button>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Your data is stored locally in your browser. Export regularly
                for backup.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
