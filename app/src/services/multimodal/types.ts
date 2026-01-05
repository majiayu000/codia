/**
 * Multimodal Understanding System Types
 * 多模态理解系统类型定义
 */

/**
 * Image analysis result
 * 图像分析结果
 */
export interface ImageAnalysisResult {
  /** Description of image content */
  description: string;
  /** Detected objects */
  objects: DetectedObject[];
  /** Detected text (OCR) */
  text?: string;
  /** Detected emotions/mood from the image */
  mood?: string;
  /** Color palette */
  colors?: string[];
  /** Image type classification */
  imageType: ImageType;
  /** Confidence in analysis */
  confidence: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export type ImageType =
  | "photo"
  | "screenshot"
  | "document"
  | "art"
  | "meme"
  | "chart"
  | "diagram"
  | "unknown";

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Vision service configuration
 */
export interface VisionServiceConfig {
  provider: "openai" | "anthropic";
  model?: string;
  maxTokens: number;
  /** Include OCR analysis */
  enableOCR: boolean;
  /** Include object detection */
  enableObjectDetection: boolean;
  /** Maximum image size in bytes */
  maxImageSize: number;
  /** Supported image formats */
  supportedFormats: string[];
}

export const DEFAULT_VISION_CONFIG: VisionServiceConfig = {
  provider: "openai",
  model: "gpt-4o",
  maxTokens: 1024,
  enableOCR: true,
  enableObjectDetection: true,
  maxImageSize: 20 * 1024 * 1024, // 20MB
  supportedFormats: ["image/jpeg", "image/png", "image/gif", "image/webp"],
};

/**
 * Face detection result
 * 面部检测结果
 */
export interface FaceDetectionResult {
  /** Number of faces detected */
  faceCount: number;
  /** Detected faces */
  faces: DetectedFace[];
  /** Processing time in ms */
  processingTime: number;
}

export interface DetectedFace {
  /** Bounding box of the face */
  boundingBox: BoundingBox;
  /** Facial landmarks */
  landmarks?: FacialLandmarks;
  /** Detected expression */
  expression: FaceExpression;
  /** Expression confidence scores */
  expressionScores: Record<FaceExpression, number>;
  /** Head pose estimation */
  headPose?: HeadPose;
}

export type FaceExpression =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "fearful"
  | "disgusted";

export interface FacialLandmarks {
  leftEye: Point;
  rightEye: Point;
  nose: Point;
  leftMouth: Point;
  rightMouth: Point;
  /** Additional landmarks */
  additional?: Point[];
}

export interface Point {
  x: number;
  y: number;
}

export interface HeadPose {
  pitch: number; // Up/down
  yaw: number;   // Left/right
  roll: number;  // Tilt
}

/**
 * Face capture service configuration
 */
export interface FaceCaptureConfig {
  /** Enable face capture */
  enabled: boolean;
  /** Capture interval in ms */
  captureIntervalMs: number;
  /** Minimum confidence for detection */
  minConfidence: number;
  /** Mirror the video feed */
  mirrorVideo: boolean;
  /** Enable expression mirroring */
  enableMirroring: boolean;
  /** Mirroring intensity (0-1) */
  mirroringIntensity: number;
}

export const DEFAULT_FACE_CAPTURE_CONFIG: FaceCaptureConfig = {
  enabled: false,
  captureIntervalMs: 100,
  minConfidence: 0.5,
  mirrorVideo: true,
  enableMirroring: true,
  mirroringIntensity: 0.5,
};

/**
 * Face capture service state
 */
export interface FaceCaptureState {
  isCapturing: boolean;
  lastCapture: Date | null;
  lastFaceDetection: FaceDetectionResult | null;
  hasPermission: boolean;
  errorMessage?: string;
}

/**
 * Expression mirroring settings
 */
export interface ExpressionMirroringSettings {
  /** Map user expressions to avatar expressions */
  expressionMapping: Record<FaceExpression, string>;
  /** Smoothing factor for expression transitions */
  smoothingFactor: number;
  /** Delay before applying expression (ms) */
  delayMs: number;
  /** Expressions to ignore */
  ignoredExpressions: FaceExpression[];
}

export const DEFAULT_MIRRORING_SETTINGS: ExpressionMirroringSettings = {
  expressionMapping: {
    neutral: "neutral",
    happy: "happy",
    sad: "sad",
    angry: "angry",
    surprised: "surprised",
    fearful: "concerned",
    disgusted: "angry",
  },
  smoothingFactor: 0.3,
  delayMs: 100,
  ignoredExpressions: [],
};
