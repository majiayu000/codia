/**
 * Proactive Interaction Engine
 * 主动交互引擎 - 管理 AI 主动发起对话的逻辑
 */

import type {
  ProactiveEngineConfig,
  ProactiveEngineState,
  ProactiveMessage,
  ProactiveScenario,
  TriggerCondition,
} from "./types";
import { DEFAULT_PROACTIVE_CONFIG } from "./types";
import { getScenarioTemplate, generateMessageFromTemplate } from "./scenarios";

type EventType = "messageReady" | "messageSent" | "messageDismissed" | "error";
type EventCallback = (data: unknown) => void;

/**
 * Proactive Interaction Engine
 */
export class ProactiveEngine {
  private config: ProactiveEngineConfig;
  private state: ProactiveEngineState;
  private triggers: Map<ProactiveScenario, TriggerCondition> = new Map();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private lastActivityTime: Date = new Date();
  private eventListeners: Map<EventType, Set<EventCallback>> = new Map();

  constructor(config: Partial<ProactiveEngineConfig> = {}) {
    this.config = { ...DEFAULT_PROACTIVE_CONFIG, ...config };
    this.state = this.createInitialState();

    // Initialize event listener maps
    this.eventListeners.set("messageReady", new Set());
    this.eventListeners.set("messageSent", new Set());
    this.eventListeners.set("messageDismissed", new Set());
    this.eventListeners.set("error", new Set());
  }

  // ================== Engine Control ==================

