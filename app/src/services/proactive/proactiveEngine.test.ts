import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ProactiveEngine,
  createProactiveEngine,
  getProactiveEngine,
  resetProactiveEngine,
} from "./proactiveEngine";
import type {
  ProactiveMessage,
  ProactiveScenario,
  TriggerCondition,
  ProactiveEngineConfig,
} from "./types";

describe("ProactiveEngine", () => {
  let engine: ProactiveEngine;
  let mockCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00"));
    mockCallback = vi.fn();
    engine = new ProactiveEngine();
    resetProactiveEngine();
  });

  afterEach(() => {
    engine.stop();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const e = new ProactiveEngine();
      expect(e).toBeDefined();
      expect(e.getState().isRunning).toBe(false);
    });

    it("should create with custom config", () => {
      const e = new ProactiveEngine({
        enabled: false,
        maxMessagesPerDay: 3,
      });
      expect(e).toBeDefined();
    });
  });

  describe("start/stop", () => {
    it("should start the engine", () => {
      engine.start();
      expect(engine.getState().isRunning).toBe(true);
    });

    it("should stop the engine", () => {
      engine.start();
      engine.stop();
      expect(engine.getState().isRunning).toBe(false);
    });

    it("should not start if disabled", () => {
      const disabledEngine = new ProactiveEngine({ enabled: false });
      disabledEngine.start();
      expect(disabledEngine.getState().isRunning).toBe(false);
    });

    it("should run periodic checks when started", () => {
      const checkSpy = vi.spyOn(engine as any, "runCheck");
      engine.start();

      // Advance time by check interval
      vi.advanceTimersByTime(60000);

      expect(checkSpy).toHaveBeenCalled();
    });
  });

  describe("registerTrigger", () => {
    it("should register a time-based trigger", () => {
      const trigger: TriggerCondition = {
        type: "time_based",
        params: {
          type: "time_based",
          hours: [8, 9],
        },
        enabled: true,
        cooldownMs: 3600000,
      };

      engine.registerTrigger("morning_greeting", trigger);
      expect(engine.getTriggers()).toHaveLength(1);
    });

    it("should register an idle timeout trigger", () => {
      const trigger: TriggerCondition = {
        type: "idle_timeout",
        params: {
          type: "idle_timeout",
          timeoutMs: 1800000,
          minMessageCount: 3,
        },
        enabled: true,
        cooldownMs: 3600000,
      };

      engine.registerTrigger("idle_check_in", trigger);
      expect(engine.getTriggers()).toHaveLength(1);
    });

    it("should unregister a trigger", () => {
      const trigger: TriggerCondition = {
        type: "time_based",
        params: { type: "time_based", hours: [8] },
        enabled: true,
        cooldownMs: 3600000,
      };

      engine.registerTrigger("morning_greeting", trigger);
      expect(engine.getTriggers()).toHaveLength(1);

      engine.unregisterTrigger("morning_greeting");
      expect(engine.getTriggers()).toHaveLength(0);
    });
  });

  describe("event callbacks", () => {
    it("should call onMessageReady when message is triggered", () => {
      engine.on("messageReady", mockCallback);

      // Manually trigger a message
      engine.triggerScenario("idle_check_in");

      expect(mockCallback).toHaveBeenCalled();
      const message = mockCallback.mock.calls[0][0] as ProactiveMessage;
      expect(message.scenario).toBe("idle_check_in");
    });

    it("should call onMessageSent after sending", () => {
      engine.on("messageSent", mockCallback);

      engine.triggerScenario("morning_greeting");
      engine.confirmMessageSent();

      expect(mockCallback).toHaveBeenCalled();
    });

    it("should call onMessageDismissed when dismissed", () => {
      engine.on("messageDismissed", mockCallback);

      engine.triggerScenario("morning_greeting");
      engine.dismissMessage();

      expect(mockCallback).toHaveBeenCalled();
    });

    it("should remove event listener", () => {
      engine.on("messageReady", mockCallback);
      engine.off("messageReady", mockCallback);

      engine.triggerScenario("idle_check_in");

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("triggerScenario", () => {
    it("should generate morning greeting message", () => {
      engine.on("messageReady", mockCallback);
      engine.triggerScenario("morning_greeting");

      const message = mockCallback.mock.calls[0][0] as ProactiveMessage;
      expect(message.scenario).toBe("morning_greeting");
      expect(message.content).toBeTruthy();
    });

    it("should generate evening greeting message", () => {
      engine.on("messageReady", mockCallback);
      engine.triggerScenario("evening_greeting");

      const message = mockCallback.mock.calls[0][0] as ProactiveMessage;
      expect(message.scenario).toBe("evening_greeting");
    });

    it("should generate idle check-in message", () => {
      engine.on("messageReady", mockCallback);
      engine.triggerScenario("idle_check_in");

      const message = mockCallback.mock.calls[0][0] as ProactiveMessage;
      expect(message.scenario).toBe("idle_check_in");
    });

    it("should generate mood check message", () => {
      engine.on("messageReady", mockCallback);
      engine.triggerScenario("mood_check");

      const message = mockCallback.mock.calls[0][0] as ProactiveMessage;
      expect(message.scenario).toBe("mood_check");
    });

    it("should not trigger disabled scenarios", () => {
      const restrictedEngine = new ProactiveEngine({
        enabledScenarios: ["morning_greeting"],
      });
      restrictedEngine.on("messageReady", mockCallback);

      restrictedEngine.triggerScenario("idle_check_in");

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("quiet hours", () => {
    it("should not trigger during quiet hours", () => {
      // Set time to 11 PM (within quiet hours 22-8)
      vi.setSystemTime(new Date("2024-01-15T23:00:00"));

      engine.on("messageReady", mockCallback);

      const result = engine.checkAndTrigger();

      expect(result).toBe(false);
    });

    it("should trigger outside quiet hours", () => {
      // Set time to 10 AM (outside quiet hours)
      vi.setSystemTime(new Date("2024-01-15T10:00:00"));

      engine.on("messageReady", mockCallback);

      // Register a time-based trigger for 10 AM
      engine.registerTrigger("morning_greeting", {
        type: "time_based",
        params: { type: "time_based", hours: [10] },
        enabled: true,
        cooldownMs: 3600000,
      });

      const result = engine.checkAndTrigger();

      // Should have triggered since it's 10 AM and we have a 10 AM trigger
      expect(result).toBe(true);
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe("daily message limit", () => {
    it("should respect max messages per day", () => {
      const limitedEngine = new ProactiveEngine({
        maxMessagesPerDay: 2,
      });

      limitedEngine.on("messageReady", mockCallback);

      // Send max messages
      limitedEngine.triggerScenario("morning_greeting");
      limitedEngine.confirmMessageSent();
      limitedEngine.triggerScenario("idle_check_in");
      limitedEngine.confirmMessageSent();

      // Try to send one more
      const result = limitedEngine.triggerScenario("mood_check");

      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it("should reset count on new day", () => {
      const limitedEngine = new ProactiveEngine({
        maxMessagesPerDay: 1,
      });

      limitedEngine.on("messageReady", mockCallback);

      // Send max messages
      limitedEngine.triggerScenario("morning_greeting");
      limitedEngine.confirmMessageSent();

      // Advance to next day
      vi.setSystemTime(new Date("2024-01-16T10:00:00"));

      // Should be able to send again
      const result = limitedEngine.triggerScenario("morning_greeting");

      expect(result).toBe(true);
    });
  });

  describe("cooldown", () => {
    it("should respect trigger cooldown", () => {
      engine.registerTrigger("morning_greeting", {
        type: "time_based",
        params: { type: "time_based", hours: [10] },
        enabled: true,
        cooldownMs: 3600000, // 1 hour cooldown
      });

      engine.on("messageReady", mockCallback);

      // First trigger should work
      engine.triggerScenario("morning_greeting");
      engine.confirmMessageSent();
      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Second trigger within cooldown should fail
      vi.advanceTimersByTime(1800000); // 30 minutes
      const result = engine.triggerScenario("morning_greeting");

      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it("should trigger after cooldown expires", () => {
      engine.registerTrigger("morning_greeting", {
        type: "time_based",
        params: { type: "time_based", hours: [10, 11] },
        enabled: true,
        cooldownMs: 1800000, // 30 minutes cooldown
      });

      engine.on("messageReady", mockCallback);

      // First trigger
      engine.triggerScenario("morning_greeting");
      engine.confirmMessageSent();

      // Wait for cooldown
      vi.advanceTimersByTime(1800001);

      // Should be able to trigger again
      const result = engine.triggerScenario("morning_greeting");

      expect(result).toBe(true);
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe("idle timeout detection", () => {
    it("should report last activity time", () => {
      const now = new Date();
      engine.recordActivity();

      expect(engine.getLastActivityTime()).toEqual(now);
    });

    it("should detect idle state", () => {
      engine.recordActivity();

      // Advance time by 30 minutes
      vi.advanceTimersByTime(1800000);

      expect(engine.isIdle(1800000)).toBe(true);
    });

    it("should not be idle if active recently", () => {
      engine.recordActivity();

      // Advance time by 10 minutes
      vi.advanceTimersByTime(600000);

      expect(engine.isIdle(1800000)).toBe(false);
    });
  });

  describe("memory-triggered messages", () => {
    it("should accept memory context for follow-up", () => {
      engine.on("messageReady", mockCallback);

      engine.triggerMemoryFollowUp({
        memoryId: "mem-123",
        memoryContent: "User mentioned job interview next week",
        daysSince: 7,
      });

      expect(mockCallback).toHaveBeenCalled();
      const message = mockCallback.mock.calls[0][0] as ProactiveMessage;
      expect(message.scenario).toBe("memory_follow_up");
      expect(message.relatedMemories).toContain("mem-123");
    });
  });

  describe("getState", () => {
    it("should return current engine state", () => {
      const state = engine.getState();

      expect(state.isRunning).toBe(false);
      expect(state.messagesSentToday).toBe(0);
      expect(state.pendingMessage).toBeNull();
    });

    it("should update state after actions", () => {
      engine.start();
      engine.triggerScenario("morning_greeting");
      engine.confirmMessageSent();

      const state = engine.getState();

      expect(state.isRunning).toBe(true);
      expect(state.messagesSentToday).toBe(1);
      expect(state.lastMessageSent).toBeTruthy();
    });
  });

  describe("getPendingMessage", () => {
    it("should return pending message", () => {
      engine.triggerScenario("morning_greeting");

      const pending = engine.getPendingMessage();

      expect(pending).toBeTruthy();
      expect(pending?.scenario).toBe("morning_greeting");
    });

    it("should return null when no pending message", () => {
      expect(engine.getPendingMessage()).toBeNull();
    });

    it("should clear pending after confirmation", () => {
      engine.triggerScenario("morning_greeting");
      engine.confirmMessageSent();

      expect(engine.getPendingMessage()).toBeNull();
    });
  });
});

describe("createProactiveEngine", () => {
  it("should create engine via factory function", () => {
    const e = createProactiveEngine();
    expect(e).toBeInstanceOf(ProactiveEngine);
  });

  it("should pass config to engine", () => {
    const e = createProactiveEngine({
      maxMessagesPerDay: 3,
    });
    expect(e).toBeInstanceOf(ProactiveEngine);
  });
});

describe("getProactiveEngine", () => {
  beforeEach(() => {
    resetProactiveEngine();
  });

  it("should return singleton instance", () => {
    const e1 = getProactiveEngine();
    const e2 = getProactiveEngine();
    expect(e1).toBe(e2);
  });

  it("should reset singleton instance", () => {
    const e1 = getProactiveEngine();
    resetProactiveEngine();
    const e2 = getProactiveEngine();
    expect(e1).not.toBe(e2);
  });
});
