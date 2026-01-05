import { VRM } from "@pixiv/three-vrm";

export interface IdleAnimationConfig {
  breathingSpeed: number;
  breathingIntensity: number;
  blinkInterval: [number, number]; // [min, max] in seconds
  blinkDuration: number;
  microMovementIntensity: number;
  enabled: boolean;
}

const defaultConfig: IdleAnimationConfig = {
  breathingSpeed: 0.5,
  breathingIntensity: 0.02,
  blinkInterval: [2, 6],
  blinkDuration: 0.15,
  microMovementIntensity: 0.002,
  enabled: true,
};

export class IdleAnimationService {
  private vrm: VRM | null = null;
  private config: IdleAnimationConfig;
  private time: number = 0;
  private lastBlinkTime: number = 0;
  private nextBlinkTime: number = 0;
  private isBlinking: boolean = false;
  private blinkProgress: number = 0;

  constructor(vrm?: VRM, config?: Partial<IdleAnimationConfig>) {
    this.vrm = vrm || null;
    this.config = { ...defaultConfig, ...config };
    this.scheduleNextBlink();
  }

  setVRM(vrm: VRM): void {
    this.vrm = vrm;
  }

  setConfig(config: Partial<IdleAnimationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }

  private scheduleNextBlink(): void {
    const [min, max] = this.config.blinkInterval;
    this.nextBlinkTime = this.time + min + Math.random() * (max - min);
  }

  update(deltaTime: number): void {
    if (!this.vrm || !this.config.enabled) return;

    this.time += deltaTime;

    this.updateBreathing(deltaTime);
    this.updateBlink(deltaTime);
    this.updateMicroMovements(deltaTime);
  }

  private updateBreathing(deltaTime: number): void {
    if (!this.vrm?.humanoid) return;

    const spine = this.vrm.humanoid.getNormalizedBoneNode("spine");
    const chest = this.vrm.humanoid.getNormalizedBoneNode("chest");

    if (spine) {
      const breathOffset =
        Math.sin(this.time * this.config.breathingSpeed * Math.PI * 2) *
        this.config.breathingIntensity;

      spine.position.y += breathOffset * 0.5;
    }

    if (chest) {
      const breathOffset =
        Math.sin(this.time * this.config.breathingSpeed * Math.PI * 2) *
        this.config.breathingIntensity;

      chest.position.y += breathOffset;
      chest.rotation.x = breathOffset * 0.5;
    }
  }

  private updateBlink(deltaTime: number): void {
    if (!this.vrm?.expressionManager) return;

    // Check if it's time to blink
    if (!this.isBlinking && this.time >= this.nextBlinkTime) {
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.lastBlinkTime = this.time;
    }

    // Animate blink
    if (this.isBlinking) {
      this.blinkProgress += deltaTime / this.config.blinkDuration;

      if (this.blinkProgress >= 1) {
        this.isBlinking = false;
        this.vrm.expressionManager.setValue("blink", 0);
        this.scheduleNextBlink();
      } else {
        // Ease in-out for smooth blink
        const t = this.blinkProgress;
        const blinkWeight = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        this.vrm.expressionManager.setValue("blink", blinkWeight);
      }
    }
  }

  private updateMicroMovements(deltaTime: number): void {
    if (!this.vrm?.humanoid) return;

    const head = this.vrm.humanoid.getNormalizedBoneNode("head");
    if (head) {
      // Very subtle head movements
      const intensity = this.config.microMovementIntensity;
      head.rotation.x +=
        Math.sin(this.time * 0.7) * intensity +
        Math.sin(this.time * 1.3) * intensity * 0.5;
      head.rotation.y +=
        Math.sin(this.time * 0.5) * intensity +
        Math.cos(this.time * 1.1) * intensity * 0.3;
      head.rotation.z +=
        Math.sin(this.time * 0.3) * intensity * 0.3;
    }
  }

  // Trigger a manual blink
  triggerBlink(): void {
    if (this.isBlinking) return;
    this.isBlinking = true;
    this.blinkProgress = 0;
  }

  // Get current animation state
  getState(): { isBlinking: boolean; breathPhase: number } {
    return {
      isBlinking: this.isBlinking,
      breathPhase:
        Math.sin(this.time * this.config.breathingSpeed * Math.PI * 2) * 0.5 +
        0.5,
    };
  }
}
