import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  FaceCaptureService,
  createFaceCaptureService,
  getFaceCaptureService,
  resetFaceCaptureService,
} from "./faceCapture";
import type { FaceDetectionResult } from "./types";

describe("FaceCaptureService", () => {
  let service: FaceCaptureService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FaceCaptureService();
    resetFaceCaptureService();
  });

  afterEach(() => {
    service.stop();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const s = new FaceCaptureService();
      expect(s).toBeDefined();
      expect(s.getState().isCapturing).toBe(false);
    });

    it("should create with custom config", () => {
      const s = new FaceCaptureService({
        enabled: true,
        captureIntervalMs: 200,
        minConfidence: 0.7,
      });
      expect(s).toBeDefined();
      const config = s.getConfig();
      expect(config.captureIntervalMs).toBe(200);
      expect(config.minConfidence).toBe(0.7);
    });

    it("should create with custom mirroring settings", () => {
      const s = new FaceCaptureService(
        {},
        {
          smoothingFactor: 0.5,
          delayMs: 200,
        }
      );
      const settings = s.getMirroringSettings();
      expect(settings.smoothingFactor).toBe(0.5);
      expect(settings.delayMs).toBe(200);
    });
  });

  describe("getState", () => {
    it("should return initial state", () => {
      const state = service.getState();
      expect(state.isCapturing).toBe(false);
      expect(state.lastCapture).toBeNull();
      expect(state.lastFaceDetection).toBeNull();
      expect(state.hasPermission).toBe(false);
    });
  });

  describe("event handling", () => {
    it("should register and trigger event listeners", () => {
      const callback = vi.fn();
      service.on("faceDetected", callback);

      const mockResult: FaceDetectionResult = {
        faceCount: 1,
        faces: [
          {
            boundingBox: { x: 0, y: 0, width: 100, height: 100 },
            expression: "happy",
            expressionScores: {
              neutral: 0.1,
              happy: 0.9,
              sad: 0,
              angry: 0,
              surprised: 0,
              fearful: 0,
              disgusted: 0,
            },
          },
        ],
        processingTime: 10,
      };

      service.processDetection(mockResult);

      expect(callback).toHaveBeenCalledWith(mockResult);
    });

    it("should remove event listeners", () => {
      const callback = vi.fn();
      service.on("faceDetected", callback);
      service.off("faceDetected", callback);

      service.processDetection({
        faceCount: 0,
        faces: [],
        processingTime: 5,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should emit expressionChanged when expression changes", () => {
      const callback = vi.fn();
      service.on("expressionChanged", callback);

      service.processDetection({
        faceCount: 1,
        faces: [
          {
            boundingBox: { x: 0, y: 0, width: 100, height: 100 },
            expression: "happy",
            expressionScores: {
              neutral: 0.1,
              happy: 0.9,
              sad: 0,
              angry: 0,
              surprised: 0,
              fearful: 0,
              disgusted: 0,
            },
          },
        ],
        processingTime: 10,
      });

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toMatchObject({
        expression: "happy",
        avatarExpression: "happy",
      });
    });

    it("should not emit expressionChanged for ignored expressions", () => {
      const s = new FaceCaptureService(
        {},
        { ignoredExpressions: ["happy"] }
      );
      const callback = vi.fn();
      s.on("expressionChanged", callback);

      s.processDetection({
        faceCount: 1,
        faces: [
          {
            boundingBox: { x: 0, y: 0, width: 100, height: 100 },
            expression: "happy",
            expressionScores: {
              neutral: 0.1,
              happy: 0.9,
              sad: 0,
              angry: 0,
              surprised: 0,
              fearful: 0,
              disgusted: 0,
            },
          },
        ],
        processingTime: 10,
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("processDetection", () => {
    it("should update last detection", () => {
      const mockResult: FaceDetectionResult = {
        faceCount: 1,
        faces: [],
        processingTime: 10,
      };

      service.processDetection(mockResult);

      expect(service.getLastDetection()).toEqual(mockResult);
    });

    it("should update last capture time", () => {
      service.processDetection({
        faceCount: 0,
        faces: [],
        processingTime: 5,
      });

      expect(service.getState().lastCapture).toBeTruthy();
    });

    it("should track current expression", () => {
      service.processDetection({
        faceCount: 1,
        faces: [
          {
            boundingBox: { x: 0, y: 0, width: 100, height: 100 },
            expression: "surprised",
            expressionScores: {
              neutral: 0,
              happy: 0.1,
              sad: 0,
              angry: 0,
              surprised: 0.9,
              fearful: 0,
              disgusted: 0,
            },
          },
        ],
        processingTime: 10,
      });

      expect(service.getCurrentExpression()).toBe("surprised");
    });
  });

  describe("getMappedAvatarExpression", () => {
    it("should return mapped avatar expression", () => {
      service.processDetection({
        faceCount: 1,
        faces: [
          {
            boundingBox: { x: 0, y: 0, width: 100, height: 100 },
            expression: "fearful",
            expressionScores: {
              neutral: 0,
              happy: 0,
              sad: 0,
              angry: 0,
              surprised: 0,
              fearful: 0.9,
              disgusted: 0,
            },
          },
        ],
        processingTime: 10,
      });

      // fearful maps to "concerned" by default
      expect(service.getMappedAvatarExpression()).toBe("concerned");
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      service.updateConfig({ captureIntervalMs: 500 });
      expect(service.getConfig().captureIntervalMs).toBe(500);
    });
  });

  describe("updateMirroringSettings", () => {
    it("should update mirroring settings", () => {
      service.updateMirroringSettings({ smoothingFactor: 0.8 });
      expect(service.getMirroringSettings().smoothingFactor).toBe(0.8);
    });

    it("should update expression mapping", () => {
      service.updateMirroringSettings({
        expressionMapping: {
          neutral: "neutral",
          happy: "excited",
          sad: "sad",
          angry: "angry",
          surprised: "surprised",
          fearful: "concerned",
          disgusted: "angry",
        },
      });

      // Test the new mapping
      service.processDetection({
        faceCount: 1,
        faces: [
          {
            boundingBox: { x: 0, y: 0, width: 100, height: 100 },
            expression: "happy",
            expressionScores: {
              neutral: 0,
              happy: 0.9,
              sad: 0,
              angry: 0,
              surprised: 0,
              fearful: 0,
              disgusted: 0,
            },
          },
        ],
        processingTime: 10,
      });

      expect(service.getMappedAvatarExpression()).toBe("excited");
    });
  });
});

describe("createFaceCaptureService", () => {
  it("should create service via factory function", () => {
    const s = createFaceCaptureService();
    expect(s).toBeInstanceOf(FaceCaptureService);
  });

  it("should pass config to service", () => {
    const s = createFaceCaptureService({ captureIntervalMs: 300 });
    expect(s.getConfig().captureIntervalMs).toBe(300);
  });
});

describe("getFaceCaptureService", () => {
  beforeEach(() => {
    resetFaceCaptureService();
  });

  it("should return singleton instance", () => {
    const s1 = getFaceCaptureService();
    const s2 = getFaceCaptureService();
    expect(s1).toBe(s2);
  });

  it("should reset singleton instance", () => {
    const s1 = getFaceCaptureService();
    resetFaceCaptureService();
    const s2 = getFaceCaptureService();
    expect(s1).not.toBe(s2);
  });
});
