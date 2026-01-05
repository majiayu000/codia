/**
 * Proactive Interaction System Types
 * 主动交互系统类型定义
 */

/**
 * Types of proactive triggers
 * 主动触发类型
 */
export type ProactiveTriggerType =
  | "time_based"      // Time-based greetings (morning, evening)
  | "idle_timeout"    // User has been silent for a while
  | "memory_triggered" // Based on stored memories
  | "emotion_check"   // Check in on user's emotional state
  | "calendar_event"  // Based on important dates
  | "custom";         // Custom triggers

/**
 * Scenario identifiers
 * 场景标识符
 */
export type ProactiveScenario =
  | "morning_greeting"      // 早安问候
  | "evening_greeting"      // 晚安问候
  | "idle_check_in"         // 沉默后关心
  | "memory_follow_up"      // 记忆跟进
  | "birthday_reminder"     // 生日提醒
  | "mood_check"            // 情绪检查
  | "achievement_celebrate" // 成就庆祝
  | "daily_summary"         // 每日总结
  | "custom_reminder";      // 自定义提醒

/**
 * Proactive message configuration
 * 主动消息配置
 */
export interface ProactiveMessage {
  /** Unique identifier */
  id: string;
  /** Scenario type */
  scenario: ProactiveScenario;
  /** Trigger type */
  triggerType: ProactiveTriggerType;
  /** Message content or template */
  content: string;
  /** Priority level (higher = more important) */
  priority: number;
  /** Suggested expression for avatar */
  expression: string;
  /** Whether to wait for response before continuing */
  waitForResponse: boolean;
  /** Related memory IDs (if memory_triggered) */
  relatedMemories?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Trigger condition for proactive messages
 * 主动消息触发条件
 */
export interface TriggerCondition {
  /** Trigger type */
  type: ProactiveTriggerType;
  /** Condition parameters */
  params: TriggerParams;
  /** Whether this condition is enabled */
  enabled: boolean;
  /** Last triggered timestamp */
  lastTriggered?: Date;
  /** Cooldown in milliseconds */
  cooldownMs: number;
}

/**
 * Parameters for different trigger types
 */
export type TriggerParams =
  | TimeBasedParams
  | IdleTimeoutParams
  | MemoryTriggeredParams
  | EmotionCheckParams
  | CalendarEventParams
  | CustomParams;

export interface TimeBasedParams {
  type: "time_based";
  /** Hours (0-23) when to trigger */
  hours: number[];
  /** Days of week (0-6, 0=Sunday) */
  daysOfWeek?: number[];
  /** Timezone offset */
  timezoneOffset?: number;
}

export interface IdleTimeoutParams {
  type: "idle_timeout";
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Minimum messages before checking idle */
  minMessageCount: number;
}

export interface MemoryTriggeredParams {
  type: "memory_triggered";
  /** Memory types to watch */
  memoryTypes: string[];
  /** Days since memory was created */
  daysSinceCreated?: number;
  /** Keywords to match */
  keywords?: string[];
}

export interface EmotionCheckParams {
  type: "emotion_check";
  /** Check after negative emotion */
  afterNegativeEmotion: boolean;
  /** Delay after emotion detected (ms) */
  delayMs: number;
}

export interface CalendarEventParams {
  type: "calendar_event";
  /** Days before event to trigger */
  daysBefore: number;
  /** Event types to watch */
  eventTypes: string[];
}

export interface CustomParams {
  type: "custom";
  /** Custom condition function name */
  conditionFn: string;
  /** Custom parameters */
  data: Record<string, unknown>;
}

/**
 * Proactive engine configuration
 * 主动引擎配置
 */
export interface ProactiveEngineConfig {
  /** Enable/disable proactive messages */
  enabled: boolean;
  /** Check interval in milliseconds */
  checkIntervalMs: number;
  /** Maximum messages per day */
  maxMessagesPerDay: number;
  /** Quiet hours (don't send during these hours) */
  quietHours: { start: number; end: number };
  /** Default cooldown between messages (ms) */
  defaultCooldownMs: number;
  /** Enabled scenarios */
  enabledScenarios: ProactiveScenario[];
}

/**
 * Default configuration
 */
export const DEFAULT_PROACTIVE_CONFIG: ProactiveEngineConfig = {
  enabled: true,
  checkIntervalMs: 60000, // Check every minute
  maxMessagesPerDay: 5,
  quietHours: { start: 22, end: 8 }, // 10 PM to 8 AM
  defaultCooldownMs: 1800000, // 30 minutes between messages
  enabledScenarios: [
    "morning_greeting",
    "evening_greeting",
    "idle_check_in",
    "memory_follow_up",
    "mood_check",
  ],
};

/**
 * Proactive engine state
 */
export interface ProactiveEngineState {
  /** Is the engine running */
  isRunning: boolean;
  /** Last check timestamp */
  lastCheck: Date | null;
  /** Last message sent timestamp */
  lastMessageSent: Date | null;
  /** Messages sent today */
  messagesSentToday: number;
  /** Current date for counting */
  currentDate: string;
  /** Pending message (if any) */
  pendingMessage: ProactiveMessage | null;
  /** Active scenario being processed */
  activeScenario: ProactiveScenario | null;
}

/**
 * Event types for proactive engine
 */
export interface ProactiveEngineEvents {
  onMessageReady: (message: ProactiveMessage) => void;
  onMessageSent: (message: ProactiveMessage) => void;
  onMessageDismissed: (message: ProactiveMessage) => void;
  onError: (error: Error) => void;
}

/**
 * Scenario template
 */
export interface ScenarioTemplate {
  scenario: ProactiveScenario;
  triggerType: ProactiveTriggerType;
  defaultCondition: TriggerCondition;
  messageTemplates: string[];
  expressions: string[];
  priority: number;
}
