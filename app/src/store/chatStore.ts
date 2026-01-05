import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Message, Conversation } from "./types";

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isStreaming: boolean;

  // Actions
  createConversation: (characterId: string) => string;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Omit<Message, "id" | "timestamp">) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  clearMessages: (conversationId: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  getCurrentMessages: () => Message[];
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isStreaming: false,

      createConversation: (characterId: string) => {
        const id = crypto.randomUUID();
        const now = new Date();
        const conversation: Conversation = {
          id,
          title: "New Conversation",
          messages: [],
          characterId,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: id,
        }));

        return id;
      },

      deleteConversation: (id: string) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId:
            state.currentConversationId === id
              ? state.conversations[0]?.id ?? null
              : state.currentConversationId,
        }));
      },

      setCurrentConversation: (id: string | null) => {
        set({ currentConversationId: id });
      },

      addMessage: (conversationId: string, message: Omit<Message, "id" | "timestamp">) => {
        const newMessage: Message = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        };

        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, newMessage],
                  updatedAt: new Date(),
                  title:
                    conv.messages.length === 0 && message.role === "user"
                      ? message.content.slice(0, 50)
                      : conv.title,
                }
              : conv
          ),
        }));
      },

      updateMessage: (conversationId: string, messageId: string, content: string) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, content } : msg
                  ),
                  updatedAt: new Date(),
                }
              : conv
          ),
        }));
      },

      clearMessages: (conversationId: string) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, messages: [], updatedAt: new Date() }
              : conv
          ),
        }));
      },

      setStreaming: (isStreaming: boolean) => {
        set({ isStreaming });
      },

      getCurrentMessages: () => {
        const state = get();
        const conversation = state.conversations.find(
          (c) => c.id === state.currentConversationId
        );
        return conversation?.messages ?? [];
      },
    }),
    {
      name: "codia-chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
    }
  )
);
