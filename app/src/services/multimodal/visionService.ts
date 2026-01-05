/**
 * Vision Service
 * 视觉服务 - 使用 LLM 进行图像分析
 */

import type {
  ImageAnalysisResult,
  DetectedObject,
  VisionServiceConfig,
} from "./types";
import { DEFAULT_VISION_CONFIG } from "./types";

export interface AnalyzeImageParams {
  imageData?: string; // Base64 data URL
  imageUrl?: string;
  prompt?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Vision Service for image analysis
 */
export class VisionService {
  private config: VisionServiceConfig;
  private cache: Map<string, { result: ImageAnalysisResult; timestamp: number }> = new Map();
  private cacheTTL = 300000; // 5 minutes

  constructor(config: Partial<VisionServiceConfig> = {}) {
    this.config = { ...DEFAULT_VISION_CONFIG, ...config };
  }

  /**
   * Analyze an image
   */
  async analyzeImage(params: AnalyzeImageParams): Promise<ImageAnalysisResult> {
    const { imageData, imageUrl, prompt } = params;

    if (!imageData && !imageUrl) {
      throw new Error("Either imageData or imageUrl is required");
    }

    // Check cache
    const cacheKey = imageData || imageUrl || "";
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    // Call API
    const result = await this.callVisionAPI(imageData, imageUrl, prompt);

    // Cache result
    this.cache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Analyze a screenshot with OCR focus
   */
  async analyzeScreenshot(imageData: string): Promise<ImageAnalysisResult> {
    return this.analyzeImage({
      imageData,
      prompt: "Analyze this screenshot. Focus on extracting any visible text (OCR) and describing the UI elements and content shown.",
    });
  }

  /**
   * Get a simple description of an image
   */
  async describeImage(imageData: string): Promise<string> {
    const result = await this.analyzeImage({
      imageData,
      prompt: "Provide a brief, natural description of this image.",
    });
    return result.description;
  }

  /**
   * Detect objects in an image
   */
  async detectObjects(imageData: string): Promise<DetectedObject[]> {
    const result = await this.analyzeImage({
      imageData,
      prompt: "Identify and list all objects visible in this image with confidence scores.",
    });
    return result.objects;
  }

  /**
   * Extract text from an image (OCR)
   */
  async extractText(imageData: string): Promise<string> {
    const result = await this.analyzeImage({
      imageData,
      prompt: "Extract all visible text from this image. Return the text exactly as it appears.",
    });
    return result.text || "";
  }

  /**
   * Validate image before processing
   */
  validateImage(params: { mimeType: string; size: number }): ValidationResult {
    const { mimeType, size } = params;

    // Check format
    if (!this.config.supportedFormats.includes(mimeType)) {
      return {
        valid: false,
        error: `Unsupported image format: ${mimeType}. Supported formats: ${this.config.supportedFormats.join(", ")}`,
      };
    }

    // Check size
    if (size > this.config.maxImageSize) {
      return {
        valid: false,
        error: `Image size (${Math.round(size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(this.config.maxImageSize / 1024 / 1024)}MB)`,
      };
    }

    return { valid: true };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ================== Private Methods ==================

  private async callVisionAPI(
    imageData?: string,
    imageUrl?: string,
    prompt?: string
  ): Promise<ImageAnalysisResult> {
    const defaultPrompt = `Analyze this image and provide:
1. A description of what's in the image
2. Any detected objects with confidence scores
3. Any visible text (if OCR is enabled)
4. The type of image (photo, screenshot, document, art, meme, chart, diagram)
5. The overall mood/emotion if applicable
6. Main colors in the image

Return the response as JSON with this structure:
{
  "description": "string",
  "objects": [{"label": "string", "confidence": number}],
  "text": "string or null",
  "imageType": "photo|screenshot|document|art|meme|chart|diagram|unknown",
  "mood": "string or null",
  "colors": ["string"],
  "confidence": number
}`;

    const response = await fetch("/api/vision/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageData,
        imageUrl,
        prompt: prompt || defaultPrompt,
        provider: this.config.provider,
        model: this.config.model,
        maxTokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseAnalysisResult(data.result);
  }

  private parseAnalysisResult(resultStr: string): ImageAnalysisResult {
    // Handle JSON wrapped in code blocks
    let jsonStr = resultStr;
    const codeBlockMatch = resultStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);

      return {
        description: parsed.description || "",
        objects: (parsed.objects || []).map((obj: any) => ({
          label: obj.label || "",
          confidence: obj.confidence || 0,
          boundingBox: obj.boundingBox,
        })),
        text: parsed.text || undefined,
        mood: parsed.mood || undefined,
        colors: parsed.colors || undefined,
        imageType: parsed.imageType || "unknown",
        confidence: parsed.confidence || 0.5,
        metadata: parsed.metadata,
      };
    } catch (error) {
      // If parsing fails, return a basic result
      return {
        description: resultStr,
        objects: [],
        imageType: "unknown",
        confidence: 0.3,
      };
    }
  }
}

/**
 * Factory function
 */
export function createVisionService(
  config?: Partial<VisionServiceConfig>
): VisionService {
  return new VisionService(config);
}

// Singleton
let defaultInstance: VisionService | null = null;

export function getVisionService(): VisionService {
  if (!defaultInstance) {
    defaultInstance = new VisionService();
  }
  return defaultInstance;
}

export function resetVisionService(): void {
  defaultInstance = null;
}
