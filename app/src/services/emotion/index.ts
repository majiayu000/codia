/**
 * Emotion System Module
 * 情感系统模块
 */

export * from "./types";
export {
  EmotionAnalyzer,
  createEmotionAnalyzer,
  getEmotionAnalyzer,
  resetEmotionAnalyzer,
  mapToBasicExpression,
} from "./emotionAnalyzer";
export {
  ResponseStrategyEngine,
  createResponseStrategyEngine,
  getResponseStrategyEngine,
  resetResponseStrategyEngine,
  type ResponseStrategyConfig,
} from "./responseStrategy";
