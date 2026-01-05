/**
 * Gesture Animation Service
 * 手势动画服务 - 程序化生成肢体动作
 */

import { VRM } from "@pixiv/three-vrm";

export type GestureType =
  | "wave" // 挥手
  | "nod" // 点头
  | "shake_head" // 摇头
  | "bow" // 鞠躬
  | "thinking" // 思考
  | "excited" // 兴奋
  | "shrug" // 耸肩
  | "point" // 指向
  | "clap"; // 拍手

interface GestureConfig {
  duration: number;
  easing: (t: number) => number;
}

interface ActiveGesture {
  type: GestureType;
  progress: number;
  duration: number;
  easing: (t: number) => number;
}

const DEFAULT_CONFIGS: Record<GestureType, GestureConfig> = {
  wave: { duration: 1.5, easing: easeInOutSine },
  nod: { duration: 0.8, easing: easeInOutQuad },
  shake_head: { duration: 1.0, easing: easeInOutSine },
  bow: { duration: 1.5, easing: easeInOutQuad },
  thinking: { duration: 2.0, easing: easeInOutSine },
  excited: { duration: 1.2, easing: easeOutElastic },
  shrug: { duration: 1.0, easing: easeInOutQuad },
  point: { duration: 1.0, easing: easeOutQuad },
  clap: { duration: 1.5, easing: linear },
};

