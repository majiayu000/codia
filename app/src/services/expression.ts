import { VRM, VRMExpressionPresetName } from "@pixiv/three-vrm";

export type BasicExpression =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "relaxed";

export interface ExpressionState {
  current: BasicExpression;
  intensity: number;
  blendWeights: Map<VRMExpressionPresetName, number>;
}

const expressionMapping: Record<BasicExpression, VRMExpressionPresetName> = {
  neutral: "neutral",
  happy: "happy",
  sad: "sad",
  angry: "angry",
  surprised: "surprised",
  relaxed: "relaxed",
};

export function getExpressionWeight(expression: BasicExpression): number {
  return expression === "neutral" ? 0 : 1;
}

export function setExpression(
  vrm: VRM,
  expression: BasicExpression,
  intensity: number = 1.0,
  transitionDuration: number = 0.3
): void {
  if (!vrm.expressionManager) return;

  const targetPreset = expressionMapping[expression];

  // Reset all expressions first
  Object.values(expressionMapping).forEach((preset) => {
    if (preset !== "neutral") {
      vrm.expressionManager?.setValue(preset, 0);
    }
  });

  // Set the target expression
  if (targetPreset !== "neutral") {
    vrm.expressionManager.setValue(targetPreset, intensity);
  }
}

export function blendExpressions(
  vrm: VRM,
  expressions: Partial<Record<BasicExpression, number>>
): void {
  if (!vrm.expressionManager) return;

  // Reset all expressions
  Object.values(expressionMapping).forEach((preset) => {
    if (preset !== "neutral") {
      vrm.expressionManager?.setValue(preset, 0);
    }
  });

  // Apply blended expressions
  Object.entries(expressions).forEach(([expr, weight]) => {
    const preset = expressionMapping[expr as BasicExpression];
    if (preset && preset !== "neutral" && weight !== undefined) {
      vrm.expressionManager?.setValue(preset, Math.min(1, Math.max(0, weight)));
    }
  });
}

export class ExpressionAnimator {
  private vrm: VRM | null = null;
  private currentExpression: BasicExpression = "neutral";
  private targetExpression: BasicExpression = "neutral";
  private currentIntensity: number = 0;
  private targetIntensity: number = 0;
  private transitionProgress: number = 1;
  private transitionDuration: number = 0.3;

  constructor(vrm?: VRM) {
    if (vrm) this.vrm = vrm;
  }

  setVRM(vrm: VRM): void {
    this.vrm = vrm;
  }

  setExpression(expression: BasicExpression, intensity: number = 1.0): void {
    if (expression === this.targetExpression && intensity === this.targetIntensity) {
      return;
    }

    this.targetExpression = expression;
    this.targetIntensity = expression === "neutral" ? 0 : intensity;
    this.transitionProgress = 0;
  }

  update(deltaTime: number): void {
    if (!this.vrm || this.transitionProgress >= 1) return;

    this.transitionProgress = Math.min(
      1,
      this.transitionProgress + deltaTime / this.transitionDuration
    );

    // Ease out cubic
    const t = 1 - Math.pow(1 - this.transitionProgress, 3);

    // Lerp intensity
    this.currentIntensity =
      this.currentIntensity + (this.targetIntensity - this.currentIntensity) * t;

    // Apply expression
    if (this.vrm.expressionManager) {
      // Fade out current expression
      if (this.currentExpression !== "neutral") {
        const currentPreset = expressionMapping[this.currentExpression];
        this.vrm.expressionManager.setValue(
          currentPreset,
          this.currentIntensity * (1 - t)
        );
      }

      // Fade in target expression
      if (this.targetExpression !== "neutral") {
        const targetPreset = expressionMapping[this.targetExpression];
        this.vrm.expressionManager.setValue(
          targetPreset,
          this.targetIntensity * t
        );
      }
    }

    // Update current expression when transition complete
    if (this.transitionProgress >= 1) {
      this.currentExpression = this.targetExpression;
    }
  }

  getCurrentExpression(): BasicExpression {
    return this.currentExpression;
  }
}
