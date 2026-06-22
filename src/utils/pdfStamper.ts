import { PDFDocument, degrees } from 'pdf-lib';
import { PDFDocumentFile, PlacedElement } from '../types';
import { renderStampToDataUrl } from './canvasRenderer';

/**
 * Helper to convert Data URL (base64) to Uint8Array
 */
function dataURLToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const base64 = parts[1] || parts[0];
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Stamps all elements onto the PDF and returns the saved PDF as an ArrayBuffer.
 */
export async function stampPdfDocument(
  file: PDFDocumentFile,
  originalArrayBuffer: ArrayBuffer
): Promise<Uint8Array> {
  // Load original PDF document
  const pdfDoc = await PDFDocument.load(originalArrayBuffer);
  const pages = pdfDoc.getPages();
  
  // Group elements by page index to optimize drawing
  const elementsByPage: { [pageIndex: number]: PlacedElement[] } = {};
  file.placedElements.forEach((el) => {
    const pageIdx = el.pageNumber - 1; // pageNumber is 1-indexed
    if (!elementsByPage[pageIdx]) {
      elementsByPage[pageIdx] = [];
    }
    elementsByPage[pageIdx].push(el);
  });
  
  // Iterate through pages and stamp elements
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    
    // Apply user-specified rotation first if any
    const userRotation = file.pageRotations?.[pageIdx + 1] || 0;
    if (userRotation !== 0) {
      const originalRot = page.getRotation().angle;
      const finalRot = (originalRot + userRotation) % 360;
      page.setRotation(degrees(finalRot));
    }

    const pageElements = elementsByPage[pageIdx];
    if (!pageElements || pageElements.length === 0) continue;
    
    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    for (const el of pageElements) {
      // 1. Get the visual representation of this stamp
      let stampPngUrl = '';
      if (el.type === 'image' && el.imageDataUrl) {
        stampPngUrl = el.imageDataUrl;
      } else {
        // Render text/shape seals dynamically on-the-fly at high res
        // (using scale = 4 for absolute crisp index in PDF print)
        stampPngUrl = renderStampToDataUrl({
          type: el.type,
          text: el.text,
          subText: el.subText,
          textColor: el.textColor,
          borderColor: el.borderColor,
          fontFamily: el.fontFamily,
          hasBorder: el.hasBorder,
          isDoubleBorder: el.isDoubleBorder,
          width: el.width,
          height: el.height
        }, { scale: 5 });
      }
      
      try {
        // Embed image bytes
        const imageBytes = dataURLToUint8Array(stampPngUrl);
        const embeddedImage = await pdfDoc.embedPng(imageBytes);
        
        // 2. Map coordinates considering page rotation in pdf-lib:
        // Some scanned PDFs have a rotation angle (e.g. 90, 180, 270 degrees) applied to pages.
        // On screen, these pages are rendered visually upright by pdf.js, so the user places stamps 
        // relative to the upright viewport. We must translate visual percentage coordinates back 
        // to pdf-lib's unrotated coordinate system and adjust the drawing rotation around the stamp center.
        
        const rotationVal = page.getRotation();
        const pageRotation = ((rotationVal?.angle || 0) % 360 + 360) % 360; // 0, 90, 180, 270
        
        // Retrieve crop box or media box offset parameters to handle cropped/shifted files perfectly
        const cropBox = page.getCropBox() || page.getMediaBox() || { x: 0, y: 0 };
        const cropX = cropBox.x || 0;
        const cropY = cropBox.y || 0;
        
        // Visual (upright) page dimensions
        const visualWidth = (pageRotation === 90 || pageRotation === 270) ? pageHeight : pageWidth;
        const visualHeight = (pageRotation === 90 || pageRotation === 270) ? pageWidth : pageHeight;
        
        // Translate percentage visual coords to visual point coordinates
        const vx = (el.x / 100) * visualWidth;
        const vy = (el.y / 100) * visualHeight;
        const vw = el.width;
        const vh = el.height;
        
        // Calculate visual center of stamp
        const cx_v = vx + vw / 2;
        const cy_v = vy + vh / 2;
        
        // Map visual center to unrotated page coordinates
        let cx_u = cx_v;
        let cy_u = pageHeight - cy_v;
        
        if (pageRotation === 90) {
          cx_u = cy_v;
          cy_u = cx_v;
        } else if (pageRotation === 180) {
          cx_u = pageWidth - cx_v;
          cy_u = cy_v;
        } else if (pageRotation === 270) {
          cx_u = pageWidth - cy_v;
          cy_u = pageHeight - cx_v;
        }
        
        // Calculate stamp's rotation parameter for pdf-lib's counter-clockwise drawImage
        // Since el.rotation is visual clockwise, and visual orientation is rotated by pageRotation clockwise,
        // we counteract the page rotation: drawing angle (CCW) = pageRotation (CW) - stampRotation (CW)
        const stampRotation = el.rotation || 0;
        const drawRotationDegrees = ((pageRotation - stampRotation) % 360 + 360) % 360;
        const theta = (drawRotationDegrees * Math.PI) / 180; // CCW radians
        
        // Since pdf-lib draws from the bottom-left corner and rotates around it,
        // calculate the bottom-left coordinates (drawX, drawY) that yield the target center (cx_u, cy_u)
        const cx_offset = (vw / 2) * Math.cos(theta) - (vh / 2) * Math.sin(theta);
        const cy_offset = (vw / 2) * Math.sin(theta) + (vh / 2) * Math.cos(theta);
        
        const drawX = cx_u - cx_offset + cropX;
        const drawY = cy_u - cy_offset + cropY;
        
        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: vw,
          height: vh,
          opacity: el.opacity,
          rotate: degrees(drawRotationDegrees),
        });
      } catch (err) {
        console.error('Failed to stamp element:', el, err);
      }
    }
  }
  
  // Save modifications
  return await pdfDoc.save();
}

/**
 * Downloads a Uint8Array as file. Perfect fallback with File System Access API integration.
 */
export async function downloadPdfFile(
  bytes: Uint8Array,
  suggestedName: string
): Promise<boolean> {
  // Attempt File System Access API
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'PDF Document',
          accept: { 'application/pdf': ['.pdf'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(bytes);
      await writable.close();
      return true;
    } catch (err: any) {
      // Aborted by user is fine, ignore. Other errors fallback
      if (err.name === 'AbortError') {
        return false;
      }
      console.warn('File System Access API failed or rejected, falling back to standard download.', err);
    }
  }
  
  // Standard fallback downloader
  try {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return true;
  } catch (err) {
    console.error('Standard download failed:', err);
    return false;
  }
}