// Easing functions
function linear(t: number): number {
  return t;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Gesture Animation Service
 */
export class GestureAnimationService {
  private vrm: VRM | null = null;
  private activeGesture: ActiveGesture | null = null;
  private gestureQueue: GestureType[] = [];
  private enabled: boolean = true;

  // Store original rotations to restore after gesture
  private originalRotations: Map<string, { x: number; y: number; z: number }> = new Map();

  constructor(vrm?: VRM) {
    this.vrm = vrm || null;
  }

  setVRM(vrm: VRM): void {
    this.vrm = vrm;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.activeGesture = null;
    this.gestureQueue = [];
  }

  /**
   * Play a gesture animation
   */
  playGesture(type: GestureType): void {
    if (!this.enabled) return;

    if (this.activeGesture) {
      // Queue the gesture
      this.gestureQueue.push(type);
      return;
    }

    this.startGesture(type);
  }

  /**
   * Check if currently playing a gesture
   */
  isPlaying(): boolean {
    return this.activeGesture !== null;
  }

  /**
   * Get current gesture type
   */
  getCurrentGesture(): GestureType | null {
    return this.activeGesture?.type || null;
  }

  /**
   * Update animation (call every frame)
   */
  update(deltaTime: number): void {
    if (!this.vrm || !this.enabled || !this.activeGesture) return;

    this.activeGesture.progress += deltaTime / this.activeGesture.duration;

    if (this.activeGesture.progress >= 1) {
      // Gesture complete
      this.restoreOriginalPose();
      this.activeGesture = null;

      // Play next queued gesture
      if (this.gestureQueue.length > 0) {
        const next = this.gestureQueue.shift()!;
        this.startGesture(next);
      }
      return;
    }

    const t = this.activeGesture.easing(this.activeGesture.progress);
    this.applyGesture(this.activeGesture.type, t);
  }

  private startGesture(type: GestureType): void {
    const config = DEFAULT_CONFIGS[type];
    this.saveOriginalPose();
    this.activeGesture = {
      type,
      progress: 0,
      duration: config.duration,
      easing: config.easing,
    };
  }

  private saveOriginalPose(): void {
    if (!this.vrm?.humanoid) return;

    this.originalRotations.clear();
    const boneNames = [
      "head", "neck", "spine", "chest", "upperChest",
      "leftShoulder", "rightShoulder",
      "leftUpperArm", "rightUpperArm",
      "leftLowerArm", "rightLowerArm",
      "leftHand", "rightHand",
    ];

    for (const name of boneNames) {
      const bone = this.vrm.humanoid.getNormalizedBoneNode(name as any);
      if (bone) {
        this.originalRotations.set(name, {
          x: bone.rotation.x,
          y: bone.rotation.y,
          z: bone.rotation.z,
        });
      }
    }
  }

  private restoreOriginalPose(): void {
    if (!this.vrm?.humanoid) return;

    for (const [name, rot] of this.originalRotations) {
      const bone = this.vrm.humanoid.getNormalizedBoneNode(name as any);
      if (bone) {
        bone.rotation.x = rot.x;
        bone.rotation.y = rot.y;
        bone.rotation.z = rot.z;
      }
    }
  }

  private applyGesture(type: GestureType, t: number): void {
    switch (type) {
      case "wave":
        this.applyWave(t);
        break;
      case "nod":
        this.applyNod(t);
        break;
      case "shake_head":
        this.applyShakeHead(t);
        break;
      case "bow":
        this.applyBow(t);
        break;
      case "thinking":
        this.applyThinking(t);
        break;
      case "excited":
        this.applyExcited(t);
        break;
      case "shrug":
        this.applyShrug(t);
        break;
      case "point":
        this.applyPoint(t);
        break;
      case "clap":
        this.applyClap(t);
        break;
    }
  }

  // ================== Gesture Implementations ==================

  private applyWave(t: number): void {
    if (!this.vrm?.humanoid) return;

    const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
    const rightLowerArm = this.vrm.humanoid.getNormalizedBoneNode("rightLowerArm");
    const rightHand = this.vrm.humanoid.getNormalizedBoneNode("rightHand");

    // Raise arm
    const raiseT = Math.min(t * 3, 1); // First 1/3 of animation
    const waveT = t > 0.33 ? (t - 0.33) / 0.67 : 0; // Remaining 2/3

    if (rightUpperArm) {
      rightUpperArm.rotation.z = -Math.PI * 0.6 * raiseT;
      rightUpperArm.rotation.x = -Math.PI * 0.2 * raiseT;
    }

    if (rightLowerArm) {
      rightLowerArm.rotation.y = Math.PI * 0.3 * raiseT;
    }

    if (rightHand) {
      // Wave motion
      rightHand.rotation.z = Math.sin(waveT * Math.PI * 4) * 0.5;
    }
  }

  private applyNod(t: number): void {
    if (!this.vrm?.humanoid) return;

    const head = this.vrm.humanoid.getNormalizedBoneNode("head");
    const neck = this.vrm.humanoid.getNormalizedBoneNode("neck");

    // Two nods
    const nodCycle = Math.sin(t * Math.PI * 2) * Math.sin(t * Math.PI);

    if (head) {
      head.rotation.x = nodCycle * 0.3;
    }
    if (neck) {
      neck.rotation.x = nodCycle * 0.15;
    }
  }

  private applyShakeHead(t: number): void {
    if (!this.vrm?.humanoid) return;

    const head = this.vrm.humanoid.getNormalizedBoneNode("head");
    const neck = this.vrm.humanoid.getNormalizedBoneNode("neck");

    // Three shakes
    const shakeCycle = Math.sin(t * Math.PI * 3) * (1 - t * 0.5);

    if (head) {
      head.rotation.y = shakeCycle * 0.4;
    }
    if (neck) {
      neck.rotation.y = shakeCycle * 0.2;
    }
  }

  private applyBow(t: number): void {
    if (!this.vrm?.humanoid) return;

    const spine = this.vrm.humanoid.getNormalizedBoneNode("spine");
    const chest = this.vrm.humanoid.getNormalizedBoneNode("chest");
    const head = this.vrm.humanoid.getNormalizedBoneNode("head");

    // Bow down and up
    const bowAmount = Math.sin(t * Math.PI);

    if (spine) {
      spine.rotation.x = bowAmount * 0.3;
    }
    if (chest) {
      chest.rotation.x = bowAmount * 0.2;
    }
    if (head) {
      head.rotation.x = bowAmount * 0.2;
    }
  }

  private applyThinking(t: number): void {
    if (!this.vrm?.humanoid) return;

    const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
    const rightLowerArm = this.vrm.humanoid.getNormalizedBoneNode("rightLowerArm");
    const rightHand = this.vrm.humanoid.getNormalizedBoneNode("rightHand");
    const head = this.vrm.humanoid.getNormalizedBoneNode("head");

    // Hand to chin pose
    const poseT = Math.min(t * 2, 1);
    const holdT = t > 0.5 ? (t - 0.5) / 0.5 : 0;

    if (rightUpperArm) {
      rightUpperArm.rotation.z = -Math.PI * 0.3 * poseT;
      rightUpperArm.rotation.x = Math.PI * 0.4 * poseT;
    }

    if (rightLowerArm) {
      rightLowerArm.rotation.y = Math.PI * 0.8 * poseT;
    }

    if (rightHand) {
      rightHand.rotation.x = -Math.PI * 0.2 * poseT;
    }

    if (head) {
      head.rotation.y = Math.sin(holdT * Math.PI * 2) * 0.1;
      head.rotation.z = 0.1 * poseT;
    }
  }

  private applyExcited(t: number): void {
    if (!this.vrm?.humanoid) return;

    const leftUpperArm = this.vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
    const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
    const spine = this.vrm.humanoid.getNormalizedBoneNode("spine");

    // Jump-like motion
    const bounce = Math.sin(t * Math.PI * 4) * (1 - t);

    if (leftUpperArm) {
      leftUpperArm.rotation.z = Math.PI * 0.5 * Math.abs(bounce);
    }
    if (rightUpperArm) {
      rightUpperArm.rotation.z = -Math.PI * 0.5 * Math.abs(bounce);
    }
    if (spine) {
      spine.position.y = Math.abs(bounce) * 0.05;
    }
  }

  private applyShrug(t: number): void {
    if (!this.vrm?.humanoid) return;

    const leftShoulder = this.vrm.humanoid.getNormalizedBoneNode("leftShoulder");
    const rightShoulder = this.vrm.humanoid.getNormalizedBoneNode("rightShoulder");
    const leftUpperArm = this.vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
    const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
    const head = this.vrm.humanoid.getNormalizedBoneNode("head");

    const shrugAmount = Math.sin(t * Math.PI);

    if (leftShoulder) {
      leftShoulder.position.y = shrugAmount * 0.03;
    }
    if (rightShoulder) {
      rightShoulder.position.y = shrugAmount * 0.03;
    }
    if (leftUpperArm) {
      leftUpperArm.rotation.z = shrugAmount * 0.3;
    }
    if (rightUpperArm) {
      rightUpperArm.rotation.z = -shrugAmount * 0.3;
    }
    if (head) {
      head.rotation.z = shrugAmount * 0.1;
    }
  }

  private applyPoint(t: number): void {
    if (!this.vrm?.humanoid) return;

    const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
    const rightLowerArm = this.vrm.humanoid.getNormalizedBoneNode("rightLowerArm");
    const rightHand = this.vrm.humanoid.getNormalizedBoneNode("rightHand");

    const pointT = Math.min(t * 2, 1);

    if (rightUpperArm) {
      rightUpperArm.rotation.z = -Math.PI * 0.4 * pointT;
      rightUpperArm.rotation.y = -Math.PI * 0.2 * pointT;
    }

    if (rightLowerArm) {
      rightLowerArm.rotation.y = Math.PI * 0.1 * pointT;
    }

    if (rightHand) {
      rightHand.rotation.y = Math.PI * 0.1 * pointT;
    }
  }

  private applyClap(t: number): void {
    if (!this.vrm?.humanoid) return;

    const leftUpperArm = this.vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
    const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
    const leftLowerArm = this.vrm.humanoid.getNormalizedBoneNode("leftLowerArm");
    const rightLowerArm = this.vrm.humanoid.getNormalizedBoneNode("rightLowerArm");

    // Raise arms first
    const raiseT = Math.min(t * 3, 1);
    // Clap motion
    const clapCycle = t > 0.33 ? Math.sin((t - 0.33) * Math.PI * 6) : 0;

    if (leftUpperArm) {
      leftUpperArm.rotation.z = Math.PI * 0.4 * raiseT;
      leftUpperArm.rotation.x = Math.PI * 0.3 * raiseT + clapCycle * 0.1;
    }
    if (rightUpperArm) {
      rightUpperArm.rotation.z = -Math.PI * 0.4 * raiseT;
      rightUpperArm.rotation.x = Math.PI * 0.3 * raiseT + clapCycle * 0.1;
    }
    if (leftLowerArm) {
      leftLowerArm.rotation.y = -Math.PI * 0.5 * raiseT + clapCycle * 0.15;
    }
    if (rightLowerArm) {
      rightLowerArm.rotation.y = Math.PI * 0.5 * raiseT - clapCycle * 0.15;
    }
  }
}

// Factory and singleton
export function createGestureAnimationService(vrm?: VRM): GestureAnimationService {
  return new GestureAnimationService(vrm);
}

let defaultInstance: GestureAnimationService | null = null;

export function getGestureAnimationService(): GestureAnimationService {
  if (!defaultInstance) {
    defaultInstance = new GestureAnimationService();
  }
  return defaultInstance;
}

export function resetGestureAnimationService(): void {
  defaultInstance = null;
}
