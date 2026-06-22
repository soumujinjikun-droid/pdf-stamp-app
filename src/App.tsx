import React, { useState, useEffect } from 'react';
import { 
  FileText, Sparkles, Plus, Star, Layers, HelpCircle, 
  Trash2, Download, AlertCircle, RefreshCw, Layers2, ShieldAlert
} from 'lucide-react';

import { PDFDocumentFile, StampTemplate, PlacedElement, StampingMode, StampSetTemplate, MultiStampItem } from './types';
import { parsePdfDocument } from './utils/pdfLoader';
import { stampPdfDocument, downloadPdfFile } from './utils/pdfStamper';
import { createDefaultTemplates } from './utils/defaultTemplates';
import { createDefaultStampSets } from './utils/defaultStampSets';
import { renderStampToDataUrl } from './utils/canvasRenderer';

import Sidebar from './components/Sidebar';
import TemplateShelf from './components/TemplateShelf';
import DocumentWorkspace from './components/DocumentWorkspace';
import StampCreator from './components/StampCreator';

export default function App() {
  // Draggable Shelf Width Control (可変幅)
  const [shelfWidth, setShelfWidth] = useState<number>(380);

  // Files collection
  const [files, setFiles] = useState<PDFDocumentFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number>(1);
  
  // Custom & Default Stamps collection
  const [templates, setTemplates] = useState<StampTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>('built-in-sama');
  
  // Stamping mode ('auto_advance' auto next page vs 'free_mode' stay)
  const [stampingMode, setStampingMode] = useState<StampingMode>('free_mode');
  
  // Template creators modals
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  
  // Global loading states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  // Active template overriding properties
  const [overrideWidth, setOverrideWidth] = useState<number>(45);
  const [overrideHeight, setOverrideHeight] = useState<number>(45);
  const [overrideOpacity, setOverrideOpacity] = useState<number>(0.9);
  const [overrideColor, setOverrideColor] = useState<string>('#e34326');

  // Stamp Sets (一括セット) collection
  const [stampSets, setStampSets] = useState<StampSetTemplate[]>([]);

  // Load stamp sets from LocalStorage / Defaults on mount
  useEffect(() => {
    const builtInSets = createDefaultStampSets();
    const customSetsJSON = localStorage.getItem('pdf_stamp_custom_sets');
    let customSets: StampSetTemplate[] = [];
    if (customSetsJSON) {
      try {
        customSets = JSON.parse(customSetsJSON);
      } catch (err) {
        console.error('Failed to parse custom stamp sets:', err);
      }
    }
    const merged = [...builtInSets, ...customSets];

    // Load custom order of stamp sets if present
    const orderJSON = localStorage.getItem('pdf_stamp_set_order');
    let orderedIds: string[] = [];
    if (orderJSON) {
      try {
        orderedIds = JSON.parse(orderJSON);
      } catch (err) {
        console.error('Failed to parse stamp sets order:', err);
      }
    }

    if (orderedIds.length > 0) {
      merged.sort((a, b) => {
        const idxA = orderedIds.indexOf(a.id);
        const idxB = orderedIds.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    setStampSets(merged);
  }, []);

  // Load defaults and LocalStorage on mount
  useEffect(() => {
    // 1. Initial templates
    const builtIn = createDefaultTemplates();
    
    // Check local storage for custom created templates
    const customJSON = localStorage.getItem('pdf_stamp_custom_templates');
    let custom: StampTemplate[] = [];
    if (customJSON) {
      try {
        custom = JSON.parse(customJSON);
      } catch (err) {
        console.error('Failed to parse custom templates:', err);
      }
    }
    
    // Check local storage for favorites list
    const favsJSON = localStorage.getItem('pdf_stamp_favorites');
    let favIds: string[] = ['built-in-sama', 'built-in-arigatou', 'built-in-kakunin', 'built-in-shounin', 'built-in-date', 'built-in-checkmark'];
    if (favsJSON) {
      try {
        favIds = JSON.parse(favsJSON);
      } catch (err) {
        console.error('Failed to parse favorites:', err);
      }
    }
    
    // Check local storage for template order
    const orderJSON = localStorage.getItem('pdf_stamp_template_order');
    let orderedIds: string[] = [];
    if (orderJSON) {
      try {
        orderedIds = JSON.parse(orderJSON);
      } catch (err) {
        console.error('Failed to parse template order:', err);
      }
    }
    
    // Fuse and map active favorite states
    const merged = [...builtIn, ...custom].map(t => ({
      ...t,
      isFavorite: favIds.includes(t.id)
    }));
    
    if (orderedIds.length > 0) {
      merged.sort((a, b) => {
        const idxA = orderedIds.indexOf(a.id);
        const idxB = orderedIds.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
    
    setTemplates(merged);
  }, []);

  // Sync favorites back to LocalStorage
  const handleToggleFavorite = (id: string) => {
    setTemplates(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t);
      const favIds = updated.filter(t => t.isFavorite).map(t => t.id);
      localStorage.setItem('pdf_stamp_favorites', JSON.stringify(favIds));
      return updated;
    });
  };

  // Add custom template from designer
  const handleAddTemplate = (newTpl: StampTemplate) => {
    setTemplates(prev => {
      const customOnes = [...prev.filter(t => !t.isBuiltIn), newTpl];
      localStorage.setItem('pdf_stamp_custom_templates', JSON.stringify(customOnes));
      return [...prev, newTpl];
    });
    // Auto-equip new stamp!
    setActiveTemplateId(newTpl.id);
  };

  // Delete custom template from database
  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => {
      const filtered = prev.filter(t => t.id !== id);
      const customOnes = filtered.filter(t => !t.isBuiltIn);
      localStorage.setItem('pdf_stamp_custom_templates', JSON.stringify(customOnes));
      return filtered;
    });
    if (activeTemplateId === id) {
      setActiveTemplateId('built-in-sama');
    }
  };

  // Reorder templates and save to LocalStorage
  const handleReorderTemplates = (newTemplates: StampTemplate[]) => {
    setTemplates(newTemplates);
    const orderedIds = newTemplates.map(t => t.id);
    localStorage.setItem('pdf_stamp_template_order', JSON.stringify(orderedIds));
    const customOnes = newTemplates.filter(t => !t.isBuiltIn);
    localStorage.setItem('pdf_stamp_custom_templates', JSON.stringify(customOnes));
  };

  // Sync active template overrides
  const activeTemplate = templates.find(t => t.id === activeTemplateId);
  useEffect(() => {
    if (activeTemplate) {
      setOverrideWidth(activeTemplate.width);
      setOverrideHeight(activeTemplate.height);
      setOverrideOpacity(activeTemplate.opacity);
      setOverrideColor(activeTemplate.textColor);
    }
  }, [activeTemplateId, activeTemplate]);

  // Handle updates of template overrides (slider actions)
  const handleUpdateActiveProps = (updates: { width?: number; height?: number; opacity?: number; textColor?: string; borderColor?: string }) => {
    if (updates.width !== undefined) setOverrideWidth(updates.width);
    if (updates.height !== undefined) setOverrideHeight(updates.height);
    if (updates.opacity !== undefined) setOverrideOpacity(updates.opacity);
    if (updates.textColor !== undefined) setOverrideColor(updates.textColor);
    
    // Dynamically update template definition in state for active session
    if (activeTemplateId) {
      setTemplates(prev => prev.map(t => {
        if (t.id !== activeTemplateId) return t;
        return {
          ...t,
          width: updates.width !== undefined ? updates.width : t.width,
          height: updates.height !== undefined ? updates.height : t.height,
          opacity: updates.opacity !== undefined ? updates.opacity : t.opacity,
          textColor: updates.textColor !== undefined ? updates.textColor : t.textColor,
          borderColor: updates.borderColor !== undefined ? updates.borderColor : t.borderColor,
        };
      }));
    }
  };

  // Drag and drop / Manual file selection handler
  const handleFilesUpload = async (fileList: FileList) => {
    setIsLoading(true);
    setLoadingStatus('PDFファイルの解析を開始します...');
    
    const newFiles: PDFDocumentFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type !== 'application/pdf') {
        alert('警告: PDFファイルを選択してください。');
        continue;
      }
      
      try {
        setLoadingStatus(`ファイルを解析中: ${file.name}`);
        const ab = await file.arrayBuffer();
        
        // Render and extract thumbnails & size properties
        const meta = await parsePdfDocument(ab, (msg) => setLoadingStatus(msg));
        
        newFiles.push({
          id: `pdf-${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          arrayBuffer: ab,
          placedElements: [],
          thumbnailPageUrls: meta.thumbnailPageUrls,
          pageDimensions: meta.pageDimensions,
          history: { past: [], future: [] }
        });
      } catch (err: any) {
        console.error('Failed to load PDF file:', err);
        alert(`PDFファイル「${file.name}」の読み込みに失敗しました。ファイルが破損しているか、暗号化解除が必要な可能性があります。`);
      }
    }
    
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      // Focus first newly selected file
      setActiveFileId(newFiles[0].id);
      setActivePageNumber(1);
    }
    
    setIsLoading(false);
    setLoadingStatus('');
  };

  // Delete PDF file from registry
  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      const remaining = files.filter(f => f.id !== fileId);
      if (remaining.length > 0) {
        setActiveFileId(remaining[0].id);
        setActivePageNumber(1);
      } else {
        setActiveFileId(null);
        setActivePageNumber(1);
      }
    }
  };

  // Active file details ref
  const activeFile = files.find(f => f.id === activeFileId) || null;

  // Add customized element onto the page canvas
  const handleAddElement = (newEl: PlacedElement) => {
    if (!activeFileId) return;
    
    // Fetch detailed template definitions
    const originTemplate = templates.find(t => t.id === activeTemplateId);
    if (!originTemplate) return;

    // Decorate element with explicit template attributes
    const fullElement: PlacedElement = {
      ...newEl,
      type: originTemplate.type,
      text: originTemplate.text,
      subText: originTemplate.subText,
      textColor: overrideColor,
      borderColor: originTemplate.hasBorder ? overrideColor : 'transparent',
      fontFamily: originTemplate.fontFamily,
      hasBorder: originTemplate.hasBorder,
      isDoubleBorder: originTemplate.isDoubleBorder,
      imageDataUrl: originTemplate.imageDataUrl,
      opacity: overrideOpacity,
      width: overrideWidth,
      height: overrideHeight,
    };

    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.id !== activeFileId) return file;
        
        // Snapshot undo stack
        const newPast = [...file.history.past, file.placedElements];
        return {
          ...file,
          placedElements: [...file.placedElements, fullElement],
          history: {
            past: newPast,
            future: []
          }
        };
      });
    });
  };

  // Modify coordinates / dimensions of existing stamp
  const handleUpdateElement = (id: string, updates: Partial<PlacedElement>) => {
    if (!activeFileId) return;

    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.id !== activeFileId) return file;
        
        const updatedElements = file.placedElements.map(el => {
          if (el.id !== id) return el;
          return { ...el, ...updates };
        });

        // We skip logging small sub-dragging movements into the undo stack to avoid stack overflows.
        // We only save complete states inside standard click releases.
        return {
          ...file,
          placedElements: updatedElements
        };
      });
    });
  };

  // Remove single stamp element
  const handleRemoveElement = (id: string) => {
    if (!activeFileId) return;
    
    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.id !== activeFileId) return file;
        
        const newPast = [...file.history.past, file.placedElements];
        const filtered = file.placedElements.filter(el => el.id !== id);
        
        return {
          ...file,
          placedElements: filtered,
          history: {
            past: newPast,
            future: []
          }
        };
      });
    });
  };

  // Clear all stamps inside currently active document
  const handleClearAllStamps = () => {
    if (!activeFileId || !activeFile) return;

    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.id !== activeFileId) return file;
        const newPast = [...file.history.past, file.placedElements];
        return {
          ...file,
          placedElements: [],
          history: {
            past: newPast,
            future: []
          }
        };
      });
    });
  };

  const handleRotateActivePage = (deg: number) => {
    if (!activeFileId || !activeFile) return;

    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.id !== activeFileId) return file;

        const originalPageDim = file.pageDimensions[activePageNumber - 1] || { width: 595, height: 842 };
        const currentRotations = file.pageRotations || {};
        const currentPageRot = currentRotations[activePageNumber] || 0;
        
        // Calculate new rotation
        const newPageRot = (currentPageRot + deg + 360) % 360;
        const nextRotations = { ...currentRotations, [activePageNumber]: newPageRot };

        // Visual page dimensions BEFORE this rotation step
        const isCurrentlySwapped = (currentPageRot === 90 || currentPageRot === 270);
        const w_vis = isCurrentlySwapped ? originalPageDim.height : originalPageDim.width;
        const h_vis = isCurrentlySwapped ? originalPageDim.width : originalPageDim.height;

        // Snapshot history for undo/redo
        const newPast = [...file.history.past, file.placedElements];

        // Transform elements on the active page
        const transformedElements = file.placedElements.map(el => {
          if (el.pageNumber !== activePageNumber) return el;

          const w_pct = (el.width / w_vis) * 100;
          const h_pct = (el.height / h_vis) * 100;

          let newX = el.x;
          let newY = el.y;
          let newRotation = el.rotation;

          if (deg === 90) { // Clockwise
            newX = 100 - el.y - h_pct;
            newY = el.x;
            newRotation = (el.rotation + 90) % 360;
          } else if (deg === -90) { // Counter-Clockwise
            newX = el.y;
            newY = 100 - el.x - w_pct;
            newRotation = (el.rotation + 270) % 360;
          }

          const next_w_vis = (newPageRot === 90 || newPageRot === 270) ? originalPageDim.height : originalPageDim.width;
          const next_h_vis = (newPageRot === 90 || newPageRot === 270) ? originalPageDim.width : originalPageDim.height;
          const new_w_pct = (el.width / next_w_vis) * 100;
          const new_h_pct = (el.height / next_h_vis) * 100;

          return {
            ...el,
            x: Math.max(0, Math.min(100 - new_w_pct, newX)),
            y: Math.max(0, Math.min(100 - new_h_pct, newY)),
            rotation: newRotation,
          };
        });

        return {
          ...file,
          pageRotations: nextRotations,
          placedElements: transformedElements,
          history: {
            past: newPast,
            future: []
          }
        };
      });
    });
  };

  // Micro power feature: Stamping current stamp onto ALL pages of active PDF
  const handleApplyAllPages = () => {
    if (!activeFile || !activeTemplateId) return;

    // We search if there exists a placed element on the active page. We take its position.
    // Otherwise, we default to the bottom right corner (x: 82%, y: 85%)
    const pivot = activeFile.placedElements.find(el => el.pageNumber === activePageNumber) || {
      x: 80,
      y: 84,
      rotation: 0
    };

    const originTemplate = templates.find(t => t.id === activeTemplateId);
    if (!originTemplate) return;

    const newElements: PlacedElement[] = [];
    const numPages = activeFile.thumbnailPageUrls.length;

    for (let pIdx = 1; pIdx <= numPages; pIdx++) {
      // Create new clone for each page
      newElements.push({
        id: `bulk-${Date.now()}-${pIdx}-${Math.random()}`,
        templateId: activeTemplateId,
        type: originTemplate.type,
        text: originTemplate.text,
        subText: originTemplate.subText,
        textColor: overrideColor,
        borderColor: originTemplate.hasBorder ? overrideColor : 'transparent',
        fontFamily: originTemplate.fontFamily,
        hasBorder: originTemplate.hasBorder,
        isDoubleBorder: originTemplate.isDoubleBorder,
        imageDataUrl: originTemplate.imageDataUrl,
        x: pivot.x,
        y: pivot.y,
        width: overrideWidth,
        height: overrideHeight,
        rotation: pivot.rotation,
        opacity: overrideOpacity,
        pageNumber: pIdx
      });
    }

    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.id !== activeFileId) return file;
        const newPast = [...file.history.past, file.placedElements];
        return {
          ...file,
          placedElements: [...file.placedElements, ...newElements],
          history: {
            past: newPast,
            future: []
          }
        };
      });
    });
  };

  // Powerful business flow: Stamping current stamp on ALL uploaded PDFs
  const handleApplyAllFiles = () => {
    if (files.length <= 1) {
      alert('一括押印には、あらかじめ2件以上のPDFを読み込んでおく必要があります。');
      return;
    }
    if (!activeFile || !activeTemplateId) return;

    const pivot = activeFile.placedElements.find(el => el.pageNumber === activePageNumber) || {
      x: 80,
      y: 84,
      rotation: 0
    };

    const originTemplate = templates.find(t => t.id === activeTemplateId);
    if (!originTemplate) return;

    setFiles(prevFiles => {
      return prevFiles.map(file => {
        const newPast = [...file.history.past, file.placedElements];
        const newEl: PlacedElement = {
          id: `bulk-file-${Date.now()}-${Math.random()}`,
          templateId: activeTemplateId,
          type: originTemplate.type,
          text: originTemplate.text,
          subText: originTemplate.subText,
          textColor: overrideColor,
          borderColor: originTemplate.hasBorder ? overrideColor : 'transparent',
          fontFamily: originTemplate.fontFamily,
          hasBorder: originTemplate.hasBorder,
          isDoubleBorder: originTemplate.isDoubleBorder,
          imageDataUrl: originTemplate.imageDataUrl,
          x: pivot.x,
          y: pivot.y,
          width: overrideWidth,
          height: overrideHeight,
          rotation: pivot.rotation,
          opacity: overrideOpacity,
          pageNumber: 1 // default stamp onto page 1 of other documents
        };

        return {
          ...file,
          placedElements: [...file.placedElements, newEl],
          history: {
            past: newPast,
            future: []
          }
        };
      });
    });
    
    alert('すべてのPDFファイルのページ1にスタンプを同じ位置で配置完了しました！');
  };

  // Stamp Set Layout Templates Operations
  const handleApplyStampSet = (set: StampSetTemplate) => {
    if (!activeFileId || !activeFile) {
      alert('一括押印には、あらかじめPDFファイルを読み込んでおく必要があります。');
      return;
    }

    const newElements: PlacedElement[] = set.items.map((item, idx) => ({
      id: `set-el-${Date.now()}-${idx}-${Math.random()}`,
      type: item.type,
      text: item.text,
      subText: item.subText,
      textColor: item.textColor,
      borderColor: item.borderColor,
      fontFamily: item.fontFamily,
      hasBorder: item.hasBorder,
      isDoubleBorder: item.isDoubleBorder,
      imageDataUrl: item.imageDataUrl,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation || 0,
      opacity: item.opacity,
      pageNumber: activePageNumber,
    }));

    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.id !== activeFileId) return file;
        const newPast = [...file.history.past, file.placedElements];
        return {
          ...file,
          placedElements: [...file.placedElements, ...newElements],
          history: {
            past: newPast,
            future: []
          }
        };
      });
    });
  };

  const handleSaveCurrentLayoutAsSet = (name: string) => {
    if (!activeFile) {
      alert('PDFファイルを読み込んでください。');
      return;
    }

    const currentElements = activeFile.placedElements.filter(el => el.pageNumber === activePageNumber);
    if (currentElements.length === 0) {
      alert('現在のページにスタンプが配置されていません。先にスタンプを配置してください。');
      return;
    }

    const items: MultiStampItem[] = currentElements.map(el => ({
      type: el.type,
      text: el.text,
      subText: el.subText,
      textColor: el.textColor,
      borderColor: el.borderColor,
      fontFamily: el.fontFamily,
      hasBorder: el.hasBorder,
      isDoubleBorder: el.isDoubleBorder,
      imageDataUrl: el.imageDataUrl,
      width: el.width,
      height: el.height,
      opacity: el.opacity,
      x: el.x,
      y: el.y,
      rotation: el.rotation
    }));

    const newSet: StampSetTemplate = {
      id: `set-${Date.now()}`,
      name,
      items,
      isBuiltIn: false
    };

    setStampSets(prev => {
      const updated = [...prev, newSet];
      const customOnes = updated.filter(s => !s.isBuiltIn);
      localStorage.setItem('pdf_stamp_custom_sets', JSON.stringify(customOnes));
      localStorage.setItem('pdf_stamp_set_order', JSON.stringify(updated.map(s => s.id)));
      return updated;
    });
  };

  const handleDeleteStampSet = (id: string) => {
    setStampSets(prev => {
       const filtered = prev.filter(s => s.id !== id);
       const customOnes = filtered.filter(s => !s.isBuiltIn);
       localStorage.setItem('pdf_stamp_custom_sets', JSON.stringify(customOnes));
       localStorage.setItem('pdf_stamp_set_order', JSON.stringify(filtered.map(s => s.id)));
       return filtered;
    });
  };

  const handleReorderStampSets = (newSets: StampSetTemplate[]) => {
    setStampSets(newSets);
    const orderedIds = newSets.map(s => s.id);
    localStorage.setItem('pdf_stamp_set_order', JSON.stringify(orderedIds));
    const customOnes = newSets.filter(s => !s.isBuiltIn);
    localStorage.setItem('pdf_stamp_custom_sets', JSON.stringify(customOnes));
  };

  const handleSaveActiveAsTemplate = (name: string) => {
    if (!activeTemplateId) return;
    const original = templates.find(t => t.id === activeTemplateId);
    if (!original) return;

    const newId = `custom-save-${Date.now()}`;
    const newTpl: StampTemplate = {
      ...original,
      id: newId,
      name: name,
      width: overrideWidth,
      height: overrideHeight,
      opacity: overrideOpacity,
      textColor: overrideColor,
      borderColor: original.hasBorder ? overrideColor : 'transparent',
      isBuiltIn: false,
      isFavorite: false
    };

    setTemplates(prev => {
      const updated = [...prev, newTpl];
      const customOnes = updated.filter(t => !t.isBuiltIn);
      localStorage.setItem('pdf_stamp_custom_templates', JSON.stringify(customOnes));
      return updated;
    });

    // Auto switch to the newly saved template
    setActiveTemplateId(newId);
  };

  const handleExportJSON = () => {
    try {
      const customTemplatesJSON = localStorage.getItem('pdf_stamp_custom_templates') || '[]';
      const customSetsJSON = localStorage.getItem('pdf_stamp_custom_sets') || '[]';
      const templateOrderJSON = localStorage.getItem('pdf_stamp_template_order') || '[]';
      const setOrderJSON = localStorage.getItem('pdf_stamp_set_order') || '[]';
      const favoritesJSON = localStorage.getItem('pdf_stamp_favorites') || '[]';

      const backupObj = {
        generator: 'pdf-stamper-pro',
        exportedAt: new Date().toISOString(),
        customTemplates: JSON.parse(customTemplatesJSON),
        customStampSets: JSON.parse(customSetsJSON),
        templateOrder: JSON.parse(templateOrderJSON),
        setOrder: JSON.parse(setOrderJSON),
        favorites: JSON.parse(favoritesJSON)
      };

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pdf_stamps_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export JSON template backup:', err);
      alert('エクスポートに失敗しました。');
    }
  };

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('ファイルを読み込めませんでした。');
        }

        const json = JSON.parse(text);

        // Accept our rich format or a raw array
        let importedTemplates: StampTemplate[] = [];
        let importedSets: StampSetTemplate[] = [];
        let importedTemplateOrder: string[] = [];
        let importedSetOrder: string[] = [];
        let importedFavorites: string[] = [];

        if (json && (json.customTemplates || json.customStampSets)) {
          importedTemplates = Array.isArray(json.customTemplates) ? json.customTemplates : [];
          importedSets = Array.isArray(json.customStampSets) ? json.customStampSets : [];
          importedTemplateOrder = Array.isArray(json.templateOrder) ? json.templateOrder : [];
          importedSetOrder = Array.isArray(json.setOrder) ? json.setOrder : [];
          importedFavorites = Array.isArray(json.favorites) ? json.favorites : [];
        } else if (Array.isArray(json)) {
          if (json.length > 0 && ('type' in json[0]) && ('textColor' in json[0])) {
            importedTemplates = json;
          } else {
            throw new Error('JSONの形式が正しくありません。スタンプテンプレートの配列である必要があります。');
          }
        } else {
          throw new Error('無効なJSONファイルフォーマットです。');
        }

        // 1. Merge templates
        const localCustomJSON = localStorage.getItem('pdf_stamp_custom_templates') || '[]';
        let currentCustom: StampTemplate[] = [];
        try { currentCustom = JSON.parse(localCustomJSON); } catch (_) {}

        const sanitizedImportedTemplates = importedTemplates.map(t => ({
          ...t,
          isBuiltIn: false
        }));

        const finalCustomTemplates = [...currentCustom];
        sanitizedImportedTemplates.forEach(t => {
          const idx = finalCustomTemplates.findIndex(item => item.id === t.id);
          if (idx !== -1) {
            finalCustomTemplates[idx] = t;
          } else {
            finalCustomTemplates.push(t);
          }
        });

        // 2. Merge Sets
        const localCustomSetsJSON = localStorage.getItem('pdf_stamp_custom_sets') || '[]';
        let currentCustomSets: StampSetTemplate[] = [];
        try { currentCustomSets = JSON.parse(localCustomSetsJSON); } catch (_) {}

        const sanitizedImportedSets = importedSets.map(s => ({
          ...s,
          isBuiltIn: false
        }));

        const finalCustomSets = [...currentCustomSets];
        sanitizedImportedSets.forEach(s => {
          const idx = finalCustomSets.findIndex(item => item.id === s.id);
          if (idx !== -1) {
            finalCustomSets[idx] = s;
          } else {
            finalCustomSets.push(s);
          }
        });

        // Save custom structures back to localStorage
        localStorage.setItem('pdf_stamp_custom_templates', JSON.stringify(finalCustomTemplates));
        localStorage.setItem('pdf_stamp_custom_sets', JSON.stringify(finalCustomSets));

        // 3. Process favorites
        let currentFavs: string[] = [];
        try { currentFavs = JSON.parse(localStorage.getItem('pdf_stamp_favorites') || '[]'); } catch (_) {}
        const combinedFavs = Array.from(new Set([...currentFavs, ...importedFavorites]));
        localStorage.setItem('pdf_stamp_favorites', JSON.stringify(combinedFavs));

        // 4. Process orders
        let currentTplOrder: string[] = [];
        try { currentTplOrder = JSON.parse(localStorage.getItem('pdf_stamp_template_order') || '[]'); } catch (_) {}
        const combinedTplOrder = Array.from(new Set([...currentTplOrder, ...importedTemplateOrder]));
        if (combinedTplOrder.length > 0) {
          localStorage.setItem('pdf_stamp_template_order', JSON.stringify(combinedTplOrder));
        }

        let currentSetOrder: string[] = [];
        try { currentSetOrder = JSON.parse(localStorage.getItem('pdf_stamp_set_order') || '[]'); } catch (_) {}
        const combinedSetOrder = Array.from(new Set([...currentSetOrder, ...importedSetOrder]));
        if (combinedSetOrder.length > 0) {
          localStorage.setItem('pdf_stamp_set_order', JSON.stringify(combinedSetOrder));
        }

        // Apply back to React states
        const builtIn = createDefaultTemplates();
        const mergedTemplates = [...builtIn, ...finalCustomTemplates].map(t => ({
          ...t,
          isFavorite: combinedFavs.includes(t.id)
        }));

        const templateOrderToUse = combinedTplOrder.length > 0 ? combinedTplOrder : mergedTemplates.map(t => t.id);
        mergedTemplates.sort((a, b) => {
          const idxA = templateOrderToUse.indexOf(a.id);
          const idxB = templateOrderToUse.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
        setTemplates(mergedTemplates);

        const builtInSets = createDefaultStampSets();
        const mergedSets = [...builtInSets, ...finalCustomSets];
        const setOrderToUse = combinedSetOrder.length > 0 ? combinedSetOrder : mergedSets.map(s => s.id);
        mergedSets.sort((a, b) => {
          const idxA = setOrderToUse.indexOf(a.id);
          const idxB = setOrderToUse.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
        setStampSets(mergedSets);

        alert(`インポートに成功しました！\n（スタンプ：${sanitizedImportedTemplates.length}個、一括配置セット：${sanitizedImportedSets.length}個を読み込みました）`);
      } catch (err: any) {
        console.error('Failed to parse & merge JSON backup file:', err);
        alert(`インポートできませんでした。ファイルのフォーマットが正しくありません：\n${err?.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  // Undo triggers
  const handleUndo = () => {
    if (!activeFileId) return;
    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.id !== activeFileId) return file;
        if (file.history.past.length === 0) return file;
        
        const previous = file.history.past[file.history.past.length - 1];
        const newPast = file.history.past.slice(0, file.history.past.length - 1);
        const newFuture = [file.placedElements, ...file.history.future];
        
        return {
          ...file,
          placedElements: previous,
          history: {
            past: newPast,
            future: newFuture
          }
        };
      });
    });
  };

  // Redo triggers
  const handleRedo = () => {
    if (!activeFileId) return;
    setFiles(prevFiles => {
      return prevFiles.map(file => {
        if (file.id !== activeFileId) return file;
        if (file.history.future.length === 0) return file;
        
        const next = file.history.future[0];
        const newFuture = file.history.future.slice(1);
        const newPast = [...file.history.past, file.placedElements];
        
        return {
          ...file,
          placedElements: next,
          history: {
            past: newPast,
            future: newFuture
          }
        };
      });
    });
  };

  // Final compilation and file download
  const handleDownload = async () => {
    if (!activeFile) return;
    
    setIsLoading(true);
    setLoadingStatus('PDF出力形式をエンコード中...');
    
    try {
      const outputBytes = await stampPdfDocument(activeFile, activeFile.arrayBuffer);
      const outputName = activeFile.name.endsWith('.pdf') 
        ? `${activeFile.name.slice(0, -4)}_stamped.pdf` 
        : `${activeFile.name}_stamped.pdf`;

      setLoadingStatus('保存ダイアログを開いています...');
      const success = await downloadPdfFile(outputBytes, outputName);
      
      if (success) {
        setLoadingStatus('保存が成功しました！');
        setTimeout(() => setLoadingStatus(''), 1500);
      }
    } catch (err) {
      console.error('Failed to compile stamped PDF:', err);
      alert('PDFファイルの加工出力に失敗しました。詳細エラーをコンソールで確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate active template visual PNG block for dynamic workspace ghost render
  const [activeTemplateUrl, setActiveTemplateUrl] = useState<string | null>(null);
  useEffect(() => {
    if (activeTemplate) {
      if (activeTemplate.type === 'image' && activeTemplate.imageDataUrl) {
        setActiveTemplateUrl(activeTemplate.imageDataUrl);
      } else {
        const url = renderStampToDataUrl({
          ...activeTemplate,
          textColor: overrideColor,
          borderColor: activeTemplate.hasBorder ? overrideColor : 'transparent',
          width: overrideWidth,
          height: overrideHeight
        }, { scale: 2 });
        setActiveTemplateUrl(url);
      }
    } else {
      setActiveTemplateUrl(null);
    }
  }, [activeTemplateId, activeTemplate, overrideColor, overrideWidth, overrideHeight]);

  // Check history bounds
  const currentHistory = activeFile?.history || { past: [], future: [] };
  const canUndo = currentHistory.past.length > 0;
  const canRedo = currentHistory.future.length > 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden text-slate-800 antialiased selection:bg-blue-100">
      
      {/* Dynamic Loading Fullscreen Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-55 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm shadow-2xl flex flex-col items-center">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <h3 className="text-base font-bold font-display">PDF処理を実行中</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed animate-pulse">
              {loadingStatus || 'しばらくお待ちください...'}
            </p>
          </div>
        </div>
      )}

      {/* Main App Layout Row */}
      <div className="flex-1 flex w-full overflow-hidden">
        
        {/* Left Side: Thumbnail previews + List of PDFs */}
        <Sidebar
          files={files}
          activeFileId={activeFileId}
          activePageNumber={activePageNumber}
          onSelectFile={(id) => {
            setActiveFileId(id);
            setActivePageNumber(1);
          }}
          onRemoveFile={handleRemoveFile}
          onSelectPage={setActivePageNumber}
          onFilesUpload={handleFilesUpload}
          isLoading={isLoading}
          loadingStatus={loadingStatus}
        />

        {/* Center Side: Interactive Document Canvas Stage */}
        <DocumentWorkspace
          file={activeFile}
          activePageNumber={activePageNumber}
          onPageChange={setActivePageNumber}
          activeTemplateId={activeTemplateId}
          activeTemplateUrl={activeTemplateUrl}
          activeTemplateWidth={overrideWidth}
          activeTemplateHeight={overrideHeight}
          activeTemplateOpacity={overrideOpacity}
          onAddElement={handleAddElement}
          onUpdateElement={handleUpdateElement}
          onRemoveElement={handleRemoveElement}
          onBulkStampAllPages={handleApplyAllPages}
          stampingMode={stampingMode}
          onRotateActivePage={handleRotateActivePage}
        />

        {/* Resizable Divider Border (ドラッグで可変できる境界線) */}
        <div 
          className="w-1 bg-slate-200 hover:bg-blue-400 active:bg-blue-500 hover:w-1.5 transition-all cursor-col-resize shrink-0 z-20 h-full relative"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = shelfWidth;
            
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = startX - moveEvent.clientX; // 右端から左へ引っ張ると幅が広がる
              const newWidth = Math.max(280, Math.min(650, startWidth + deltaX));
              setShelfWidth(newWidth);
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          title="左右ドラッグでスタンプ選択エリアの幅を広げられます"
        />

        {/* Right Side: Stamp shelf Inspector Panel */}
        <TemplateShelf
          width={shelfWidth}
          templates={templates}
          activeTemplateId={activeTemplateId}
          onSelectTemplate={setActiveTemplateId}
          onToggleFavorite={handleToggleFavorite}
          onTriggerCreate={() => setIsCreatorOpen(true)}
          onDeleteTemplate={handleDeleteTemplate}
          onReorderTemplates={handleReorderTemplates}
          stampSets={stampSets}
          onApplyStampSet={handleApplyStampSet}
          onSaveCurrentLayoutAsSet={handleSaveCurrentLayoutAsSet}
          onDeleteStampSet={handleDeleteStampSet}
          onSaveActiveAsTemplate={handleSaveActiveAsTemplate}
          onReorderStampSets={handleReorderStampSets}
          stampingMode={stampingMode}
          onChangeStampingMode={setStampingMode}
          activeWidth={overrideWidth}
          activeHeight={overrideHeight}
          activeOpacity={overrideOpacity}
          activeColor={overrideColor}
          onUpdateActiveProps={handleUpdateActiveProps}
          onApplyAllPages={handleApplyAllPages}
          onApplyAllFiles={handleApplyAllFiles}
          onDownload={handleDownload}
          onClearAllStamps={handleClearAllStamps}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          hasFile={!!activeFileId}
          onExportJSON={handleExportJSON}
          onImportJSON={handleImportJSON}
        />

      </div>

      {/* Creative Design Modal */}
      {isCreatorOpen && (
        <StampCreator
          onAddTemplate={handleAddTemplate}
          onClose={() => setIsCreatorOpen(false)}
        />
      )}

    </div>
  );
}
