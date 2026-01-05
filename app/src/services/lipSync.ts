import { VRM } from "@pixiv/three-vrm";

export type Viseme = "aa" | "ih" | "ou" | "ee" | "oh" | "sil";

const visemeToBlendShape: Record<Viseme, string> = {
  aa: "aa",
  ih: "ih",
  ou: "ou",
  ee: "ee",
  oh: "oh",
  sil: "neutral",
};

// Phoneme to viseme mapping (simplified)
const phonemeToViseme: Record<string, Viseme> = {
  // Vowels
  a: "aa",
  e: "ee",
  i: "ih",
  o: "oh",
  u: "ou",
  // Silent
  " ": "sil",
  ".": "sil",
  ",": "sil",
  "!": "sil",
  "?": "sil",
};

export interface LipSyncFrame {
  time: number;
  viseme: Viseme;
  weight: number;
}

export class LipSyncService {
  private vrm: VRM | null = null;
  private currentViseme: Viseme = "sil";
  private targetViseme: Viseme = "sil";
  private currentWeight: number = 0;
  private targetWeight: number = 0;
  private smoothing: number = 0.15;
  private isActive: boolean = false;

  constructor(vrm?: VRM) {
    if (vrm) this.vrm = vrm;
  }

  setVRM(vrm: VRM): void {
    this.vrm = vrm;
  }

  setViseme(viseme: Viseme, weight: number = 1.0): void {
    this.targetViseme = viseme;
    this.targetWeight = weight;
    this.isActive = true;
  }

  stop(): void {
    this.targetViseme = "sil";
    this.targetWeight = 0;
    this.isActive = false;
  }

  update(deltaTime: number): void {
    if (!this.vrm) return;

    // Smooth interpolation
    const lerpFactor = 1 - Math.pow(this.smoothing, deltaTime * 60);

    // Transition to target weight
    this.currentWeight = this.currentWeight + (this.targetWeight - this.currentWeight) * lerpFactor;

    // Apply lip sync
    this.applyViseme();
  }

  private applyViseme(): void {
    if (!this.vrm?.expressionManager) return;

    // Reset all mouth-related blend shapes
    Object.values(visemeToBlendShape).forEach((shape) => {
      if (shape !== "neutral") {
        this.vrm?.expressionManager?.setValue(shape as any, 0);
      }
    });

    // Apply current viseme
    if (this.currentViseme !== "sil" && this.currentWeight > 0.01) {
      const blendShape = visemeToBlendShape[this.currentViseme];
      if (blendShape !== "neutral") {
        this.vrm.expressionManager.setValue(blendShape as any, this.currentWeight);
      }
    }

    // Update current viseme when transitioning
    if (Math.abs(this.currentWeight - this.targetWeight) < 0.1) {
      this.currentViseme = this.targetViseme;
    }
  }

  // Generate lip sync data from text (simple simulation)
  generateFromText(text: string, wordsPerMinute: number = 150): LipSyncFrame[] {
    const frames: LipSyncFrame[] = [];
    const charDuration = 60 / (wordsPerMinute * 5); // Average 5 chars per word

    let time = 0;
    for (const char of text.toLowerCase()) {
      const viseme = phonemeToViseme[char] || "sil";
      frames.push({
        time,
        viseme,
        weight: viseme === "sil" ? 0 : 0.7 + Math.random() * 0.3,
      });
      time += charDuration;
    }

    // Add final silence
    frames.push({ time, viseme: "sil", weight: 0 });

    return frames;
  }

  // Play lip sync animation from frames
  async playFrames(frames: LipSyncFrame[]): Promise<void> {
    if (frames.length === 0) return;

    const startTime = performance.now() / 1000;

    return new Promise((resolve) => {
      let currentIndex = 0;

      const animate = () => {
        const currentTime = performance.now() / 1000 - startTime;

        // Find current frame
        while (
          currentIndex < frames.length - 1 &&
          frames[currentIndex + 1].time <= currentTime
        ) {
          currentIndex++;
        }

        const frame = frames[currentIndex];
        this.setViseme(frame.viseme, frame.weight);

        if (currentIndex < frames.length - 1 && this.isActive) {
          requestAnimationFrame(animate);
        } else {
          this.stop();
          resolve();
        }
      };

      this.isActive = true;
      animate();
    });
  }
}

export function analyzeAudioForLipSync(
  audioBuffer: AudioBuffer,
  sampleRate: number = 60
): LipSyncFrame[] {
  const frames: LipSyncFrame[] = [];
  const data = audioBuffer.getChannelData(0);
  const samplesPerFrame = Math.floor(audioBuffer.sampleRate / sampleRate);

  for (let i = 0; i < data.length; i += samplesPerFrame) {
    const time = i / audioBuffer.sampleRate;

    // Calculate RMS for this frame
    let sum = 0;
    const end = Math.min(i + samplesPerFrame, data.length);
    for (let j = i; j < end; j++) {
      sum += data[j] * data[j];
    }
    const rms = Math.sqrt(sum / (end - i));

    // Map RMS to viseme (simplified)
    const weight = Math.min(1, rms * 10);
    const viseme: Viseme = weight > 0.3 ? "aa" : "sil";

    frames.push({ time, viseme, weight });
  }

  return frames;
}
