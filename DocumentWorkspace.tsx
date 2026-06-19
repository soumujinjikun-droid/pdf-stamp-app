import { StampTemplate, PlacedElement } from '../types';

/**
 * Generates a high-quality data URL representing the stamp.
 * We render at a higher resolution (e.g. scale = 4) to ensure high DPI outputs when embedded in PDFs.
 */
export function renderStampToDataUrl(
  stamp: Partial<StampTemplate> & Pick<StampTemplate, 'type' | 'textColor' | 'borderColor' | 'fontFamily' | 'hasBorder' | 'width' | 'height'>,
  options: { scale?: number; fontLoaded?: boolean } = {}
): string {
  const scale = options.scale || 4;
  const canvas = document.createElement('canvas');
  
  // Set canvas dimension based on target template dimensions multiplied by scale
  const w = stamp.width * scale;
  const h = stamp.height * scale;
  canvas.width = w;
  canvas.height = h;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  ctx.clearRect(0, 0, w, h);
  
  const color = stamp.textColor || '#e34326';
  const borderCol = stamp.borderColor || color;
  const font = stamp.fontFamily || 'sans-serif';
  
  // High quality settings
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.strokeStyle = borderCol;
  ctx.fillStyle = color;
  
  const centerText = stamp.text || '';
  const subText = stamp.subText || '';
  
  if (stamp.type === 'checkmark') {
    // Elegant checkmark drawing
    ctx.lineWidth = 12 * (scale / 4);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color; // e.g. standard green or red
    
    ctx.beginPath();
    // Path for ✓
    ctx.moveTo(w * 0.15, h * 0.55);
    ctx.lineTo(w * 0.42, h * 0.82);
    ctx.lineTo(w * 0.85, h * 0.2);
    ctx.stroke();
  }
  else if (stamp.type === 'round_seal') {
    const size = Math.min(w, h);
    const radius = size / 2;
    const cx = w / 2;
    const cy = h / 2;
    
    // Draw outer circle
    ctx.lineWidth = 6 * (scale / 4);
    ctx.beginPath();
    ctx.arc(cx, cy, radius - ctx.lineWidth, 0, Math.PI * 2);
    ctx.stroke();
    
    if (stamp.isDoubleBorder) {
      ctx.lineWidth = 2 * (scale / 4);
      ctx.beginPath();
      ctx.arc(cx, cy, radius - ctx.lineWidth * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw text
    setupFont(ctx, font, centerText, subText ? radius * 0.45 : radius * 0.9, scale, !!stamp.subText);
    
    if (subText) {
      // Split layout (e.g. Corporate Department at top, Name at bottom)
      ctx.lineWidth = 3 * (scale / 4);
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.7, cy);
      ctx.lineTo(cx + radius * 0.7, cy);
      ctx.stroke();
      
      // Top Text
      ctx.font = `bold ${Math.floor(13 * scale)}px "${font}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(subText, cx, cy - 4 * scale);
      
      // Center Text
      ctx.font = `bold ${Math.floor(14 * scale)}px "${font}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(centerText, cx, cy + 4 * scale);
    } else {
      // Traditional Japanese Round Personal Seal (vertical text layout works best)
      const textLen = centerText.length;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (textLen > 1 && font.includes('Serif')) {
        // Vertical layout for Japanese Mincho/Serif style
        const charSize = Math.floor((radius * 0.8) / Math.max(1, Math.min(textLen, 3)));
        ctx.font = `bold ${charSize}px "${font}"`;
        
        for (let i = 0; i < textLen; i++) {
          const charY = cy - (textLen - 1) * charSize * 0.5 + i * charSize;
          ctx.fillText(centerText[i], cx, charY);
        }
      } else {
        // Horizontal auto-fit spacing
        ctx.fillText(centerText, cx, cy);
      }
    }
  } 
  else if (stamp.type === 'square_seal') {
    const rx = 8 * scale; // slight rounded corner for authentic seal
    const pad = 6 * scale;
    
    ctx.lineWidth = 8 * (scale / 4);
    drawRoundedRect(ctx, pad, pad, w - pad * 2, h - pad * 2, rx);
    ctx.stroke();
    
    if (stamp.isDoubleBorder) {
      ctx.lineWidth = 2 * (scale / 4);
      const pad2 = 14 * scale;
      drawRoundedRect(ctx, pad2, pad2, w - pad2 * 2, h - pad2 * 2, rx * 0.6);
      ctx.stroke();
    }
    
    // Draw Corporate Text (Vertically split is very professional for Square corporate seals!)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const chars = centerText.split('');
    const len = chars.length;
    
    if (len > 0) {
      // Form general 2x2, 2x3, 3x3 layout for "角印"
      // Default: arrange in elegant grid matching traditional seals (right to left columns, top to bottom)
      const numCols = Math.ceil(Math.sqrt(len));
      const colWidth = (w - pad * 4) / numCols;
      
      // We often read Japanese company seals in columns from Right to Left!
      // Example: 'ABC株式会社' splits and rendered right-to-left
      // Let's make it a smart layout helper based on simple line wraps or an elegant vertical distribution.
      if (centerText.includes('\n')) {
        const lines = centerText.split('\n');
        const count = lines.length;
        const colW = (w - pad * 4) / count;
        // Draw each vertical column
        lines.forEach((line, colIdx) => {
          // Right-to-left columns
          const reversedColIdx = count - 1 - colIdx; 
          const targetX = pad * 2 + reversedColIdx * colW + colW / 2;
          const charCount = line.length;
          const charH = (h - pad * 4) / charCount;
          
          ctx.font = `bold ${Math.floor(Math.min(colW * 0.8, charH * 0.85))}px "${font}"`;
          for (let i = 0; i < charCount; i++) {
            const targetY = pad * 2 + i * charH + charH / 2;
            ctx.fillText(line[i], targetX, targetY);
          }
        });
      } else {
        // Multi-line stack standard auto wrapping
        // Default wrapped lines
        let charsPerCol = 3;
        if (len <= 4) charsPerCol = 2;
        else if (len <= 9) charsPerCol = 3;
        else charsPerCol = 4;
        
        const lines: string[] = [];
        for (let i = 0; i < len; i += charsPerCol) {
          lines.push(centerText.substring(i, i + charsPerCol));
        }
        
        const count = lines.length;
        const colW = (w - pad * 4) / count;
        
        lines.forEach((line, colIdx) => {
          // Right-to-left layout
          const reversedColIdx = count - 1 - colIdx;
          const targetX = pad * 2 + reversedColIdx * colW + colW / 2;
          const charCount = line.length;
          const charH = (h - pad * 4) / charCount;
          
          ctx.font = `bold ${Math.floor(Math.min(colW * 0.8, charH * 0.85))}px "${font}"`;
          for (let i = 0; i < charCount; i++) {
            const targetY = pad * 2 + i * charH + charH / 2;
            ctx.fillText(line[i], targetX, targetY);
          }
        });
      }
    }
  } 
  else if (stamp.type === 'date_seal') {
    // 3-band Date Stamp ("データーネーム印")
    const size = Math.min(w, h);
    const radius = size / 2;
    const cx = w / 2;
    const cy = h / 2;
    
    // Outer circle
    ctx.lineWidth = 5 * (scale / 4);
    ctx.beginPath();
    ctx.arc(cx, cy, radius - ctx.lineWidth, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw two horizontal separating bars inside
    ctx.lineWidth = 3 * (scale / 4);
    const lineOffset = radius * 0.32;
    
    ctx.beginPath();
    // Top dividing line
    ctx.moveTo(cx - radius * Math.cos(Math.asin(lineOffset / radius)), cy - lineOffset);
    ctx.lineTo(cx + radius * Math.cos(Math.asin(lineOffset / radius)), cy - lineOffset);
    // Bottom dividing line
    ctx.moveTo(cx - radius * Math.cos(Math.asin(lineOffset / radius)), cy + lineOffset);
    ctx.lineTo(cx + radius * Math.cos(Math.asin(lineOffset / radius)), cy + lineOffset);
    ctx.stroke();
    
    ctx.textAlign = 'center';
    
    // Top Text (e.g. Department or Title like "確認" or "承認")
    const topTextVal = subText || '確認済';
    ctx.font = `bold ${Math.floor(11 * scale)}px "${font}"`;
    ctx.textBaseline = 'middle';
    ctx.fillText(topTextVal, cx, cy - radius * 0.55);
    
    // Middle Text (Date e.g. "2026.06.17")
    // Keep text smaller if length is long
    const dateTextVal = centerText || new Date().toISOString().split('T')[0];
    const dateFontSize = dateTextVal.length > 10 ? 8 : 10;
    ctx.font = `bold ${Math.floor(dateFontSize * scale)}px "sans-serif"`; // force clean sans-serif for numbers
    ctx.textBaseline = 'middle';
    ctx.fillText(dateTextVal, cx, cy);
    
    // Bottom Text (Name of person who handles it)
    const bottomTextVal = stamp.name && stamp.name !== 'データー印' && stamp.name !== '日付印' ? stamp.name : '佐藤';
    const bottomTextClean = bottomTextVal.length > 4 ? bottomTextVal.slice(0, 4) : bottomTextVal;
    ctx.font = `bold ${Math.floor(12 * scale)}px "${font}"`;
    ctx.textBaseline = 'middle';
    ctx.fillText(bottomTextClean, cx, cy + radius * 0.55);
  } 
  else if (stamp.type === 'text') {
    // Text stamp / Office banner (e.g., "社外秘", "至急", "ご注文ありがとうございました。")
    const padX = 8 * scale;
    const padY = 6 * scale;
    
    if (stamp.hasBorder) {
      ctx.lineWidth = 4 * (scale / 4);
      drawRoundedRect(ctx, padX, padY, w - padX * 2, h - padY * 2, 4 * scale);
      ctx.stroke();
      
      if (stamp.isDoubleBorder) {
        ctx.lineWidth = 1 * (scale / 4);
        drawRoundedRect(ctx, padX + 4 * scale, padY + 4 * scale, w - (padX + 4 * scale) * 2, h - (padY + 4 * scale) * 2, 2 * scale);
        ctx.stroke();
      }
    }
    
    // Fit text perfectly
    const fontTargetSize = Math.min(w * 0.85 / Math.max(1, centerText.length), h * 0.55);
    ctx.font = `bold ${Math.floor(fontTargetSize)}px "${font}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(centerText, w / 2, h / 2);
  }
  else if (stamp.type === 'image') {
    // For images, we should draw the cached image inside the bounds
    const imgData = stamp.imageDataUrl;
    if (imgData) {
      const img = new Image();
      img.src = imgData;
      // Since Image load is async, if it is already cached or loaded, paint it.
      // If we are dynamically generating on load, we can make sure img is hot-rendered or we write pre-loaded logic in React
      // To bypass async on renderStampToDataUrl loop, the React UI will overlay an interactive HTML <img> directly.
      // When saving a PDF, we'll draw it synchronously into canvas or use native image embedding,
      // so this helper can have a sync canvas image draw if the image is loaded.
      if (img.complete) {
        ctx.drawImage(img, 0, 0, w, h);
      }
    }
  }
  
  return canvas.toDataURL('image/png');
}

function setupFont(
  ctx: CanvasRenderingContext2D,
  fontFamily: string,
  text: string,
  maxSize: number,
  scale: number,
  isSplit: boolean
) {
  // Simple heuristic font scale
  const length = text.length || 1;
  const rawSize = isSplit ? maxSize : (maxSize * 1.5) / Math.max(1, length);
  const size = Math.floor(Math.min(rawSize, isSplit ? maxSize * 0.7 : maxSize));
  ctx.font = `bold ${size}px "${fontFamily}"`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
