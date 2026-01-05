import type { BasicExpression } from "@/services";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  emotion?: BasicExpression;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  characterId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Character {
  id: string;
  name: string;
  vrmUrl: string;
  systemPrompt: string;
  personality: string;
  voiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  llmProvider: "openai" | "anthropic" | "ollama";
  llmModel: string;
  ttsProvider: "kokoro" | "elevenlabs" | "none";
  ttsVoice: string;
  asrEnabled: boolean;
  theme: "light" | "dark" | "system";
  language: "en" | "zh" | "ja";
}

export interface UIState {
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  currentExpression: BasicExpression;
  loadingState: "idle" | "loading" | "streaming" | "error";
  error: string | null;
}
