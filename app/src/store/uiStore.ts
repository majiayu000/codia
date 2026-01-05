import { create } from "zustand";
import type { UIState } from "./types";
import type { BasicExpression } from "@/services";

interface UIStateStore extends UIState {
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
  setRecording: (recording: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setExpression: (expression: BasicExpression) => void;
  setLoadingState: (state: UIState["loadingState"]) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: UIState = {
  isSidebarOpen: true,
  isSettingsOpen: false,
  isRecording: false,
  isSpeaking: false,
  currentExpression: "neutral",
  loadingState: "idle",
  error: null,
};

export const useUIStore = create<UIStateStore>((set) => ({
  ...initialState,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),

  setRecording: (recording) => set({ isRecording: recording }),
  setSpeaking: (speaking) => set({ isSpeaking: speaking }),

  setExpression: (expression) => set({ currentExpression: expression }),

  setLoadingState: (loadingState) => set({ loadingState }),
  setError: (error) => set({ error, loadingState: error ? "error" : "idle" }),

  reset: () => set(initialState),
}));
