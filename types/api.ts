/**
 * TypeScript interfaces for Bullet Detector API responses.
 *
 * These interfaces define the structure of responses returned by the bullet detector API
 * and provide type safety when consuming the API in TypeScript/JavaScript applications.
 */

export interface Detection {
  /** Bounding box coordinates [x1, y1, x2, y2] */
  bbox: [number, number, number, number];
  /** Center coordinates [cx, cy] */
  center: [number, number];
  /** Detection confidence score (0.0-1.0) */
  confidence: number;
}

export interface DetectionStats {
  /** Count of high confidence detections (>0.6) */
  high: number;
  /** Count of medium confidence detections (0.4-0.6) */
  medium: number;
  /** Count of low confidence detections (<0.4) */
  low: number;
}

export interface ModelInfo {
  /** Model name */
  name: string;
  /** Minimum confidence threshold used */
  confidence_threshold: number;
}

export interface Metadata {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Original file size in bytes */
  file_size_bytes: number;
  /** Path to processed image file */
  image_path: string;
}

export interface QuadrantPoint {
  /** Original detection index */
  index: number;
  /** Center coordinates [cx, cy] */
  center: [number, number];
  /** Detection confidence score */
  confidence: number;
}

export interface QuadrantPair {
  /** Indices of the two farthest points */
  indices: [number, number];
  /** Distance in pixels */
  distance_px: number;
  /** Distance in millimeters (if calibrated) */
  distance_mm: number | null;
  /** Distance in centimeters (if calibrated) */
  distance_cm?: number | null;
}

export interface ScaleInfo {
  /** Pixels per centimeter */
  pixels_per_cm: number;
  /** Pixels per millimeter */
  pixels_per_mm: number;
  /** Centimeters per pixel */
  cm_per_pixel: number;
  /** Millimeters per pixel */
  mm_per_pixel: number;
  /** Image width in pixels */
  image_width_px: number;
  /** Image height in pixels */
  image_height_px: number;
  /** Detected page format (e.g., "A4") */
  page_format?: string;
  /** Page width in mm */
  page_width_mm?: number;
  /** Page height in mm */
  page_height_mm?: number;
  /** Calibration note */
  calibration_note?: string;
}

export interface OverallStats {
  /** All detection points */
  points: QuadrantPoint[];
  /** Total detection count */
  count: number;
  /** Farthest pair of points (largest group) */
  max_pair: QuadrantPair;
  /** Closest pair of points (tightest) */
  min_pair: QuadrantPair;
  /** Average distance between all pairs */
  avg_distance: number;
  /** Horizontal spread in pixels */
  spread_x: number;
  /** Vertical spread in pixels */
  spread_y: number;
  /** Center of mass [x, y] */
  center_of_mass: [number, number];
  /** Density (detections per area) */
  density?: number;
}

export interface QuadrantResult {
  /** All detection points in this quadrant */
  points: QuadrantPoint[];
  /** Number of detections in this quadrant */
  count: number;
  /** Farthest pair of points in this quadrant */
  max_pair: QuadrantPair;
}

export interface QuadrantStats {
  /** Top-left quadrant results */
  tl: QuadrantResult;
  /** Top-right quadrant results */
  tr: QuadrantResult;
  /** Bottom-left quadrant results */
  bl: QuadrantResult;
  /** Bottom-right quadrant results */
  br: QuadrantResult;
}

export interface AnalyzeResponse {
  /** Whether the analysis was successful */
  success: boolean;
  /** Unique session identifier */
  session_id: string;
  /** Short session identifier */
  session_short: string;
  /** Original filename */
  filename: string;
  /** List of detected bullet holes */
  detections: Detection[];
  /** Detection confidence statistics */
  stats: DetectionStats;
  /** Processing time in seconds */
  processing_time_s: number;
  /** Information about the detection model */
  model_info: ModelInfo;
  /** Image and processing metadata */
  metadata: Metadata;
  /** Base64-encoded original image (JPEG) */
  original_image_base64: string;
  /** Base64-encoded annotated image (JPEG) */
  annotated_image_base64: string;
  /** ISO timestamp of analysis */
  timestamp: string;
  /** Quadrant analysis results (pixels) */
  quadrant_stats: QuadrantStats;
  /** Quadrant analysis results (millimeters) */
  quadrant_stats_mm: QuadrantStats;
  /** Overall stats for all detections (pixels) */
  overall_stats?: OverallStats;
  /** Overall stats with real-world measurements (mm/cm) */
  overall_stats_mm?: OverallStats;
  /** Scale/calibration information */
  scale_info?: ScaleInfo;
}

export interface BatchFileResult {
  /** Whether this file was processed successfully */
  success: boolean;
  /** Session ID (if successful) */
  session_id?: string;
  /** Short session ID (if successful) */
  session_short?: string;
  /** Original filename */
  filename: string;
  /** Detections (if successful) */
  detections?: Detection[];
  /** Stats (if successful) */
  stats?: DetectionStats;
  /** Processing time (if successful) */
  processing_time_s?: number;
  /** Metadata (if successful) */
  metadata?: Metadata;
  /** Quadrant stats (if successful) */
  quadrant_stats?: QuadrantStats;
  /** Error message (if failed) */
  error?: string;
  /** HTTP status code (if failed) */
  status_code?: number;
}

export interface BatchAnalyzeResponse {
  /** Whether the batch processing was successful */
  success: boolean;
  /** Results for each file */
  results: BatchFileResult[];
  /** Total number of files submitted */
  total_files: number;
  /** Number of files successfully processed */
  processed_files: number;
  /** Total processing time in seconds */
  total_processing_time_s: number;
  /** ISO timestamp of batch analysis */
  timestamp: string;
}

export interface ErrorResponse {
  /** Always false for error responses */
  success: false;
  /** Error message */
  error: string;
  /** Additional error details */
  detail?: string;
  /** HTTP status code */
  status_code?: number;
}

export interface HealthResponse {
  /** Service status */
  status: string;
  /** Whether the model is loaded */
  model_loaded: boolean;
  /** ISO timestamp */
  timestamp: string;
}

export interface ModelInfoResponse {
  /** Model name */
  model_name: string;
  /** Available classes */
  classes: string[];
  /** Input size */
  input_size: number;
  /** Model file size */
  model_size: number;
  /** Model version */
  version: string;
}

// Union type for all possible API responses
export type ApiResponse =
  | AnalyzeResponse
  | BatchAnalyzeResponse
  | HealthResponse
  | ModelInfoResponse
  | ErrorResponse;

// Type guards for response validation
export function isAnalyzeResponse(response: any): response is AnalyzeResponse {
  return (
    response &&
    typeof response.success === "boolean" &&
    Array.isArray(response.detections) &&
    typeof response.original_image_base64 === "string" &&
    typeof response.annotated_image_base64 === "string"
  );
}

export function isBatchAnalyzeResponse(
  response: any
): response is BatchAnalyzeResponse {
  return (
    response &&
    typeof response.success === "boolean" &&
    Array.isArray(response.results) &&
    typeof response.total_files === "number"
  );
}

export function isErrorResponse(response: any): response is ErrorResponse {
  return (
    response && response.success === false && typeof response.error === "string"
  );
}

export function isHealthResponse(response: any): response is HealthResponse {
  return (
    response &&
    typeof response.status === "string" &&
    typeof response.model_loaded === "boolean"
  );
}
