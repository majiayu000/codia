/**
 * Proactive Interaction Scenarios
 * 主动交互场景模板
 */

import type { ProactiveScenario, ScenarioTemplate } from "./types";

/**
 * Scenario templates for different proactive message types
 */
const SCENARIO_TEMPLATES: Record<ProactiveScenario, ScenarioTemplate> = {
  morning_greeting: {
    scenario: "morning_greeting",
    triggerType: "time_based",
    defaultCondition: {
      type: "time_based",
      params: { type: "time_based", hours: [8, 9] },
      enabled: true,
      cooldownMs: 86400000, // Once per day
    },
    messageTemplates: [
      "早上好！新的一天开始了，今天有什么计划吗？",
      "早安！希望你今天有个好心情~",
      "Good morning! Ready to start a new day?",
      "早上好呀！昨晚休息得怎么样？",
      "新的一天，新的开始！早上好~",
    ],
    expressions: ["happy", "cheerful"],
    priority: 3,
  },

  evening_greeting: {
    scenario: "evening_greeting",
    triggerType: "time_based",
    defaultCondition: {
      type: "time_based",
      params: { type: "time_based", hours: [21, 22] },
      enabled: true,
      cooldownMs: 86400000,
    },
    messageTemplates: [
      "今天辛苦了！准备休息了吗？",
      "晚上好，今天过得怎么样？",
      "一天快结束了，有什么想分享的吗？",
      "Good evening! How was your day?",
      "今天有什么开心的事吗？",
    ],
    expressions: ["relaxed", "happy"],
    priority: 2,
  },

  idle_check_in: {
    scenario: "idle_check_in",
    triggerType: "idle_timeout",
    defaultCondition: {
      type: "idle_timeout",
      params: { type: "idle_timeout", timeoutMs: 1800000, minMessageCount: 3 },
      enabled: true,
      cooldownMs: 3600000, // 1 hour cooldown
    },
    messageTemplates: [
      "你还在吗？有什么我能帮到你的吗？",
      "好久没聊了，最近在忙什么呢？",
      "嗨，一切还好吗？",
      "我在这里，随时可以聊天哦~",
      "有点想念和你聊天了~",
    ],
    expressions: ["curious", "concerned"],
    priority: 1,
  },

  memory_follow_up: {
    scenario: "memory_follow_up",
    triggerType: "memory_triggered",
    defaultCondition: {
      type: "memory_triggered",
      params: { type: "memory_triggered", memoryTypes: ["event", "fact"] },
      enabled: true,
      cooldownMs: 86400000,
    },
    messageTemplates: [
      "对了，你之前提到的{memoryContent}，进展怎么样了？",
      "我记得你说过{memoryContent}，最近有什么更新吗？",
      "话说你{daysSince}天前提到的那件事，还顺利吗？",
      "想起来你之前说的{memoryContent}，想问问情况如何？",
    ],
    expressions: ["curious", "concerned"],
    priority: 4,
  },

  birthday_reminder: {
    scenario: "birthday_reminder",
    triggerType: "calendar_event",
    defaultCondition: {
      type: "calendar_event",
      params: { type: "calendar_event", daysBefore: 0, eventTypes: ["birthday"] },
      enabled: true,
      cooldownMs: 86400000,
    },
    messageTemplates: [
      "生日快乐！🎂 希望你今天过得开心！",
      "今天是特别的日子！生日快乐！",
      "Happy Birthday! 愿你所有的愿望都能实现！",
    ],
    expressions: ["excited", "happy"],
    priority: 5,
  },

  mood_check: {
    scenario: "mood_check",
    triggerType: "emotion_check",
    defaultCondition: {
      type: "emotion_check",
      params: { type: "emotion_check", afterNegativeEmotion: true, delayMs: 3600000 },
      enabled: true,
      cooldownMs: 7200000, // 2 hours
    },
    messageTemplates: [
      "我注意到你之前似乎心情不太好，现在感觉怎么样？",
      "想确认一下，你还好吗？有什么想聊的随时告诉我。",
      "希望你现在感觉好一点了。需要聊聊吗？",
      "之前有点担心你，现在怎么样了？",
    ],
    expressions: ["concerned", "supportive"],
    priority: 4,
  },

  achievement_celebrate: {
    scenario: "achievement_celebrate",
    triggerType: "memory_triggered",
    defaultCondition: {
      type: "memory_triggered",
      params: {
        type: "memory_triggered",
        memoryTypes: ["event"],
        keywords: ["completed", "finished", "achieved", "success", "完成", "成功"],
      },
      enabled: true,
      cooldownMs: 86400000,
    },
    messageTemplates: [
      "太棒了！恭喜你完成了这件事！🎉",
      "这真是个好消息！你做得很棒！",
      "为你感到骄傲！继续加油！",
    ],
    expressions: ["excited", "happy"],
    priority: 3,
  },

  daily_summary: {
    scenario: "daily_summary",
    triggerType: "time_based",
    defaultCondition: {
      type: "time_based",
      params: { type: "time_based", hours: [20] },
      enabled: false, // Disabled by default
      cooldownMs: 86400000,
    },
    messageTemplates: [
      "今天我们聊了很多呢，有什么是你觉得最有意思的？",
      "回顾一下今天的对话，有什么新的想法吗？",
    ],
    expressions: ["thinking", "curious"],
    priority: 1,
  },

  custom_reminder: {
    scenario: "custom_reminder",
    triggerType: "custom",
    defaultCondition: {
      type: "custom",
      params: { type: "custom", conditionFn: "", data: {} },
      enabled: true,
      cooldownMs: 0,
    },
    messageTemplates: ["{content}"],
    expressions: ["neutral"],
    priority: 2,
  },
};

/**
 * Get scenario template
 */
export function getScenarioTemplate(scenario: ProactiveScenario): ScenarioTemplate {
  return SCENARIO_TEMPLATES[scenario];
}

/**
 * Get all scenario templates
 */
export function getAllScenarioTemplates(): ScenarioTemplate[] {
  return Object.values(SCENARIO_TEMPLATES);
}

/**
 * Generate message content from template
 */
export function generateMessageFromTemplate(
  template: ScenarioTemplate,
  context?: Record<string, unknown>
): string {
  // Select random template
  const templateStr =
    template.messageTemplates[
      Math.floor(Math.random() * template.messageTemplates.length)
    ];

  // Replace placeholders with context values
  if (context) {
    return templateStr.replace(/\{(\w+)\}/g, (match, key) => {
      return context[key] !== undefined ? String(context[key]) : match;
    });
  }

  // Remove unfilled placeholders
  return templateStr.replace(/\{(\w+)\}/g, "");
}

/**
 * Get default conditions for all scenarios
 */
export function getDefaultConditions(): Map<
  ProactiveScenario,
  ScenarioTemplate["defaultCondition"]
> {
  const conditions = new Map<ProactiveScenario, ScenarioTemplate["defaultCondition"]>();

  for (const [scenario, template] of Object.entries(SCENARIO_TEMPLATES)) {
    conditions.set(scenario as ProactiveScenario, template.defaultCondition);
  }

  return conditions;
}
