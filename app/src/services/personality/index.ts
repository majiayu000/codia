/**
 * Personality System Module
 * 自适应人格系统模块
 */

export * from "./types";
export {
  PersonalityModel,
  createPersonalityModel,
  getPersonalityModel,
  resetPersonalityModel,
  type PersonalityModelOptions,
} from "./personalityModel";
export {
  AdaptationEngine,
  createAdaptationEngine,
  getAdaptationEngine,
  resetAdaptationEngine,
  type Interaction,
  type UserMessageInteraction,
  type AIResponseInteraction,
  type EmotionalReactionInteraction,
  type UserFeedback,
  type FeedbackType,
  type InteractionStats,
  type AdaptationEngineConfig,
} from "./adaptationEngine";
export {
  PromptGenerator,
  createPromptGenerator,
  getPromptGenerator,
  resetPromptGenerator,
  type PromptGeneratorConfig,
} from "./promptGenerator";
