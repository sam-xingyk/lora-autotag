
export interface ImageAsset {
  id: string;
  originalFile: File;
  previewUrl: string;
  croppedBlob?: Blob; // The final image to be exported/analyzed
  fileName: string; // Calculated name (e.g., image001)
  caption: string; // This corresponds to the "Integrated" (整合后) column
  isGenerating: boolean;
  crop: CropArea; // Stored crop percentage
  croppedUrl?: string;
  width?: number;
  height?: number;
  metadata?: ImageMetadata; // Detailed analysis fields
}

export interface ImageMetadata {
  triggerWord: string;
  aiUnderstanding: string;
  subject: { en: string; cn: string };
  scene: { en: string; cn: string };
  lighting: { en: string; cn: string };
  perspective: { en: string; cn: string };
  quality: { en: string; cn: string };
  style: { en: string; cn: string };
}

export enum AppStep {
  UPLOAD = 1,
  CAPTION = 2,
  EXPORT = 3,
}

export interface CropArea {
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width: number; // Percentage 0-100
  height: number; // Percentage 0-100
}

export interface NamingConfig {
  prefix: string;
  start: number;
  digits: number;
}

export interface CropSettings {
  width?: number;
  height?: number;
}

export type ApiProvider = 'gemini' | 'openai';
