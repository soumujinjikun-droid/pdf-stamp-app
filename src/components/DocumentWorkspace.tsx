import React, { useRef, useEffect, useState } from 'react';
import { 
  Maximize2, Minimize2, ZoomIn, ZoomOut, Check, ArrowRight, CornerRightDown, 
  Trash2, RotateCw, Move, HelpCircle, AlignRight, Layout, RefreshCw, Grid
} from 'lucide-react';
import { PDFDocumentFile, PlacedElement, StampingMode } from '../types';
import { renderPdfPageToCanvas } from '../utils/pdfLoader';
import { renderStampToDataUrl } from '../utils/canvasRenderer';

interface DocumentWorkspaceProps {
  file: PDFDocumentFile | null;
  activePageNumber: number;
  onPageChange: (pageNum: number) => void;
  activeTemplateId: string | null;
  activeTemplateUrl: string | null;
  activeTemplateWidth: number;
  activeTemplateHeight: number;
  activeTemplateOpacity: number;
  
  // Placed stamp modifiers
  onAddElement: (element: PlacedElement) => void;
  onUpdateElement: (id: string, updates: Partial<PlacedElement>) => void;
  onRemoveElement: (id: string) => void;
  
  // Power Actions
  onBulkStampAllPages: (element: PlacedElement) => void;
  stampingMode: StampingMode;
  onRotateActivePage: (deg: number) => void;
}

