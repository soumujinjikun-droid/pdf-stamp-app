/**
 * Type declarations for the PDF Stamping app
 */

export type StampType = 'text' | 'round_seal' | 'square_seal' | 'image' | 'date_seal' | 'checkmark';

export interface StampTemplate {
  id: string;
  name: string;
  type: StampType;
  text?: string;
  subText?: string; // e.g., corporate stamp top/bottom
  textColor: string; // Hex color
  borderColor: string; // Hex color
  fontFamily: string;
  hasBorder: boolean;
  isDoubleBorder?: boolean;
  width: number; // default width in pixels as design guideline
  height: number; // default height in pixels
  opacity: number; // 0 to 1
  imageDataUrl?: string; // base64 encoded image
  isFavorite: boolean;
  isBuiltIn: boolean;
}

export interface PlacedElement {
  id: string;
  templateId?: string;
  type: StampType;
  text?: string;
  subText?: string;
  textColor: string;
  borderColor: string;
  fontFamily: string;
  hasBorder: boolean;
  isDoubleBorder?: boolean;
  imageDataUrl?: string;
  // Position representing percentage (0-100) of page size
  x: number; 
  y: number; 
  // Physical design size (pt or px matched to canvas scale)
  width: number;
  height: number;
  rotation: number; // 0 to 359 degrees
  opacity: number; // 0 to 1
  pageNumber: number; // 1-based page index
}

export interface PDFDocumentFile {
  id: string;
  name: string;
  size: number;
  arrayBuffer: ArrayBuffer;
  placedElements: PlacedElement[];
  thumbnailPageUrls: string[]; // dynamic base64 page thumbnail previews
  pageDimensions: { width: number; height: number }[]; // array of {width, height} in PDF points (72 points/inch)
  pageRotations?: { [pageNumber: number]: number }; // angle: 0, 90, 180, 270 degrees
  history: {
    past: PlacedElement[][];
    future: PlacedElement[][];
  };
}

export type StampingMode = 'auto_advance' | 'free_mode';

export interface Guideline {
  type: 'x' | 'y';
  value: number; // percentage value
}

export interface MultiStampItem {
  type: StampType;
  text?: string;
  subText?: string;
  textColor: string;
  borderColor: string;
  fontFamily: string;
  hasBorder: boolean;
  isDoubleBorder?: boolean;
  imageDataUrl?: string;
  width: number;
  height: number;
  opacity: number;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  rotation: number;
}

export interface StampSetTemplate {
  id: string;
  name: string;
  items: MultiStampItem[];
  isBuiltIn: boolean;
}
