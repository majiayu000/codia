import { VRM } from "@pixiv/three-vrm";

export interface IdleAnimationConfig {
  breathingSpeed: number;
  breathingIntensity: number;
  blinkInterval: [number, number];
  blinkDuration: number;
  microMovementIntensity: number;
  swayIntensity: number;
  lookAroundEnabled: boolean;
  enabled: boolean;
}

const defaultConfig: IdleAnimationConfig = {
  breathingSpeed: 0.4,
  breathingIntensity: 0.015,
  blinkInterval: [2, 5],
  blinkDuration: 0.12,
  microMovementIntensity: 0.008,
  swayIntensity: 0.003,
  lookAroundEnabled: true,
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

  // Look around state
  private lookTargetX: number = 0;
  private lookTargetY: number = 0;
  private currentLookX: number = 0;
  private currentLookY: number = 0;
  private nextLookTime: number = 2;

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
    this.updateBodySway(deltaTime);
    this.updateLookAround(deltaTime);
    this.updateMicroMovements(deltaTime);
  }

  private updateBreathing(deltaTime: number): void {
    if (!this.vrm?.humanoid) return;

    const spine = this.vrm.humanoid.getNormalizedBoneNode("spine");
    const chest = this.vrm.humanoid.getNormalizedBoneNode("chest");
    const upperChest = this.vrm.humanoid.getNormalizedBoneNode("upperChest");

    const breathCycle = Math.sin(this.time * this.config.breathingSpeed * Math.PI * 2);
    const breathOffset = breathCycle * this.config.breathingIntensity;

    if (spine) {
      spine.rotation.x = breathOffset * 0.3;
    }

    if (chest) {
      chest.rotation.x = breathOffset * 0.5;
      chest.position.y = breathOffset * 0.002;
    }

    if (upperChest) {
      upperChest.rotation.x = breathOffset * 0.4;
    }

    // Subtle shoulder movement with breathing
    const leftShoulder = this.vrm.humanoid.getNormalizedBoneNode("leftShoulder");
    const rightShoulder = this.vrm.humanoid.getNormalizedBoneNode("rightShoulder");

    if (leftShoulder) {
      leftShoulder.rotation.z = breathOffset * 0.1;
    }
    if (rightShoulder) {
      rightShoulder.rotation.z = -breathOffset * 0.1;
    }
  }

  private updateBlink(deltaTime: number): void {
    if (!this.vrm?.expressionManager) return;

    if (!this.isBlinking && this.time >= this.nextBlinkTime) {
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.lastBlinkTime = this.time;
    }

    if (this.isBlinking) {
      this.blinkProgress += deltaTime / this.config.blinkDuration;

      if (this.blinkProgress >= 1) {
        this.isBlinking = false;
        this.vrm.expressionManager.setValue("blink", 0);
        this.scheduleNextBlink();
      } else {
        const t = this.blinkProgress;
        const blinkWeight = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        this.vrm.expressionManager.setValue("blink", blinkWeight);
      }
    }
  }

  private updateBodySway(deltaTime: number): void {
    if (!this.vrm?.humanoid) return;

    const hips = this.vrm.humanoid.getNormalizedBoneNode("hips");
    const spine = this.vrm.humanoid.getNormalizedBoneNode("spine");

    const swayX = Math.sin(this.time * 0.3) * this.config.swayIntensity;
    const swayZ = Math.sin(this.time * 0.4 + 1) * this.config.swayIntensity * 0.5;

    if (hips) {
      hips.rotation.y = swayX;
      hips.rotation.x = swayZ * 0.3;
    }

    if (spine) {
      // Counter-rotation for natural look
      spine.rotation.y = -swayX * 0.5;
    }
  }

  private updateLookAround(deltaTime: number): void {
    if (!this.vrm?.humanoid || !this.config.lookAroundEnabled) return;

    // Update look target periodically
    if (this.time >= this.nextLookTime) {
      this.lookTargetX = (Math.random() - 0.5) * 0.15;
      this.lookTargetY = (Math.random() - 0.5) * 0.1;
      this.nextLookTime = this.time + 2 + Math.random() * 3;
    }

    // Smooth interpolation to target
    const lerpSpeed = 2 * deltaTime;
    this.currentLookX += (this.lookTargetX - this.currentLookX) * lerpSpeed;
    this.currentLookY += (this.lookTargetY - this.currentLookY) * lerpSpeed;

    const head = this.vrm.humanoid.getNormalizedBoneNode("head");
    const neck = this.vrm.humanoid.getNormalizedBoneNode("neck");

    if (neck) {
      neck.rotation.y = this.currentLookX * 0.4;
      neck.rotation.x = this.currentLookY * 0.3;
    }

    if (head) {
      head.rotation.y = this.currentLookX * 0.6;
      head.rotation.x = this.currentLookY * 0.5;
    }

    // Eye look (if available via expressions)
    if (this.vrm.expressionManager) {
      const lookRight = Math.max(0, this.currentLookX * 5);
      const lookLeft = Math.max(0, -this.currentLookX * 5);
      const lookUp = Math.max(0, -this.currentLookY * 5);
      const lookDown = Math.max(0, this.currentLookY * 5);

      this.vrm.expressionManager.setValue("lookRight", Math.min(1, lookRight));
      this.vrm.expressionManager.setValue("lookLeft", Math.min(1, lookLeft));
      this.vrm.expressionManager.setValue("lookUp", Math.min(1, lookUp));
      this.vrm.expressionManager.setValue("lookDown", Math.min(1, lookDown));
    }
  }

  private updateMicroMovements(deltaTime: number): void {
    if (!this.vrm?.humanoid) return;

    const intensity = this.config.microMovementIntensity;

    // Subtle arm movements
    const leftUpperArm = this.vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
    const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode("rightUpperArm");

    if (leftUpperArm) {
      leftUpperArm.rotation.z += Math.sin(this.time * 0.8) * intensity * 0.5;
      leftUpperArm.rotation.x += Math.sin(this.time * 0.6 + 1) * intensity * 0.3;
    }

    if (rightUpperArm) {
      rightUpperArm.rotation.z -= Math.sin(this.time * 0.7 + 0.5) * intensity * 0.5;
      rightUpperArm.rotation.x += Math.sin(this.time * 0.5 + 2) * intensity * 0.3;
    }

    // Subtle hand movements
    const leftHand = this.vrm.humanoid.getNormalizedBoneNode("leftHand");
    const rightHand = this.vrm.humanoid.getNormalizedBoneNode("rightHand");

    if (leftHand) {
      leftHand.rotation.z = Math.sin(this.time * 1.2) * intensity;
    }

    if (rightHand) {
      rightHand.rotation.z = Math.sin(this.time * 1.1 + 1) * intensity;
    }
  }

  triggerBlink(): void {
    if (this.isBlinking) return;
    this.isBlinking = true;
    this.blinkProgress = 0;
  }

  // Look at a specific direction (for interaction)
  lookAt(x: number, y: number): void {
    this.lookTargetX = Math.max(-0.3, Math.min(0.3, x));
    this.lookTargetY = Math.max(-0.2, Math.min(0.2, y));
    this.nextLookTime = this.time + 3; // Hold for 3 seconds
  }

  // Reset to center
  resetLook(): void {
    this.lookTargetX = 0;
    this.lookTargetY = 0;
  }

  getState(): { isBlinking: boolean; breathPhase: number; lookDirection: { x: number; y: number } } {
    return {
      isBlinking: this.isBlinking,
      breathPhase:
        Math.sin(this.time * this.config.breathingSpeed * Math.PI * 2) * 0.5 + 0.5,
      lookDirection: {
        x: this.currentLookX,
        y: this.currentLookY,
      },
    };
  }
}
