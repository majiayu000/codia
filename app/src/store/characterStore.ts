import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Character } from "./types";

const DEFAULT_CHARACTER: Character = {
  id: "default",
  name: "Codia",
  vrmUrl: "/sample.vrm",
  systemPrompt: `You are Codia, a friendly and helpful AI virtual companion. You are cheerful, empathetic, and always ready to help. You express emotions naturally in your responses.

Key traits:
- Warm and welcoming
- Curious and interested in learning
- Supportive and encouraging
- Playful but also serious when needed

Always respond in a conversational, natural way. Keep responses concise but engaging.`,
  personality: "friendly",
  voiceId: "default",
  createdAt: new Date(),
  updatedAt: new Date(),
};

interface CharacterState {
  characters: Character[];
  currentCharacterId: string;

  // Actions
  addCharacter: (character: Omit<Character, "id" | "createdAt" | "updatedAt">) => string;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  setCurrentCharacter: (id: string) => void;
  getCurrentCharacter: () => Character;
  getCharacter: (id: string) => Character | undefined;
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      characters: [DEFAULT_CHARACTER],
      currentCharacterId: "default",

      addCharacter: (character) => {
        const id = crypto.randomUUID();
        const now = new Date();
        const newCharacter: Character = {
          ...character,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          characters: [...state.characters, newCharacter],
        }));

        return id;
      },

      updateCharacter: (id, updates) => {
        set((state) => ({
          characters: state.characters.map((char) =>
            char.id === id
              ? { ...char, ...updates, updatedAt: new Date() }
              : char
          ),
        }));
      },

      deleteCharacter: (id) => {
        if (id === "default") return; // Cannot delete default character

        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
          currentCharacterId:
            state.currentCharacterId === id ? "default" : state.currentCharacterId,
        }));
      },

      setCurrentCharacter: (id) => {
        set({ currentCharacterId: id });
      },

      getCurrentCharacter: () => {
        const state = get();
        return (
          state.characters.find((c) => c.id === state.currentCharacterId) ??
          DEFAULT_CHARACTER
        );
      },

      getCharacter: (id) => {
        return get().characters.find((c) => c.id === id);
      },
    }),
    {
      name: "codia-character-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        characters: state.characters,
        currentCharacterId: state.currentCharacterId,
      }),
    }
  )
);