export default function DocumentWorkspace({
  file,
  activePageNumber,
  onPageChange,
  activeTemplateId,
  activeTemplateUrl,
  activeTemplateWidth,
  activeTemplateHeight,
  activeTemplateOpacity,
  onAddElement,
  onUpdateElement,
  onRemoveElement,
  onBulkStampAllPages,
  stampingMode,
  onRotateActivePage
}: DocumentWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const currentRenderTaskRef = useRef<any>(null);

  const [zoom, setZoom] = useState(1.2);
  const [isRendering, setIsRendering] = useState(false);
  
  // Canvas client layout size
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Ghost element follower position
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isCursorInside, setIsCursorInside] = useState(false);

  // Snapping option
  const [isSnapEnabled, setIsSnapEnabled] = useState(true);

  // Dragging states for element manipulation
  const [draggingState, setDraggingState] = useState<{
    id: string;
    mode: 'move' | 'resize' | 'rotate';
    startX: number;
    startY: number;
    startElementX: number;
    startElementY: number;
    startWidth: number;
    startHeight: number;
    startRotation: number;
  } | null>(null);

  // Focus and deselect
  const handleWorkspaceClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      setSelectedElementId(null);
    }
  };

  // Keep rendering PDF to canvas on page / zoom / file change
  useEffect(() => {
    if (!file || !canvasRef.current) return;
    
    let active = true;

    // Concurrently running render tasks on the same canvas will conflict.
    // If a rendering task is already active, cancel it before triggering a new one.
    if (currentRenderTaskRef.current) {
      try {
        currentRenderTaskRef.current.cancel();
      } catch (err) {
        // Safe to ignore if already resolved/finished
      }
      currentRenderTaskRef.current = null;
    }

    const renderPDF = async () => {
      try {
        setIsRendering(true);
        // Page index bounds sanitizer
        const targetPage = Math.min(Math.max(1, activePageNumber), file.pageDimensions.length);
        
        const dims = await renderPdfPageToCanvas(
          file.arrayBuffer,
          targetPage,
          canvasRef.current!,
          zoom,
          file.pageRotations?.[targetPage] || 0,
          (renderTask) => {
            if (active) {
              currentRenderTaskRef.current = renderTask;
            } else {
              try {
                renderTask.cancel();
              } catch (_) {}
            }
          }
        );
        
        if (active) {
          setCanvasLayout({
            width: dims.width,
            height: dims.height
          });
        }
      } catch (err: any) {
        // Ignore normal RenderingCancelledException gracefully
        if (err && (err.name === 'RenderingCancelledException' || err.message?.includes('cancelled'))) {
          return;
        }
        console.error('Failed to render PDF page to Canvas:', err);
      } finally {
        if (active) setIsRendering(false);
      }
    };

    renderPDF();

    return () => {
      active = false;
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch (_) {}
        currentRenderTaskRef.current = null;
      }
    };
  }, [file, activePageNumber, zoom]);

  // Handle keyboard listener for deleting elements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElementId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        onRemoveElement(selectedElementId);
        setSelectedElementId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElementId]);

  const currentPageRot = file?.pageRotations?.[activePageNumber] || 0;
  const isRotated90or270 = currentPageRot === 90 || currentPageRot === 270;
  const originalPageDim = file?.pageDimensions[activePageNumber - 1] || { width: 595, height: 842 };

  const visualPageDim = isRotated90or270 
    ? { width: originalPageDim.height, height: originalPageDim.width }
    : { width: originalPageDim.width, height: originalPageDim.height };

  // Calculate rendering viewport scale factor
  // Points map directly to visual pixels (e.g. canvasLayout.width)
  const scaleFactor = visualPageDim.width > 0 ? (canvasLayout.width / visualPageDim.width) : 1;

  // Handle stamping onto the PDF on Click
  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTemplateId || !overlayRef.current) return;
    
    // If dragging an element, don't trigger new stamp
    if (draggingState || e.target !== overlayRef.current) return;

    const bounds = overlayRef.current.getBoundingClientRect();
    const clickX = e.clientX - bounds.left;
    const clickY = e.clientY - bounds.top;

    // Convert pixels to percentages (0-100) for storage
    let pctX = (clickX / bounds.width) * 100;
    let pctY = (clickY / bounds.height) * 100;

    // Center stamp on cursor coordinates (offset by half size)
    const stampWidthPercent = (activeTemplateWidth / visualPageDim.width) * 100;
    const stampHeightPercent = (activeTemplateHeight / visualPageDim.height) * 100;
    pctX -= stampWidthPercent / 2;
    pctY -= stampHeightPercent / 2;

    // Keep within bounds
    pctX = Math.max(0, Math.min(100 - stampWidthPercent, pctX));
    pctY = Math.max(0, Math.min(100 - stampHeightPercent, pctY));

    // Optional snapping
    if (isSnapEnabled) {
      pctX = Math.round(pctX * 2) / 2; // snap to nearest 0.5%
      pctY = Math.round(pctY * 2) / 2;
    }

    const equippedTemplate = file.placedElements; // placeholder or active
    // We fetch full detail from template (or pass parent detail)
    // Find active template definitions
    const elId = `el-${Date.now()}`;
    const newElement: PlacedElement = {
      id: elId,
      templateId: activeTemplateId,
      // Default placeholder fields derived from active configuration
      type: stampingMode === 'free_mode' && activeTemplateId === 'built-in-checkmark' ? 'checkmark' : 'text', // overriden below
      textColor: '#e34326',
      borderColor: '#e34326',
      fontFamily: 'Noto Sans JP',
      hasBorder: true,
      x: pctX,
      y: pctY,
      width: activeTemplateWidth,
      height: activeTemplateHeight,
      rotation: 0,
      opacity: activeTemplateOpacity,
      pageNumber: activePageNumber,
    };

    onAddElement(newElement); // This is intercepted to copy template values
    
    setSelectedElementId(elId);

    // Auto Advance Option
    if (stampingMode === 'auto_advance') {
      if (activePageNumber < file.thumbnailPageUrls.length) {
        setTimeout(() => {
          onPageChange(activePageNumber + 1);
        }, 120);
      }
    }
  };

  // Overlays Mouse Movement to draw transparent ghost stamp
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTemplateId || !overlayRef.current) return;
    const bounds = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    setHoverPos({ x, y });
  };

  // Drag handles for moving, resizing, rotating
  const startDrag = (
    e: React.MouseEvent,
    el: PlacedElement,
    mode: 'move' | 'resize' | 'rotate'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementId(el.id);
    
    setDraggingState({
      id: el.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startElementX: el.x,
      startElementY: el.y,
      startWidth: el.width,
      startHeight: el.height,
      startRotation: el.rotation
    });
  };

  // Listen to Global Mousemove while Drag is Active
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!draggingState || !overlayRef.current) return;
      
      const el = file?.placedElements.find((item) => item.id === draggingState.id);
      if (!el) return;

      const bounds = overlayRef.current.getBoundingClientRect();
      const deltaX = e.clientX - draggingState.startX;
      const deltaY = e.clientY - draggingState.startY;

      if (draggingState.mode === 'move') {
        // Delta in percentages
        const deltaPctX = (deltaX / bounds.width) * 100;
        const deltaPctY = (deltaY / bounds.height) * 100;
        
        let targetX = draggingState.startElementX + deltaPctX;
        let targetY = draggingState.startElementY + deltaPctY;

        // Snapping boundary check
        const widthPct = (el.width / visualPageDim.width) * 100;
        const heightPct = (el.height / visualPageDim.height) * 100;
        
        targetX = Math.max(0, Math.min(100 - widthPct, targetX));
        targetY = Math.max(0, Math.min(100 - heightPct, targetY));

        if (isSnapEnabled) {
          targetX = Math.round(targetX * 2) / 2; // snap to nearest 0.5%
          targetY = Math.round(targetY * 2) / 2;
        }

        onUpdateElement(el.id, { x: targetX, y: targetY });
      } 
      else if (draggingState.mode === 'resize') {
        // Scale proportionally by delta
        const resizeFactor = 1 + (deltaX / bounds.width) * 4;
        let targetW = Math.max(15, Math.min(400, draggingState.startWidth * resizeFactor));
        let targetH = Math.max(15, Math.min(400, draggingState.startHeight * resizeFactor));

        onUpdateElement(el.id, {
          width: Math.round(targetW),
          height: Math.round(targetH)
        });
      }
      else if (draggingState.mode === 'rotate') {
        // Calculate dragging angle based on element center
        const elLeft = (el.x / 100) * bounds.width + (el.width * scaleFactor) / 2;
        const elTop = (el.y / 100) * bounds.height + (el.height * scaleFactor) / 2;
        const workspaceLeft = bounds.left;
        const workspaceTop = bounds.top;

        const centerX = workspaceLeft + elLeft;
        const centerY = workspaceTop + elTop;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        
        // Find angle in degrees
        let angleInDegrees = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // offset by 90 to put handle directly upwards
        if (angleInDegrees < 0) angleInDegrees += 360;

        if (isSnapEnabled) {
          // Snap rotate to nearest 15 degrees
          angleInDegrees = Math.round(angleInDegrees / 15) * 15;
        }

        onUpdateElement(el.id, { rotation: Math.floor(angleInDegrees) % 360 });
      }
    };

    const handleGlobalMouseUp = () => {
      setDraggingState(null);
    };

    if (draggingState) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingState, isSnapEnabled, visualPageDim, scaleFactor]);

  // Position alignment presets
  const applyPresetPosition = (preset: 'bottom_right' | 'top_right' | 'bottom_left' | 'center') => {
    if (!selectedElementId) return;
    const el = file?.placedElements.find(item => item.id === selectedElementId);
    if (!el) return;

    const widthPct = (el.width / visualPageDim.width) * 100;
    const heightPct = (el.height / visualPageDim.height) * 100;

    let testX = 50;
    let testY = 50;

    switch (preset) {
      case 'bottom_right':
        testX = 96 - widthPct;
        testY = 96 - heightPct;
        break;
      case 'top_right':
        testX = 96 - widthPct;
        testY = 4;
        break;
      case 'bottom_left':
        testX = 4;
        testY = 96 - heightPct;
        break;
      case 'center':
        testX = 50 - widthPct / 2;
        testY = 50 - heightPct / 2;
        break;
    }

    onUpdateElement(selectedElementId, {
      x: Math.max(0, Math.min(100 - widthPct, testX)),
      y: Math.max(0, Math.min(100 - heightPct, testY))
    });
  };

  const selectedElement = file?.placedElements.find(item => item.id === selectedElementId);

  if (!file) {
    return (
      <div className="flex-1 bg-slate-100 flex flex-col items-center justify-center p-8 text-center select-none font-sans">
        <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-205 flex flex-col items-center">
          <Layout className="w-16 h-16 text-blue-550 mb-4 animate-bounce" />
          <h1 className="text-xl font-bold text-slate-800 font-display">PDF スタンプ押印ツール</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            ファイルを何もロードしていないか、アップロードされていません。ドラッグ＆ドロップまたは左のファイル選択からPDFを読み込ませてください。
          </p>
          <div className="mt-6 text-xs text-blue-600 font-semibold bg-blue-50/70 px-4 py-2.5 rounded-2xl border border-blue-100">
            ※ 完全にブラウザ内（ローカル）で動作し、サーバーへデータが送信される心配はありません。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-100 flex flex-col h-full font-sans overflow-hidden">
      
      {/* Top Action Ribbon Bar */}
      <div className="px-6 py-3 border-b border-slate-250 bg-white flex items-center justify-between shadow-xs z-10 select-none shrink-0">
        
        {/* Left indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">ページ:</span>
            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl">
              <button
                type="button"
                disabled={activePageNumber <= 1}
                onClick={() => onPageChange(activePageNumber - 1)}
                className="hover:bg-white text-slate-650 p-1 rounded-lg text-xs font-bold shadow-xs disabled:opacity-40"
              >
                前へ
              </button>
              <span className="text-xs font-mono font-bold text-slate-850 px-1">
                {activePageNumber} / {file.thumbnailPageUrls.length}
              </span>
              <button
                type="button"
                disabled={activePageNumber >= file.thumbnailPageUrls.length}
                onClick={() => onPageChange(activePageNumber + 1)}
                className="hover:bg-white text-slate-650 p-1 rounded-lg text-xs font-bold shadow-xs disabled:opacity-40"
              >
                次へ
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onRotateActivePage(-90)}
              className="hover:bg-white text-slate-650 p-1 px-2 rounded-lg text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer bg-transparent border-none transition-all"
              title="左に90度回転"
            >
              <RotateCw className="w-3.5 h-3.5 transform -scale-x-100" />
              左90°
            </button>
            <button
              type="button"
              onClick={() => onRotateActivePage(90)}
              className="hover:bg-white text-slate-650 p-1 px-2 rounded-lg text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer bg-transparent border-none transition-all"
              title="右に90度回転"
            >
              <RotateCw className="w-3.5 h-3.5" />
              右90°
            </button>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
            <span className="text-xs font-bold text-slate-500">スナップ:</span>
            <button
              type="button"
              onClick={() => setIsSnapEnabled(!isSnapEnabled)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                isSnapEnabled
                  ? 'border-emerald-250 bg-emerald-50 text-emerald-600'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              {isSnapEnabled ? 'スナップON (5px/15°)' : 'スナップOFF'}
            </button>
          </div>
        </div>

        {/* Center: Presets repositions */}
        {selectedElement && (
          <div className="hidden md:flex items-center gap-2 border-x border-slate-200 px-4">
            <span className="text-[10px] font-bold text-slate-450 flex items-center gap-1 uppercase tracking-wider">
              <AlignRight className="w-3.5 h-3.5" />
              選択スタンプの定位置配置:
            </span>
            <div className="flex items-center gap-1">
              {[
                { label: '右上印面', id: 'top_right' },
                { label: '右下検印', id: 'bottom_right' },
                { label: '左下押印', id: 'bottom_left' },
                { label: '中央', id: 'center' }
              ].map((pst) => (
                <button
                  key={pst.id}
                  type="button"
                  onClick={() => applyPresetPosition(pst.id as any)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-650 text-[10px] font-bold border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  {pst.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right zooming controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom(Math.max(0.6, zoom - 0.15))}
            className="p-1 px-2 border border-slate-200 hover:border-slate-350 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
            title="縮小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-650 w-11 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(Math.min(3.0, zoom + 0.15))}
            className="p-1 px-2 border border-slate-200 hover:border-slate-350 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
            title="拡大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Main Canvas Scrollable frame */}
      <div 
        ref={containerRef}
        onClick={handleWorkspaceClick}
        className="flex-1 overflow-auto p-8 flex items-start justify-center relative bg-slate-150/70"
      >
        
        {/* Live rendering backdrop container */}
        <div 
          className="relative shadow-2xl border border-slate-300 bg-white inline-block rounded-xs"
          style={{
            width: canvasLayout.width ? `${canvasLayout.width}px` : 'auto',
            height: canvasLayout.height ? `${canvasLayout.height}px` : 'auto',
          }}
        >
          {/* Main static PDF backer canvas */}
          <canvas 
            ref={canvasRef} 
            className="block select-none pointer-events-none rounded-xs"
          />

          {/* Loader status */}
          {isRendering && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-20">
              <div className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <span className="text-xs text-slate-600 font-bold">ドキュメントを描画しています...</span>
              </div>
            </div>
          )}

          {/* Core Interactive elements layer */}
          <div
            ref={overlayRef}
            onClick={handlePdfClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsCursorInside(true)}
            onMouseLeave={() => {
              setIsCursorInside(false);
              setHoverPos(null);
            }}
            className={`absolute inset-0 z-10 pdf-overlay-container ${activeTemplateId ? 'stamp-cursor-active' : ''}`}
          >
            
            {/* Guide grid background lines (optional cosmetic for alignment) */}
            {selectedElement && isSnapEnabled && (
              <div className="absolute inset-0 pointer-events-none border border-slate-350/5">
                {/* Horizontal Guide line from selected element */}
                <div 
                  className="absolute w-full border-t border-dashed border-slate-400/40 opacity-70"
                  style={{ top: `${selectedElement.y + (selectedElement.height / visualPageDim.height * 100) / 2}%` }}
                />
                {/* Vertical Guide line from selected element */}
                <div 
                  className="absolute h-full border-l border-dashed border-slate-400/40 opacity-70"
                  style={{ left: `${selectedElement.x + (selectedElement.width / visualPageDim.width * 100) / 2}%` }}
                />
              </div>
            )}

            {/* Ghost cursor hover preview */}
            {activeTemplateId && activeTemplateUrl && isCursorInside && hoverPos && !draggingState && (
              <div
                className="absolute pointer-events-none select-none max-w-none transition-transform"
                style={{
                  left: `${hoverPos.x}px`,
                  top: `${hoverPos.y}px`,
                  transform: 'translate(-50%, -50%)',
                  width: `${activeTemplateWidth * scaleFactor}px`,
                  height: `${activeTemplateHeight * scaleFactor}px`,
                  opacity: activeTemplateOpacity * 0.45,
                }}
              >
                <img
                  src={activeTemplateUrl}
                  alt="Ghost stamp"
                  className="w-full h-full object-contain pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Placed Stamps overlay */}
            {file.placedElements
              .filter((el) => el.pageNumber === activePageNumber)
              .map((el) => {
                const isSelected = el.id === selectedElementId;
                
                // Position calculations relative to scaling factors
                const visualLeft = `${el.x}%`;
                const visualTop = `${el.y}%`;
                const visualW = el.width * scaleFactor;
                const visualH = el.height * scaleFactor;
                
                // Dynamic png representation for stamp frame rendering
                // (checkmark, text, round_seal, square_seal all rendered symmetrically)
                let stampUrl = '';
                if (el.type === 'image' && el.imageDataUrl) {
                  stampUrl = el.imageDataUrl;
                } else {
                  stampUrl = renderStampToDataUrl(el, { scale: 3 });
                }

                return (
                  <div
                    key={el.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(el.id);
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return; // 左クリックのみ
                      startDrag(e, el, 'move');
                    }}
                    style={{
                      left: visualLeft,
                      top: visualTop,
                      width: `${visualW}px`,
                      height: `${visualH}px`,
                      opacity: el.opacity,
                      transform: `rotate(${el.rotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                    className={`absolute select-none cursor-move group transition-all rounded-[3px] ${
                      isSelected 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-400 outline outline-1 outline-slate-300 shadow-[0_12px_32px_rgba(30,41,59,0.16)] z-30' 
                        : 'hover:ring-1 hover:ring-white hover:ring-offset-1 hover:ring-offset-slate-350 z-20'
                    }`}
                  >
                    {/* Visual representation */}
                    {stampUrl ? (
                      <img
                        src={stampUrl}
                        alt="Stamp element"
                        className="w-full h-full block pointer-events-none select-none max-w-none shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full border border-dashed border-slate-300" />
                    )}

                    {/* Interactive drag/rotate/delete anchors displayed on selection */}
                    {isSelected && (
                      <>
                        {/* Rotation Handle (circle anchor on top of stamp) */}
                        <div
                          onMouseDown={(e) => startDrag(e, el, 'rotate')}
                          className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 bg-white text-slate-650 border border-slate-200 shadow-md rounded-full flex items-center justify-center cursor-alias hover:scale-110 active:scale-95 transition-transform z-40"
                          title="回転（ドラッグで回転。スナップ時は15度刻み）"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </div>

                        {/* Resize Handle (bottom-right tiny square) */}
                        <div
                          onMouseDown={(e) => startDrag(e, el, 'resize')}
                          className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-slate-700 rounded-full shadow-md cursor-se-resize hover:scale-125 transition-transform z-40"
                          title="ドラッグで等倍拡大縮小"
                        />

                        {/* Floating delete button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveElement(el.id);
                            setSelectedElementId(null);
                          }}
                          className="absolute -top-7 -right-7 w-6 h-6 bg-white hover:bg-slate-50 text-slate-500 hover:text-red-500 border border-slate-200 shadow-md rounded-full flex items-center justify-center active:scale-90 transition-transform z-40"
                          title="このスタンプを消去"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

          </div>

        </div>

      </div>

      {/* Floating guidelines for newcomers (Footer help line) */}
      <div className="bg-white border-t border-slate-200 py-2 px-6 flex items-center justify-between text-[11px] text-slate-450 select-none shrink-0">
        <div className="flex items-center gap-2">
          <span>💡 押印スタイル:</span>
          <strong>{stampingMode === 'auto_advance' ? '連続(自動的に次のページへ遷移)モード' : '自由選択・確認モード'}</strong>
        </div>
        <div className="flex items-center gap-3">
          <span>操作方法:</span>
          <span>クリックで押印</span>
          <span>スタンプ選択時に [DELETE]キーで削除</span>
          <span>ドラッグ移動・右下ハンドルで拡縮・頭部ハンドルで回転</span>
        </div>
      </div>

    </div>
  );
}
