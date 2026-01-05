import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  VisionService,
  createVisionService,
  getVisionService,
  resetVisionService,
} from "./visionService";
import type { ImageAnalysisResult } from "./types";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("VisionService", () => {
  let service: VisionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    service = new VisionService();
    resetVisionService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const s = new VisionService();
      expect(s).toBeDefined();
    });

    it("should create with custom config", () => {
      const s = new VisionService({
        provider: "anthropic",
        maxTokens: 2048,
      });
      expect(s).toBeDefined();
    });
  });

  describe("analyzeImage", () => {
    it("should analyze image from base64 data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            description: "A photo of a cat",
            objects: [{ label: "cat", confidence: 0.95 }],
            imageType: "photo",
            confidence: 0.9,
          }),
        }),
      });

      const result = await service.analyzeImage({
        imageData: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
        prompt: "Describe this image",
      });

      expect(result.description).toBe("A photo of a cat");
      expect(result.objects).toHaveLength(1);
      expect(result.imageType).toBe("photo");
    });

    it("should analyze image from URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            description: "A landscape photo",
            objects: [],
            imageType: "photo",
            confidence: 0.85,
          }),
        }),
      });

      const result = await service.analyzeImage({
        imageUrl: "https://example.com/image.jpg",
        prompt: "What is in this image?",
      });

      expect(result.description).toBe("A landscape photo");
    });

    it("should call API with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            description: "Test",
            objects: [],
            imageType: "unknown",
            confidence: 0.8,
          }),
        }),
      });

      await service.analyzeImage({
        imageData: "data:image/png;base64,abc123",
        prompt: "Analyze this",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/vision/analyze",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      await expect(
        service.analyzeImage({
          imageData: "data:image/png;base64,abc123",
        })
      ).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        service.analyzeImage({
          imageData: "data:image/png;base64,abc123",
        })
      ).rejects.toThrow("Network error");
    });

    it("should parse JSON wrapped in code blocks", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: `\`\`\`json
{
  "description": "A screenshot",
  "objects": [],
  "imageType": "screenshot",
  "confidence": 0.9
}
\`\`\``,
        }),
      });

      const result = await service.analyzeImage({
        imageData: "data:image/png;base64,abc123",
      });

      expect(result.imageType).toBe("screenshot");
    });
  });

  describe("analyzeScreenshot", () => {
    it("should analyze screenshot with OCR focus", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            description: "A code editor window",
            text: "function hello() { return 'world'; }",
            objects: [],
            imageType: "screenshot",
            confidence: 0.9,
          }),
        }),
      });

      const result = await service.analyzeScreenshot(
        "data:image/png;base64,abc123"
      );

      expect(result.text).toContain("function");
      expect(result.imageType).toBe("screenshot");
    });
  });

  describe("describeImage", () => {
    it("should return a simple description", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            description: "A beautiful sunset over the ocean",
            objects: [],
            imageType: "photo",
            confidence: 0.9,
          }),
        }),
      });

      const description = await service.describeImage(
        "data:image/jpeg;base64,abc123"
      );

      expect(description).toBe("A beautiful sunset over the ocean");
    });
  });

  describe("detectObjects", () => {
    it("should return detected objects", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            description: "A scene with multiple objects",
            objects: [
              { label: "person", confidence: 0.95 },
              { label: "dog", confidence: 0.88 },
              { label: "tree", confidence: 0.72 },
            ],
            imageType: "photo",
            confidence: 0.9,
          }),
        }),
      });

      const objects = await service.detectObjects(
        "data:image/jpeg;base64,abc123"
      );

      expect(objects).toHaveLength(3);
      expect(objects[0].label).toBe("person");
    });
  });

  describe("extractText", () => {
    it("should extract text from image", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            description: "A document with text",
            text: "Hello World\nThis is a test document",
            objects: [],
            imageType: "document",
            confidence: 0.9,
          }),
        }),
      });

      const text = await service.extractText("data:image/png;base64,abc123");

      expect(text).toContain("Hello World");
    });

    it("should return empty string if no text found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            description: "A photo without text",
            objects: [],
            imageType: "photo",
            confidence: 0.9,
          }),
        }),
      });

      const text = await service.extractText("data:image/png;base64,abc123");

      expect(text).toBe("");
    });
  });

  describe("validateImage", () => {
    it("should validate supported image format", () => {
      const result = service.validateImage({
        mimeType: "image/jpeg",
        size: 1024 * 1024, // 1MB
      });

      expect(result.valid).toBe(true);
    });

    it("should reject unsupported format", () => {
      const result = service.validateImage({
        mimeType: "image/bmp",
        size: 1024 * 1024,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("format");
    });

    it("should reject oversized images", () => {
      const result = service.validateImage({
        mimeType: "image/jpeg",
        size: 30 * 1024 * 1024, // 30MB
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("size");
    });
  });

  describe("caching", () => {
    it("should cache analysis results", async () => {
      const cachedService = new VisionService();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            description: "Cached result",
            objects: [],
            imageType: "photo",
            confidence: 0.9,
          }),
        }),
      });

      const imageData = "data:image/png;base64,same-image";

      // First call
      await cachedService.analyzeImage({ imageData });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await cachedService.analyzeImage({ imageData });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should clear cache", async () => {
      const cachedService = new VisionService();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            description: "Result",
            objects: [],
            imageType: "photo",
            confidence: 0.9,
          }),
        }),
      });

      const imageData = "data:image/png;base64,same-image";

      await cachedService.analyzeImage({ imageData });
      cachedService.clearCache();
      await cachedService.analyzeImage({ imageData });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe("createVisionService", () => {
  it("should create service via factory function", () => {
    const s = createVisionService();
    expect(s).toBeInstanceOf(VisionService);
  });

  it("should pass config to service", () => {
    const s = createVisionService({
      provider: "anthropic",
    });
    expect(s).toBeInstanceOf(VisionService);
  });
});

describe("getVisionService", () => {
  beforeEach(() => {
    resetVisionService();
  });

  it("should return singleton instance", () => {
    const s1 = getVisionService();
    const s2 = getVisionService();
    expect(s1).toBe(s2);
  });

  it("should reset singleton instance", () => {
    const s1 = getVisionService();
    resetVisionService();
    const s2 = getVisionService();
    expect(s1).not.toBe(s2);
  });
});
