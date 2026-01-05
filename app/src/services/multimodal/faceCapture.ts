/**
 * Face Capture Service
 * 面部捕捉服务 - 使用 MediaPipe 检测用户表情
 * Note: This service requires browser environment with camera access
 */

import type {
  FaceDetectionResult,
  DetectedFace,
  FaceExpression,
  FaceCaptureConfig,
  FaceCaptureState,
  ExpressionMirroringSettings,
} from "./types";
import {
  DEFAULT_FACE_CAPTURE_CONFIG,
  DEFAULT_MIRRORING_SETTINGS,
} from "./types";

type EventType = "faceDetected" | "expressionChanged" | "error" | "stateChanged";
type EventCallback = (data: unknown) => void;

/**
 * Face Capture Service
 * Captures user's face and detects expressions for avatar mirroring
 */
export class FaceCaptureService {
  private config: FaceCaptureConfig;
  private mirroringSettings: ExpressionMirroringSettings;
  private state: FaceCaptureState;
  private eventListeners: Map<EventType, Set<EventCallback>> = new Map();
  private captureInterval: ReturnType<typeof setInterval> | null = null;
  private lastExpression: FaceExpression = "neutral";
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

  constructor(
    config: Partial<FaceCaptureConfig> = {},
    mirroringSettings: Partial<ExpressionMirroringSettings> = {}
  ) {
    this.config = { ...DEFAULT_FACE_CAPTURE_CONFIG, ...config };
    this.mirroringSettings = { ...DEFAULT_MIRRORING_SETTINGS, ...mirroringSettings };
    this.state = this.createInitialState();

    // Initialize event listener maps
    this.eventListeners.set("faceDetected", new Set());
    this.eventListeners.set("expressionChanged", new Set());
    this.eventListeners.set("error", new Set());
    this.eventListeners.set("stateChanged", new Set());
  }

  // ================== Lifecycle ==================

  /**
   * Initialize camera and start capturing
   */
  async start(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    if (this.state.isCapturing) {
      return true;
    }

    try {
      // Request camera permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      this.state.hasPermission = true;

      // Create video element for capture
      this.videoElement = document.createElement("video");
      this.videoElement.srcObject = this.stream;
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;

      await this.videoElement.play();

      // Start capture loop
      this.startCaptureLoop();

      this.state.isCapturing = true;
      this.emit("stateChanged", this.state);

      return true;
    } catch (error) {
      this.state.hasPermission = false;
      this.state.errorMessage =
        error instanceof Error ? error.message : "Failed to access camera";
      this.emit("error", error);
      return false;
    }
  }

  /**
   * Stop capturing
   */
  stop(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.state.isCapturing = false;
    this.emit("stateChanged", this.state);
  }

  /**
   * Get current state
   */
  getState(): FaceCaptureState {
    return { ...this.state };
  }

  /**
   * Check if camera permission is granted
   */
  async checkPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      return result.state === "granted";
    } catch {
      return false;
    }
  }

  // ================== Event Handling ==================

  on(event: EventType, callback: EventCallback): void {
    this.eventListeners.get(event)?.add(callback);
  }

  off(event: EventType, callback: EventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit(event: EventType, data: unknown): void {
    this.eventListeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    });
  }

  // ================== Detection ==================

  /**
   * Get the last detected face result
   */
  getLastDetection(): FaceDetectionResult | null {
    return this.state.lastFaceDetection;
  }

  /**
   * Get the current detected expression
   */
  getCurrentExpression(): FaceExpression {
    return this.lastExpression;
  }

  /**
   * Get mapped avatar expression
   */
  getMappedAvatarExpression(): string {
    return this.mirroringSettings.expressionMapping[this.lastExpression] || "neutral";
  }

  /**
   * Manually process a face detection result (for testing)
   */
  processDetection(result: FaceDetectionResult): void {
    this.state.lastFaceDetection = result;
    this.state.lastCapture = new Date();

    this.emit("faceDetected", result);

    // Check for expression changes
    if (result.faces.length > 0) {
      const primaryFace = result.faces[0];
      const newExpression = primaryFace.expression;

      if (newExpression !== this.lastExpression) {
        if (!this.mirroringSettings.ignoredExpressions.includes(newExpression)) {
          this.lastExpression = newExpression;
          this.emit("expressionChanged", {
            expression: newExpression,
            avatarExpression: this.getMappedAvatarExpression(),
            confidence: primaryFace.expressionScores[newExpression],
          });
        }
      }
    }
  }

  // ================== Configuration ==================

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FaceCaptureConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart capture loop if interval changed
    if (config.captureIntervalMs && this.state.isCapturing) {
      this.stopCaptureLoop();
      this.startCaptureLoop();
    }
  }

  /**
   * Update mirroring settings
   */
  updateMirroringSettings(settings: Partial<ExpressionMirroringSettings>): void {
    this.mirroringSettings = { ...this.mirroringSettings, ...settings };
  }

  /**
   * Get current config
   */
  getConfig(): FaceCaptureConfig {
    return { ...this.config };
  }

  /**
   * Get mirroring settings
   */
  getMirroringSettings(): ExpressionMirroringSettings {
    return { ...this.mirroringSettings };
  }

  // ================== Private Methods ==================

  private createInitialState(): FaceCaptureState {
    return {
      isCapturing: false,
      lastCapture: null,
      lastFaceDetection: null,
      hasPermission: false,
    };
  }

  private startCaptureLoop(): void {
    this.captureInterval = setInterval(() => {
      this.captureFrame();
    }, this.config.captureIntervalMs);
  }

  private stopCaptureLoop(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
  }

  private async captureFrame(): Promise<void> {
    if (!this.videoElement || !this.state.isCapturing) {
      return;
    }

    // In a real implementation, this would use MediaPipe FaceLandmarker
    // For now, we simulate the detection
    // Real implementation would be:
    // const results = await this.faceLandmarker.detect(this.videoElement);
    // this.processResults(results);
  }
}

/**
 * Factory function
 */
export function createFaceCaptureService(
  config?: Partial<FaceCaptureConfig>,
  mirroringSettings?: Partial<ExpressionMirroringSettings>
): FaceCaptureService {
  return new FaceCaptureService(config, mirroringSettings);
}

// Singleton
let defaultInstance: FaceCaptureService | null = null;

export function getFaceCaptureService(): FaceCaptureService {
  if (!defaultInstance) {
    defaultInstance = new FaceCaptureService();
  }
  return defaultInstance;
}

export function resetFaceCaptureService(): void {
  if (defaultInstance) {
    defaultInstance.stop();
  }
  defaultInstance = null;
}
