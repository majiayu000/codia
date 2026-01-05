import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppSettings } from "./types";

const DEFAULT_SETTINGS: AppSettings = {
  llmProvider: "openai",
  llmModel: "gpt-4o-mini",
  ttsProvider: "none",
  ttsVoice: "default",
  asrEnabled: false,
  theme: "system",
  language: "en",
};

interface SettingsState extends AppSettings {
  // Actions
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: (updates) => {
        set((state) => ({ ...state, ...updates }));
      },

      resetSettings: () => {
        set(DEFAULT_SETTINGS);
      },
    }),
    {
      name: "codia-settings-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
