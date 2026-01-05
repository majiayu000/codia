/**
 * Lively Idle Animation Service
 * 活泼的待机动画服务 - 模拟 VRoid Hub 风格的自动动画
 */

import { VRM } from "@pixiv/three-vrm";

export interface LivelyIdleConfig {
  enabled: boolean;
  // Breathing
  breathingSpeed: number;
  breathingIntensity: number;
  // Blinking
  blinkInterval: [number, number];
  blinkDuration: number;
  doubleBlinkChance: number;
  // Body movement
  swaySpeed: number;
  swayIntensity: number;
  bounceIntensity: number;
  // Head movement
  headTiltIntensity: number;
  lookAroundSpeed: number;
  // Random actions
  randomActionInterval: [number, number];
  enableRandomActions: boolean;
}

const DEFAULT_CONFIG: LivelyIdleConfig = {
  enabled: true,
  // Gentle breathing (reduced to prevent clipping)
  breathingSpeed: 0.4,
  breathingIntensity: 0.012,
  // Natural blinking
  blinkInterval: [2, 5],
  blinkDuration: 0.12,
  doubleBlinkChance: 0.2,
  // Subtle body sway (reduced to prevent clipping)
  swaySpeed: 0.3,
  swayIntensity: 0.006,
  bounceIntensity: 0.003,
  // Gentle head movement
  headTiltIntensity: 0.04,
  lookAroundSpeed: 0.25,
  // Random cute actions
  randomActionInterval: [4, 10],
  enableRandomActions: true,
};

type RandomAction =
  | "head_tilt"      // 歪头
  | "shoulder_shrug" // 轻微耸肩
  | "look_up"        // 抬头看
  | "look_side"      // 侧头看
  | "stretch"        // 小伸展
  | "nod"            // 微点头
  | "ear_wiggle";    // 如果有耳朵骨骼

interface ActiveAction {
  type: RandomAction;
  progress: number;
  duration: number;
}

/**
 * Lively Idle Animation Service
 * Creates VRoid Hub-style animated idle poses
 */
export class LivelyIdleAnimationService {
  private vrm: VRM | null = null;
  private config: LivelyIdleConfig;
  private time: number = 0;

  // Blink state
  private lastBlinkTime: number = 0;
  private nextBlinkTime: number = 0;
  private isBlinking: boolean = false;
  private blinkProgress: number = 0;
  private pendingDoubleBlink: boolean = false;

  // Look around state
  private lookTargetX: number = 0;
  private lookTargetY: number = 0;
  private currentLookX: number = 0;
  private currentLookY: number = 0;
  private nextLookTime: number = 2;

  // Random action state
  private activeAction: ActiveAction | null = null;
  private nextActionTime: number = 5;

  // Smooth movement accumulators
  private headTiltOffset: number = 0;
  private bodyBounceOffset: number = 0;

  constructor(vrm?: VRM, config?: Partial<LivelyIdleConfig>) {
    this.vrm = vrm || null;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scheduleNextBlink();
    this.scheduleNextAction();
  }

  setVRM(vrm: VRM): void {
    this.vrm = vrm;
  }

