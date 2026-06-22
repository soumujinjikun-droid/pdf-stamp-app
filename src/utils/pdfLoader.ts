import { loadPdfJS } from './pdfScripts';

export interface PDFMetadata {
  numPages: number;
  pageDimensions: { width: number; height: number }[];
  thumbnailPageUrls: string[];
}

/**
 * Loads and parses a PDF document to generate dimensions and visual page previews.
 */
export async function parsePdfDocument(arrayBuffer: ArrayBuffer, onProgress?: (msg: string) => void): Promise<PDFMetadata> {
  onProgress?.('PDFエンジンを初期化中...');
  const pdfjsLib = await loadPdfJS();
  
  onProgress?.('PDFドキュメントを読み込み中...');
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
  const pdfDoc = await loadingTask.promise;
  
  const numPages = pdfDoc.numPages;
  const pageDimensions: { width: number; height: number }[] = [];
  const thumbnailPageUrls: string[] = [];
  
  for (let i = 1; i <= numPages; i++) {
    onProgress?.(`ページを解析中 (${i}/${numPages})...`);
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Store original points dimension (e.g. 595 x 842 for A4)
    pageDimensions.push({
      width: viewport.width,
      height: viewport.height
    });
    
    // Generate page thumbnail preview (using scale 0.25 to 0.3 for visual snappiness)
    const thumbScale = Math.min(180 / viewport.width, 240 / viewport.height);
    const thumbViewport = page.getViewport({ scale: thumbScale });
    
    const canvas = document.createElement('canvas');
    canvas.width = thumbViewport.width;
    canvas.height = thumbViewport.height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const renderContext = {
        canvasContext: ctx,
        viewport: thumbViewport,
      };
      await page.render(renderContext).promise;
      thumbnailPageUrls.push(canvas.toDataURL('image/jpeg', 0.8));
    } else {
      thumbnailPageUrls.push('');
    }
  }
  
  return {
    numPages,
    pageDimensions,
    thumbnailPageUrls
  };
}

/**
 * Renders a specific single page to a canvas container.
 */
export async function renderPdfPageToCanvas(
  arrayBuffer: ArrayBuffer,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5,
  rotationAngle: number = 0,
  onRenderTask?: (renderTask: any) => void
): Promise<{ width: number; height: number }> {
  const pdfjsLib = await loadPdfJS();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNumber);
  
  const currentRotation = ((page.rotate || 0) + rotationAngle) % 360;
  const viewport = page.getViewport({ scale, rotation: currentRotation });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };
  
  const renderTask = page.render(renderContext);
  if (onRenderTask) {
    onRenderTask(renderTask);
  }
  await renderTask.promise;
  
  return {
    width: viewport.width,
    height: viewport.height
  };
}