  /**
   * Start the proactive engine
   */
  start(): void {
    if (!this.config.enabled) {
      return;
    }

    if (this.state.isRunning) {
      return;
    }

    this.state.isRunning = true;
    this.lastActivityTime = new Date();

    // Start periodic checks
    this.checkInterval = setInterval(() => {
      this.runCheck();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop the proactive engine
   */
  stop(): void {
    this.state.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get current engine state
   */
  getState(): ProactiveEngineState {
    return { ...this.state };
  }

  // ================== Trigger Management ==================

  /**
   * Register a trigger condition for a scenario
   */
  registerTrigger(scenario: ProactiveScenario, condition: TriggerCondition): void {
    this.triggers.set(scenario, condition);
  }

  /**
   * Unregister a trigger
   */
  unregisterTrigger(scenario: ProactiveScenario): void {
    this.triggers.delete(scenario);
  }

  /**
   * Get all registered triggers
   */
  getTriggers(): Array<{ scenario: ProactiveScenario; condition: TriggerCondition }> {
    const result: Array<{ scenario: ProactiveScenario; condition: TriggerCondition }> = [];
    this.triggers.forEach((condition, scenario) => {
      result.push({ scenario, condition });
    });
    return result;
  }

  // ================== Event Handling ==================

  /**
   * Register event listener
   */
  on(event: EventType, callback: EventCallback): void {
    this.eventListeners.get(event)?.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: EventType, callback: EventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit(event: EventType, data: unknown): void {
    this.eventListeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    });
  }

  // ================== Scenario Triggering ==================

  /**
   * Manually trigger a specific scenario
   */
  triggerScenario(scenario: ProactiveScenario): boolean {
    // Check if scenario is enabled
    if (!this.config.enabledScenarios.includes(scenario)) {
      return false;
    }

    // Check daily limit
    this.updateDayCount();
    if (this.state.messagesSentToday >= this.config.maxMessagesPerDay) {
      return false;
    }

    // Check cooldown
    const trigger = this.triggers.get(scenario);
    if (trigger && trigger.lastTriggered) {
      const timeSinceLastTrigger = Date.now() - trigger.lastTriggered.getTime();
      if (timeSinceLastTrigger < trigger.cooldownMs) {
        return false;
      }
    }

    // Generate message
    const message = this.generateMessage(scenario);
    this.state.pendingMessage = message;
    this.state.activeScenario = scenario;

    // Emit event
    this.emit("messageReady", message);

    return true;
  }

  /**
   * Trigger a memory-based follow-up
   */
  triggerMemoryFollowUp(context: {
    memoryId: string;
    memoryContent: string;
    daysSince: number;
  }): boolean {
    if (!this.config.enabledScenarios.includes("memory_follow_up")) {
      return false;
    }

    const message = this.generateMessage("memory_follow_up", {
      memoryContent: context.memoryContent,
      daysSince: context.daysSince,
    });

    message.relatedMemories = [context.memoryId];

    this.state.pendingMessage = message;
    this.state.activeScenario = "memory_follow_up";

    this.emit("messageReady", message);

    return true;
  }

  /**
   * Confirm message was sent
   */
  confirmMessageSent(): void {
    if (this.state.pendingMessage) {
      const message = this.state.pendingMessage;

      // Update trigger last triggered time
      if (this.state.activeScenario) {
        const trigger = this.triggers.get(this.state.activeScenario);
        if (trigger) {
          trigger.lastTriggered = new Date();
        }
      }

      // Update state
      this.state.messagesSentToday++;
      this.state.lastMessageSent = new Date();
      this.state.pendingMessage = null;
      this.state.activeScenario = null;

      this.emit("messageSent", message);
    }
  }

  /**
   * Dismiss pending message without sending
   */
  dismissMessage(): void {
    if (this.state.pendingMessage) {
      const message = this.state.pendingMessage;
      this.state.pendingMessage = null;
      this.state.activeScenario = null;

      this.emit("messageDismissed", message);
    }
  }

  /**
   * Get pending message
   */
  getPendingMessage(): ProactiveMessage | null {
    return this.state.pendingMessage;
  }

  // ================== Activity Tracking ==================

  /**
   * Record user activity
   */
  recordActivity(): void {
    this.lastActivityTime = new Date();
  }

  /**
   * Get last activity time
   */
  getLastActivityTime(): Date {
    return this.lastActivityTime;
  }

  /**
   * Check if user is idle
   */
  isIdle(thresholdMs: number): boolean {
    const timeSinceActivity = Date.now() - this.lastActivityTime.getTime();
    return timeSinceActivity >= thresholdMs;
  }

  // ================== Checking Logic ==================

  /**
   * Run a check cycle and potentially trigger a message
   */
  checkAndTrigger(): boolean {
    // Check quiet hours
    if (this.isQuietHours()) {
      return false;
    }

    // Check daily limit
    this.updateDayCount();
    if (this.state.messagesSentToday >= this.config.maxMessagesPerDay) {
      return false;
    }

    // Check each trigger
    for (const [scenario, condition] of this.triggers) {
      if (this.shouldTrigger(condition)) {
        return this.triggerScenario(scenario);
      }
    }

    return false;
  }

  /**
   * Internal check method called by interval
   */
  private runCheck(): void {
    this.state.lastCheck = new Date();
    this.checkAndTrigger();
  }

  private shouldTrigger(condition: TriggerCondition): boolean {
    if (!condition.enabled) {
      return false;
    }

    // Check cooldown
    if (condition.lastTriggered) {
      const timeSinceLast = Date.now() - condition.lastTriggered.getTime();
      if (timeSinceLast < condition.cooldownMs) {
        return false;
      }
    }

    // Check condition based on type
    switch (condition.type) {
      case "time_based":
        return this.checkTimeCondition(condition);
      case "idle_timeout":
        return this.checkIdleCondition(condition);
      default:
        return false;
    }
  }

  private checkTimeCondition(condition: TriggerCondition): boolean {
    if (condition.params.type !== "time_based") return false;

    const now = new Date();
    const currentHour = now.getHours();

    return condition.params.hours.includes(currentHour);
  }

  private checkIdleCondition(condition: TriggerCondition): boolean {
    if (condition.params.type !== "idle_timeout") return false;

    return this.isIdle(condition.params.timeoutMs);
  }

  private isQuietHours(): boolean {
    const currentHour = new Date().getHours();
    const { start, end } = this.config.quietHours;

    // Handle overnight quiet hours (e.g., 22-8)
    if (start > end) {
      return currentHour >= start || currentHour < end;
    }

    return currentHour >= start && currentHour < end;
  }

  private updateDayCount(): void {
    const today = new Date().toISOString().split("T")[0];
    if (this.state.currentDate !== today) {
      this.state.currentDate = today;
      this.state.messagesSentToday = 0;
    }
  }

  // ================== Message Generation ==================

  private generateMessage(
    scenario: ProactiveScenario,
    context?: Record<string, unknown>
  ): ProactiveMessage {
    const template = getScenarioTemplate(scenario);
    const content = generateMessageFromTemplate(template, context);

    return {
      id: crypto.randomUUID(),
      scenario,
      triggerType: template.triggerType,
      content,
      priority: template.priority,
      expression: template.expressions[Math.floor(Math.random() * template.expressions.length)],
      waitForResponse: true,
    };
  }

  private createInitialState(): ProactiveEngineState {
    return {
      isRunning: false,
      lastCheck: null,
      lastMessageSent: null,
      messagesSentToday: 0,
      currentDate: new Date().toISOString().split("T")[0],
      pendingMessage: null,
      activeScenario: null,
    };
  }
}

/**
 * Factory function
 */
export function createProactiveEngine(
  config?: Partial<ProactiveEngineConfig>
): ProactiveEngine {
  return new ProactiveEngine(config);
}

// Singleton
let defaultInstance: ProactiveEngine | null = null;

export function getProactiveEngine(): ProactiveEngine {
  if (!defaultInstance) {
    defaultInstance = new ProactiveEngine();
  }
  return defaultInstance;
}

export function resetProactiveEngine(): void {
  if (defaultInstance) {
    defaultInstance.stop();
  }
  defaultInstance = null;
}