  setConfig(config: Partial<LivelyIdleConfig>): void {
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

  private scheduleNextAction(): void {
    const [min, max] = this.config.randomActionInterval;
    this.nextActionTime = this.time + min + Math.random() * (max - min);
  }

  update(deltaTime: number): void {
    if (!this.vrm || !this.config.enabled) return;

    this.time += deltaTime;

    // Core animations
    this.updateBreathing(deltaTime);
    this.updateBlink(deltaTime);
    this.updateBodySway(deltaTime);
    this.updateHeadMovement(deltaTime);
    this.updateLookAround(deltaTime);

    // Random actions
    if (this.config.enableRandomActions) {
      this.updateRandomAction(deltaTime);
    }

    // Arm micro-movements
    this.updateArmMovements(deltaTime);
  }

  private updateBreathing(deltaTime: number): void {
    if (!this.vrm?.humanoid) return;

    const spine = this.vrm.humanoid.getNormalizedBoneNode("spine");
    const chest = this.vrm.humanoid.getNormalizedBoneNode("chest");
    const upperChest = this.vrm.humanoid.getNormalizedBoneNode("upperChest");

    // Smooth breathing cycle
    const breathPhase = this.time * this.config.breathingSpeed * Math.PI * 2;
    const breathCycle = Math.sin(breathPhase);
    const breathOffset = breathCycle * this.config.breathingIntensity;

    // Add slight variation
    const variation = Math.sin(this.time * 0.7) * 0.2;

    if (spine) {
      spine.rotation.x = breathOffset * 0.4 * (1 + variation);
    }

    if (chest) {
      chest.rotation.x = breathOffset * 0.6;
      chest.position.y = breathOffset * 0.003;
    }

    if (upperChest) {
      upperChest.rotation.x = breathOffset * 0.5;
    }

    // Shoulder movement with breathing
    const leftShoulder = this.vrm.humanoid.getNormalizedBoneNode("leftShoulder");
    const rightShoulder = this.vrm.humanoid.getNormalizedBoneNode("rightShoulder");

    if (leftShoulder) {
      leftShoulder.rotation.z = breathOffset * 0.15;
      leftShoulder.position.y = breathOffset * 0.002;
    }
    if (rightShoulder) {
      rightShoulder.rotation.z = -breathOffset * 0.15;
      rightShoulder.position.y = breathOffset * 0.002;
    }
  }

  private updateBlink(deltaTime: number): void {
    if (!this.vrm?.expressionManager) return;

    // Check for blink trigger
    if (!this.isBlinking && this.time >= this.nextBlinkTime) {
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.lastBlinkTime = this.time;

      // Chance for double blink
      this.pendingDoubleBlink = Math.random() < this.config.doubleBlinkChance;
    }

    if (this.isBlinking) {
      this.blinkProgress += deltaTime / this.config.blinkDuration;

      if (this.blinkProgress >= 1) {
        this.isBlinking = false;
        this.vrm.expressionManager.setValue("blink", 0);

        if (this.pendingDoubleBlink) {
          // Quick second blink
          this.pendingDoubleBlink = false;
          this.nextBlinkTime = this.time + 0.15;
        } else {
          this.scheduleNextBlink();
        }
      } else {
        // Smooth blink curve
        const t = this.blinkProgress;
        const blinkWeight = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
        this.vrm.expressionManager.setValue("blink", blinkWeight);
      }
    }
  }

  private updateBodySway(deltaTime: number): void {
    if (!this.vrm?.humanoid) return;

    const hips = this.vrm.humanoid.getNormalizedBoneNode("hips");
    const spine = this.vrm.humanoid.getNormalizedBoneNode("spine");

    // Multi-frequency sway for natural movement
    const swayX = Math.sin(this.time * this.config.swaySpeed) * this.config.swayIntensity;
    const swayZ = Math.sin(this.time * this.config.swaySpeed * 0.7 + 1.5) * this.config.swayIntensity * 0.6;

    // Subtle bounce
    const bounce = Math.abs(Math.sin(this.time * 1.2)) * this.config.bounceIntensity;
    this.bodyBounceOffset = bounce;

    if (hips) {
      hips.rotation.y = swayX;
      hips.rotation.x = swayZ * 0.3;
      hips.rotation.z = Math.sin(this.time * 0.5) * this.config.swayIntensity * 0.3;
      hips.position.y = bounce;
    }

    if (spine) {
      // Counter-rotation for natural look
      spine.rotation.y = -swayX * 0.4;
      spine.rotation.z = -Math.sin(this.time * 0.5) * this.config.swayIntensity * 0.2;
    }
  }

  private updateHeadMovement(deltaTime: number): void {
    if (!this.vrm?.humanoid) return;

    const head = this.vrm.humanoid.getNormalizedBoneNode("head");
    const neck = this.vrm.humanoid.getNormalizedBoneNode("neck");

    // Gentle head tilt with multiple frequencies
    const tiltX = Math.sin(this.time * 0.4) * this.config.headTiltIntensity;
    const tiltZ = Math.sin(this.time * 0.3 + 0.5) * this.config.headTiltIntensity * 0.7;

    // Smooth transition for head tilt
    this.headTiltOffset += (tiltZ - this.headTiltOffset) * deltaTime * 2;

    if (neck) {
      neck.rotation.x = tiltX * 0.4 + this.currentLookY * 0.3;
      neck.rotation.y = this.currentLookX * 0.4;
      neck.rotation.z = this.headTiltOffset * 0.5;
    }

    if (head) {
      head.rotation.x = tiltX * 0.3 + this.currentLookY * 0.5;
      head.rotation.y = this.currentLookX * 0.6;
      head.rotation.z = this.headTiltOffset;
    }
  }

  private updateLookAround(deltaTime: number): void {
    if (!this.vrm?.humanoid) return;

    // Update look target periodically
    if (this.time >= this.nextLookTime) {
      // Mostly look forward, occasionally to sides
      const lookChance = Math.random();
      if (lookChance < 0.6) {
        // Look roughly forward
        this.lookTargetX = (Math.random() - 0.5) * 0.1;
        this.lookTargetY = (Math.random() - 0.5) * 0.08;
      } else if (lookChance < 0.8) {
        // Look to side
        this.lookTargetX = (Math.random() - 0.5) * 0.25;
        this.lookTargetY = (Math.random() - 0.5) * 0.1;
      } else {
        // Look up or down slightly
        this.lookTargetX = (Math.random() - 0.5) * 0.1;
        this.lookTargetY = (Math.random() - 0.3) * 0.15;
      }
      this.nextLookTime = this.time + 1.5 + Math.random() * 3;
    }

    // Smooth interpolation to target
    const lerpSpeed = this.config.lookAroundSpeed * deltaTime;
    this.currentLookX += (this.lookTargetX - this.currentLookX) * lerpSpeed;
    this.currentLookY += (this.lookTargetY - this.currentLookY) * lerpSpeed;

    // Eye expressions
    if (this.vrm.expressionManager) {
      const lookRight = Math.max(0, this.currentLookX * 4);
      const lookLeft = Math.max(0, -this.currentLookX * 4);
      const lookUp = Math.max(0, -this.currentLookY * 4);
      const lookDown = Math.max(0, this.currentLookY * 4);

      this.vrm.expressionManager.setValue("lookRight", Math.min(1, lookRight));
      this.vrm.expressionManager.setValue("lookLeft", Math.min(1, lookLeft));
      this.vrm.expressionManager.setValue("lookUp", Math.min(1, lookUp));
      this.vrm.expressionManager.setValue("lookDown", Math.min(1, lookDown));
    }
  }

  private updateRandomAction(deltaTime: number): void {
    // Check for new action
    if (!this.activeAction && this.time >= this.nextActionTime) {
      this.startRandomAction();
    }

    // Update active action
    if (this.activeAction) {
      this.activeAction.progress += deltaTime / this.activeAction.duration;

      if (this.activeAction.progress >= 1) {
        this.activeAction = null;
        this.scheduleNextAction();
      } else {
        this.applyRandomAction(this.activeAction);
      }
    }
  }

  private startRandomAction(): void {
    const actions: RandomAction[] = [
      "head_tilt",
      "shoulder_shrug",
      "look_up",
      "look_side",
      "nod",
    ];

    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    const durations: Record<RandomAction, number> = {
      head_tilt: 1.5,
      shoulder_shrug: 1.0,
      look_up: 1.2,
      look_side: 1.5,
      stretch: 2.0,
      nod: 0.8,
      ear_wiggle: 0.5,
    };

    this.activeAction = {
      type: randomAction,
      progress: 0,
      duration: durations[randomAction],
    };
  }

  private applyRandomAction(action: ActiveAction): void {
    if (!this.vrm?.humanoid) return;

    const t = action.progress;
    // Smooth in and out
    const ease = Math.sin(t * Math.PI);

    const head = this.vrm.humanoid.getNormalizedBoneNode("head");
    const neck = this.vrm.humanoid.getNormalizedBoneNode("neck");
    const leftShoulder = this.vrm.humanoid.getNormalizedBoneNode("leftShoulder");
    const rightShoulder = this.vrm.humanoid.getNormalizedBoneNode("rightShoulder");

    switch (action.type) {
      case "head_tilt":
        if (head) {
          head.rotation.z += ease * 0.15;
        }
        if (neck) {
          neck.rotation.z += ease * 0.08;
        }
        break;

      case "shoulder_shrug":
        if (leftShoulder) {
          leftShoulder.position.y += ease * 0.015;
        }
        if (rightShoulder) {
          rightShoulder.position.y += ease * 0.015;
        }
        break;

      case "look_up":
        if (head) {
          head.rotation.x -= ease * 0.2;
        }
        if (neck) {
          neck.rotation.x -= ease * 0.1;
        }
        // Slight eye movement
        if (this.vrm.expressionManager) {
          this.vrm.expressionManager.setValue("lookUp", ease * 0.5);
        }
        break;

      case "look_side":
        const direction = Math.random() > 0.5 ? 1 : -1;
        if (head) {
          head.rotation.y += ease * 0.2 * direction;
        }
        if (neck) {
          neck.rotation.y += ease * 0.1 * direction;
        }
        break;

      case "nod":
        const nodCycle = Math.sin(t * Math.PI * 2);
        if (head) {
          head.rotation.x += nodCycle * 0.1;
        }
        break;
    }
  }

  private updateArmMovements(deltaTime: number): void {
    if (!this.vrm?.humanoid) return;

    const leftUpperArm = this.vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
    const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
    const leftLowerArm = this.vrm.humanoid.getNormalizedBoneNode("leftLowerArm");
    const rightLowerArm = this.vrm.humanoid.getNormalizedBoneNode("rightLowerArm");
    const leftHand = this.vrm.humanoid.getNormalizedBoneNode("leftHand");
    const rightHand = this.vrm.humanoid.getNormalizedBoneNode("rightHand");

    // Subtle arm sway synced with body
    const armSway = Math.sin(this.time * 0.6) * 0.02;
    const handSway = Math.sin(this.time * 0.8) * 0.03;

    if (leftUpperArm) {
      leftUpperArm.rotation.z += armSway;
      leftUpperArm.rotation.x += Math.sin(this.time * 0.5) * 0.01;
    }

    if (rightUpperArm) {
      rightUpperArm.rotation.z -= armSway;
      rightUpperArm.rotation.x += Math.sin(this.time * 0.5 + 0.5) * 0.01;
    }

    if (leftLowerArm) {
      leftLowerArm.rotation.y += Math.sin(this.time * 0.7) * 0.015;
    }

    if (rightLowerArm) {
      rightLowerArm.rotation.y -= Math.sin(this.time * 0.7 + 0.3) * 0.015;
    }

    if (leftHand) {
      leftHand.rotation.z = handSway;
    }

    if (rightHand) {
      rightHand.rotation.z = -handSway;
    }
  }

  // Force trigger a specific cute action
  triggerAction(action: RandomAction): void {
    const durations: Record<RandomAction, number> = {
      head_tilt: 1.5,
      shoulder_shrug: 1.0,
      look_up: 1.2,
      look_side: 1.5,
      stretch: 2.0,
      nod: 0.8,
      ear_wiggle: 0.5,
    };

    this.activeAction = {
      type: action,
      progress: 0,
      duration: durations[action],
    };
  }

  triggerBlink(): void {
    if (this.isBlinking) return;
    this.isBlinking = true;
    this.blinkProgress = 0;
  }

  lookAt(x: number, y: number): void {
    this.lookTargetX = Math.max(-0.3, Math.min(0.3, x));
    this.lookTargetY = Math.max(-0.2, Math.min(0.2, y));
    this.nextLookTime = this.time + 3;
  }

  getState() {
    return {
      isBlinking: this.isBlinking,
      currentLook: { x: this.currentLookX, y: this.currentLookY },
      activeAction: this.activeAction?.type || null,
      bodyBounce: this.bodyBounceOffset,
    };
  }
}

// Factory and singleton
export function createLivelyIdleAnimation(
  vrm?: VRM,
  config?: Partial<LivelyIdleConfig>
): LivelyIdleAnimationService {
  return new LivelyIdleAnimationService(vrm, config);
}

let defaultInstance: LivelyIdleAnimationService | null = null;

export function getLivelyIdleAnimation(): LivelyIdleAnimationService {
  if (!defaultInstance) {
    defaultInstance = new LivelyIdleAnimationService();
  }
  return defaultInstance;
}

export function resetLivelyIdleAnimation(): void {
  defaultInstance = null;
}
