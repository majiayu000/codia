"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { MainLayout } from "@/components/layout";
import { MessageList, ChatInput, type Message } from "@/components/chat";
import { SettingsPanel } from "@/components/settings";
import { useToast } from "@/components/ui";
import { GesturePanel } from "@/components/ui/GesturePanel";
import {
  useChatStore,
  useCharacterStore,
  useSettingsStore,
  useUIStore,
} from "@/store";
import {
  streamChatWithMemory,
  startListening,
  stopListening,
  isASRSupported,
  type BasicExpression,
  type GestureType,
} from "@/services";
import type { GestureController } from "@/components/canvas";

const CanvasContainer = dynamic(
  () => import("@/components/canvas").then((mod) => mod.CanvasContainer),
  { ssr: false }
);

export default function Home() {
  const [expression, setExpression] = useState<BasicExpression>("neutral");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState("");
  const [gestureController, setGestureController] = useState<GestureController | null>(null);

  const { addToast } = useToast();

  // Stores
  const chatStore = useChatStore();
  const characterStore = useCharacterStore();
  const settingsStore = useSettingsStore();
  const uiStore = useUIStore();

  // Initialize conversation on mount
  useEffect(() => {
    if (!chatStore.currentConversationId) {
      chatStore.createConversation(characterStore.currentCharacterId);
    }
  }, [chatStore, characterStore.currentCharacterId]);

  const messages = chatStore.getCurrentMessages();
  const currentCharacter = characterStore.getCurrentCharacter();

  const handleSend = useCallback(
    async (content: string) => {
      if (!chatStore.currentConversationId) return;

      // Add user message
      chatStore.addMessage(chatStore.currentConversationId, {
        role: "user",
        content,
      });

      uiStore.setLoadingState("streaming");

      try {
        let assistantContent = "";

        // Create placeholder message
        const assistantId = crypto.randomUUID();
        chatStore.addMessage(chatStore.currentConversationId, {
          role: "assistant",
          content: "",
        });

        // Stream response with memory injection + emotion-aware strategy
        const allMessages = chatStore.getCurrentMessages();
        const generator = streamChatWithMemory(
          allMessages.slice(0, -1), // Exclude placeholder
          currentCharacter.systemPrompt,
          {
            provider: settingsStore.llmProvider,
            model: settingsStore.llmModel,
            enableMemory: settingsStore.memoryEnabled,
            extractMemoryAfterResponse: settingsStore.memoryEnabled,
            enableEmotionAnalysis: settingsStore.emotionEnabled,
            applyResponseStrategy: settingsStore.emotionEnabled,
          }
        );

        let streamResult = await generator.next();
        while (!streamResult.done) {
          assistantContent += streamResult.value;

          // Update the last message with accumulated content
          const msgs = chatStore.getCurrentMessages();
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            chatStore.updateMessage(
              chatStore.currentConversationId!,
              lastMsg.id,
              assistantContent
            );
          }
          streamResult = await generator.next();
        }

        // Set expression based on response; sync memory context into chat store
        if (streamResult.value.emotion) {
          setExpression(streamResult.value.emotion);
        }
        if (streamResult.value.memoryContext) {
          chatStore.setMemoryContext(streamResult.value.memoryContext);
        }

        // Trigger speaking animation
        setIsSpeaking(true);
        setSpeakingText(assistantContent);
        setTimeout(() => {
          setIsSpeaking(false);
          setSpeakingText("");
          setExpression("neutral");
        }, Math.min(assistantContent.length * 50, 5000));

        uiStore.setLoadingState("idle");
      } catch (error) {
        uiStore.setError(
          error instanceof Error ? error.message : "Failed to get response"
        );
        addToast({
          type: "error",
          title: "Failed to send message",
          message: "Please check your API key and try again.",
        });
      }
    },
    [
      chatStore,
      currentCharacter.systemPrompt,
      settingsStore.llmProvider,
      settingsStore.llmModel,
      settingsStore.memoryEnabled,
      settingsStore.emotionEnabled,
      uiStore,
      addToast,
    ]
  );

  const handleVoiceStart = useCallback(() => {
    if (!isASRSupported()) {
      addToast({
        type: "warning",
        title: "Voice input not supported",
        message: "Your browser doesn't support speech recognition.",
      });
      return;
    }

    uiStore.setRecording(true);

    startListening({
      onResult: (result) => {
        if (result.isFinal && result.transcript.trim()) {
          handleSend(result.transcript.trim());
          stopListening();
          uiStore.setRecording(false);
        }
      },
      onError: (error) => {
        addToast({
          type: "error",
          title: "Voice input error",
          message: error.message,
        });
        uiStore.setRecording(false);
      },
      onEnd: () => {
        uiStore.setRecording(false);
      },
    });
  }, [addToast, handleSend, uiStore]);

  const handleVoiceEnd = useCallback(() => {
    stopListening();
    uiStore.setRecording(false);
  }, [uiStore]);

  return (
    <MainLayout>
      <div className="flex h-full flex-col lg:flex-row">
        {/* 3D Canvas Section */}
        <div className="relative h-[40vh] lg:h-full lg:w-1/2 xl:w-2/5 p-4">
          <CanvasContainer
            className="h-full"
            vrmUrl={currentCharacter.vrmUrl || "/sample.vrm"}
            expression={expression}
            isSpeaking={isSpeaking}
            speakingText={speakingText}
            onGestureReady={setGestureController}
          />
          {/* Gesture Test Panel */}
          {gestureController && (
            <GesturePanel
              onGesture={(gesture) => gestureController.playGesture(gesture)}
              disabled={gestureController.isPlaying()}
            />
          )}
        </div>

        {/* Chat Section */}
        <div className="flex flex-1 flex-col lg:w-1/2 xl:w-3/5 border-t lg:border-t-0 lg:border-l border-[var(--border-default)]">
          <MessageList
            messages={messages
              .filter((m) => m.role !== "system")
              .map((m) => ({
                ...m,
                role: m.role as "user" | "assistant",
                timestamp: new Date(m.timestamp),
              }))}
            isTyping={uiStore.loadingState === "streaming"}
          />
          <ChatInput
            onSend={handleSend}
            onVoiceStart={settingsStore.asrEnabled ? handleVoiceStart : undefined}
            onVoiceEnd={handleVoiceEnd}
            isLoading={uiStore.loadingState === "streaming"}
            isRecording={uiStore.isRecording}
          />
        </div>
      </div>

      <SettingsPanel
        isOpen={uiStore.isSettingsOpen}
        onClose={() => uiStore.setSettingsOpen(false)}
      />
    </MainLayout>
  );
}
