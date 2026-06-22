import React, { useState, useEffect } from 'react';
import { Star, Plus, Settings, History, Settings2, HelpCircle, Check, Download, Upload, Database, Layers, Globe, Save, Layers2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { StampTemplate, StampingMode, StampSetTemplate } from '../types';
import { renderStampToDataUrl } from '../utils/canvasRenderer';

interface TemplateShelfProps {
  width: number;
  templates: StampTemplate[];
  activeTemplateId: string | null;
  onSelectTemplate: (id: string | null) => void;
  onToggleFavorite: (id: string) => void;
  onTriggerCreate: () => void;
  onDeleteTemplate: (id: string) => void;
  onReorderTemplates?: (templates: StampTemplate[]) => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
  
  // Stamp Sets Layout presets
  stampSets: StampSetTemplate[];
  onApplyStampSet: (set: StampSetTemplate) => void;
  onSaveCurrentLayoutAsSet: (name: string) => void;
  onDeleteStampSet: (id: string) => void;
  onSaveActiveAsTemplate: (name: string) => void;
  onReorderStampSets?: (stampSets: StampSetTemplate[]) => void;
  
  // Stamping mode controllers
  stampingMode: StampingMode;
  onChangeStampingMode: (mode: StampingMode) => void;
  
  // Stamp Quick adjustments (live modifications of active template width/height/color/opacity)
  activeWidth: number;
  activeHeight: number;
  activeOpacity: number;
  activeColor: string;
  onUpdateActiveProps: (updates: { width?: number; height?: number; opacity?: number; textColor?: string; borderColor?: string }) => void;
  
  // Power Actions
  onApplyAllPages: () => void;
  onApplyAllFiles: () => void;
  onDownload: () => void;
  onClearAllStamps: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasFile: boolean;
}

export default function TemplateShelf({
  width,
  templates,
  activeTemplateId,
  onSelectTemplate,
  onToggleFavorite,
  onTriggerCreate,
  onDeleteTemplate,
  onReorderTemplates,
  stampSets = [],
  onApplyStampSet,
  onSaveCurrentLayoutAsSet,
  onDeleteStampSet,
  onSaveActiveAsTemplate,
  onReorderStampSets,
  stampingMode,
  onChangeStampingMode,
  activeWidth,
  activeHeight,
  activeOpacity,
  activeColor,
  onUpdateActiveProps,
  onApplyAllPages,
  onApplyAllFiles,
  onDownload,
  onClearAllStamps,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasFile,
  onExportJSON,
  onImportJSON
}: TemplateShelfProps) {
  const [stampPreviewUrls, setStampPreviewUrls] = useState<{ [id: string]: string }>({});
  const [activeTab, setActiveTab] = useState<'single' | 'set'>('single');
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [customSaveName, setCustomSaveName] = useState('');
  const [isSavingSet, setIsSavingSet] = useState(false);
  const [customSetName, setCustomSetName] = useState('');

  // Sections Accordions collapsing toggles (折り畳み用ステート)
  const [isModeOpen, setIsModeOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isBulkOpen, setIsBulkOpen] = useState(true);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Inline Click Confirms (安全なインライン2重確認ステート。window.confirm の Iframe ブロックを完全回避)
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmApplyAllPages, setConfirmApplyAllPages] = useState(false);
  const [confirmApplyAllFiles, setConfirmApplyAllFiles] = useState(false);

  // Drag & Drop states for reordering templates
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const sourceIndex = templates.findIndex((t) => t.id === draggedId);
    const targetIndex = templates.findIndex((t) => t.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newTemplates = [...templates];
    const [removed] = newTemplates.splice(sourceIndex, 1);
    newTemplates.splice(targetIndex, 0, removed);

    if (onReorderTemplates) {
      onReorderTemplates(newTemplates);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  // Drag & Drop states for reordering stamp sets
  const [draggedSetId, setDraggedSetId] = useState<string | null>(null);
  const [dragOverSetId, setDragOverSetId] = useState<string | null>(null);

  const handleSetDragStart = (e: React.DragEvent, id: string) => {
    setDraggedSetId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleSetDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
  };

  const handleSetDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedSetId !== id) {
      setDragOverSetId(id);
    }
  };

  const handleSetDragLeave = () => {
    setDragOverSetId(null);
  };

  const handleSetDragEnd = () => {
    setDraggedSetId(null);
    setDragOverSetId(null);
  };

  const handleSetDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedSetId || draggedSetId === targetId) return;

    const sourceIndex = stampSets.findIndex((s) => s.id === draggedSetId);
    const targetIndex = stampSets.findIndex((s) => s.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newSets = [...stampSets];
    const [removed] = newSets.splice(sourceIndex, 1);
    newSets.splice(targetIndex, 0, removed);

    if (onReorderStampSets) {
      onReorderStampSets(newSets);
    }
    setDraggedSetId(null);
    setDragOverSetId(null);
  };

  const activeTemplate = templates.find((t) => t.id === activeTemplateId);

  // Sync custom stamp save name when active template changes
  useEffect(() => {
    if (activeTemplate) {
      setCustomSaveName(`${activeTemplate.name}（カスタム）`);
    } else {
      setCustomSaveName('');
    }
    setIsSavingCustom(false);
  }, [activeTemplateId, activeTemplate]);

  // Render previews for loaded templates
  useEffect(() => {
    const previews: { [id: string]: string } = {};
    templates.forEach((template) => {
      if (template.type === 'image' && template.imageDataUrl) {
        previews[template.id] = template.imageDataUrl;
      } else {
        previews[template.id] = renderStampToDataUrl({
          ...template,
          // Make sure preview has correct size bounding box layout
          width: Math.min(80, template.width),
          height: Math.min(80, template.height)
        }, { scale: 1.5 });
      }
    });
    setStampPreviewUrls(previews);
  }, [templates]);

  // Group templates
  const favoriteTemplates = templates.filter((t) => t.isFavorite);
  const otherTemplates = templates.filter((t) => !t.isFavorite);

  // Pre-configured Vermillion/Red/Blue presets for quick adjustment
  const quickColors = [
    { label: '朱色', val: '#e34326' },
    { label: '赤印', val: '#ef4444' },
    { label: '確認青', val: '#1d4ed8' },
    { label: '検印緑', val: '#10b981' },
    { label: '墨黒', val: '#1e293b' }
  ];

  return (
    <div 
      style={{ width: `${width}px` }}
      className="border-l border-slate-200 bg-white flex flex-col h-full font-sans shrink-0 select-none overflow-hidden"
    >
      
      {/* Undo/Redo & Utility bar */}
      <div className="px-5 py-3 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
        <span className="text-xs font-bold text-slate-500 font-display">ツール・履歴操作</span>
        
        <div className="flex items-center gap-2">
          {/* Undo */}
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className="p-1.5 border border-slate-200 hover:border-slate-350 rounded-lg text-slate-600 disabled:opacity-35 disabled:pointer-events-none hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title="元に戻す (Ctrl+Z)"
          >
            元に
          </button>
          
          {/* Redo */}
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            className="p-1.5 border border-slate-200 hover:border-slate-350 rounded-lg text-slate-600 disabled:opacity-35 disabled:pointer-events-none hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title="やり直す (Ctrl+Y)"
          >
            進む
          </button>
        </div>
      </div>

      {/* Modes Selection */}
      <div className="border-b border-slate-150 select-none">
        <button 
          type="button"
          onClick={() => setIsModeOpen(!isModeOpen)} 
          className="w-full px-5 py-2.5 hover:bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-500 font-display transition-colors"
        >
          <span>作業モード</span>
          {isModeOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-450" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-450" />}
        </button>
        
        {isModeOpen && (
          <div className="px-5 pb-3 space-y-2">
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => onChangeStampingMode('auto_advance')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  stampingMode === 'auto_advance'
                    ? 'border-emerald-500 bg-emerald-50/40 text-emerald-700 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-650 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>① 連続押印モード</span>
                  {stampingMode === 'auto_advance' && <span className="text-[9px] bg-emerald-600 text-white font-mono px-1 rounded-sm">選択中</span>}
                </div>
                <p className="text-[10px] text-slate-450 mt-1">
                  スタンプを押すと自動で次のページへ自動遷移します（大量処理向け）
                </p>
              </button>

              <button
                type="button"
                onClick={() => onChangeStampingMode('free_mode')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  stampingMode === 'free_mode'
                    ? 'border-emerald-500 bg-emerald-50/40 text-emerald-700 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-650 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>② 自由押印モード</span>
                  {stampingMode === 'free_mode' && <span className="text-[9px] bg-emerald-600 text-white font-mono px-1 rounded-sm">選択中</span>}
                </div>
                <p className="text-[10px] text-slate-450 mt-1">
                  好きなページやPDFを自由に切り替えながらスタンプを押せます
                </p>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-150 bg-slate-50/30 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('single')}
          className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'single'
              ? 'border-blue-600 text-blue-600 bg-blue-50/5'
              : 'border-transparent text-slate-450 hover:text-slate-650 hover:bg-slate-50'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          単品スタンプ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('set')}
          className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'set'
              ? 'border-blue-600 text-blue-600 bg-blue-50/5'
              : 'border-transparent text-slate-450 hover:text-slate-650 hover:bg-slate-50'
          }`}
        >
          <Layers2 className="w-3.5 h-3.5" />
          一括スタンプセット
        </button>
      </div>

      {/* Templates List */}
      <div className="p-4 border-b border-slate-150 flex-1 overflow-y-auto min-h-[160px] space-y-4">
        {activeTab === 'single' && (
          <>
            {/* Header template actions */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 font-display block">スタンプテンプレート</span>
                <span className="text-[10px] text-slate-450">（ドラッグ＆ドロップで並び替え）</span>
              </div>
              <button
                type="button"
                onClick={onTriggerCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                新規作成
              </button>
            </div>

            {/* Favorites Section */}
            {favoriteTemplates.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400" />
                  お気に入り ({favoriteTemplates.length})
                </span>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
                  {favoriteTemplates.map((template) => {
                    const isSelected = template.id === activeTemplateId;
                    const isDragged = template.id === draggedId;
                    const isDragOver = template.id === dragOverId;
                    return (
                      <div
                        key={template.id}
                        onClick={() => onSelectTemplate(isSelected ? null : template.id)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, template.id)}
                        onDragOver={(e) => handleDragOver(e, template.id)}
                        onDragEnter={(e) => handleDragEnter(e, template.id)}
                        onDragLeave={handleDragLeave}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, template.id)}
                        className={`group relative p-2.5 border rounded-xl flex flex-col items-center justify-between text-center cursor-grab active:cursor-grabbing transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/25 ring-1 ring-blue-500/20'
                            : 'border-slate-150 hover:border-slate-250 bg-slate-50'
                        } ${isDragged ? 'opacity-30 border-dashed border-blue-400' : ''} ${
                          isDragOver ? 'scale-105 border-blue-500 bg-blue-50/10 shadow-sm' : ''
                        }`}
                      >
                        {/* Visual Stamp preview */}
                        <div className="h-14 flex items-center justify-center p-1 w-full relative">
                          {stampPreviewUrls[template.id] ? (
                            <img
                              src={stampPreviewUrls[template.id]}
                              alt={template.name}
                              className="max-h-full max-w-full object-contain filter drop-shadow-xs"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 animate-pulse">印影...</span>
                          )}
                        </div>
                        
                        {/* Stamp Title */}
                        <span className="truncate w-full block text-[10px] leading-tight font-bold text-slate-700 mt-1" title={template.name}>
                          {template.name}
                        </span>

                        {/* Quick Star */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(template.id);
                          }}
                          className="absolute top-1 right-1 p-0.5 rounded-full text-amber-400 hover:scale-110 transition-transform"
                        >
                          <Star className="w-3 h-3 fill-amber-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Remaining / Default list */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold text-slate-400">標準・カスタムスタンプ</span>
              
              <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
                {otherTemplates.map((template) => {
                  const isSelected = template.id === activeTemplateId;
                  const isDragged = template.id === draggedId;
                  const isDragOver = template.id === dragOverId;
                  return (
                    <div
                      key={template.id}
                      onClick={() => onSelectTemplate(isSelected ? null : template.id)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, template.id)}
                      onDragOver={(e) => handleDragOver(e, template.id)}
                      onDragEnter={(e) => handleDragEnter(e, template.id)}
                      onDragLeave={handleDragLeave}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, template.id)}
                      className={`group relative p-2 border rounded-xl flex flex-col items-center justify-between text-center cursor-grab active:cursor-grabbing transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/25 ring-1 ring-blue-500/20'
                          : 'border-slate-150 hover:border-slate-250 bg-white'
                      } ${isDragged ? 'opacity-30 border-dashed border-blue-400' : ''} ${
                        isDragOver ? 'scale-105 border-blue-500 bg-blue-50/10 shadow-sm' : ''
                      }`}
                    >
                      {/* Stamp Display */}
                      <div className="h-12 flex items-center justify-center p-1 w-full">
                        {stampPreviewUrls[template.id] ? (
                          <img
                            src={stampPreviewUrls[template.id]}
                            alt={template.name}
                            className="max-h-full max-w-full object-contain filter drop-shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 animate-pulse">印影...</span>
                        )}
                      </div>
                      
                      {/* Name */}
                      <span className="truncate w-full block text-[9px] leading-tight font-bold text-slate-650 mt-1" title={template.name}>
                        {template.name}
                      </span>

                      {/* Favorite toggle overlay */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(template.id);
                          }}
                          className="p-0.5 bg-white/90 rounded-full border border-slate-200 text-slate-400 hover:text-amber-500 transition-colors"
                          title="お気に入りに追加"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        {!template.isBuiltIn && (
                          <button
                            type="button; hover:scale-105"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTemplate(template.id);
                            }}
                            className="p-0.5 bg-white/90 rounded-full border border-slate-200 text-slate-400 hover:text-red-500 transition-colors"
                            title="消去"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'set' && (
          <div className="space-y-4">
            {/* Header / Save Layout Trigger */}
            <div className="space-y-2 pb-2 border-b border-slate-150">
              <div>
                <span className="text-xs font-bold text-slate-555 block font-display">
                  一括配置テンプレート（スタンプセット）
                </span>
                <span className="text-[10px] text-slate-450 block">（ドラッグ＆ドロップで並び替え）</span>
              </div>
              
              {!isSavingSet ? (
                <button
                  type="button"
                  disabled={!hasFile}
                  onClick={() => setIsSavingSet(true)}
                  className="w-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-250 disabled:opacity-40 disabled:pointer-events-none text-slate-650 py-2 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="現在のページのスタンプ配置（位置、サイズ、不透明度を丸ごと一括スタンプセットとして保存します。）"
                >
                  <Save className="w-4 h-4 text-rose-500" />
                  現在の配置をセットとして保存
                </button>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-rose-250 space-y-2">
                  <span className="text-[10px] font-bold text-rose-650 block">現在の配置をスタンプセット名を入力して保存:</span>
                  <input
                    type="text"
                    value={customSetName}
                    onChange={(e) => setCustomSetName(e.target.value)}
                    className="w-full border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-rose-500 text-slate-700 select-text outline-none"
                    placeholder="例：承認印＆社外秘セット"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (customSetName.trim()) {
                          onSaveCurrentLayoutAsSet(customSetName.trim());
                          setCustomSetName('');
                          setIsSavingSet(false);
                        }
                      }}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs py-1.5 rounded-lg text-center cursor-pointer"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSavingSet(false)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold text-xs py-1.5 px-3 rounded-lg text-center cursor-pointer"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List of sets */}
            {stampSets.length === 0 ? (
              <div className="text-center py-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                <p className="text-[10px] text-slate-400 font-medium font-sans">作成されたセットはありません</p>
                <p className="text-[9px] text-slate-400 mt-0.5 font-sans">上のボタンから最初の配置セットを登録できます</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stampSets.map((set) => {
                  const isDragged = set.id === draggedSetId;
                  const isDragOver = set.id === dragOverSetId;
                  return (
                    <div
                      key={set.id}
                      draggable
                      onDragStart={(e) => handleSetDragStart(e, set.id)}
                      onDragOver={(e) => handleSetDragOver(e, set.id)}
                      onDragEnter={(e) => handleSetDragEnter(e, set.id)}
                      onDragLeave={handleSetDragLeave}
                      onDragEnd={handleSetDragEnd}
                      onDrop={(e) => handleSetDrop(e, set.id)}
                      onClick={() => {
                        if (hasFile) {
                          onApplyStampSet(set);
                        } else {
                          alert('セットを配置するには、まずPDFファイルを読み込んでください。');
                        }
                      }}
                      className={`group border cursor-grab active:cursor-grabbing p-3 rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                        isDragged
                          ? 'opacity-30 border-dashed border-blue-400 bg-slate-50 shadow-none'
                          : 'border-slate-150 hover:border-blue-350 bg-white'
                      } ${
                        isDragOver ? 'scale-[1.02] border-blue-500 bg-blue-50/10 shadow-sm' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="space-y-1 flex-1 min-w-0">
                          <span className="text-xs font-bold text-slate-750 block truncate group-hover:text-blue-600 transition-colors font-sans">
                            {set.name}
                          </span>
                          
                          {/* Stamp Labels list */}
                          <div className="flex flex-wrap gap-1">
                            {set.items.map((item, i) => (
                              <span
                                key={i}
                                className="text-[9px] px-1.5 py-0.5 rounded-md border text-slate-500 bg-slate-50 font-medium font-sans"
                                style={{ 
                                  color: item.textColor !== 'transparent' ? item.textColor : undefined,
                                  borderColor: item.textColor !== 'transparent' ? `${item.textColor}40` : undefined,
                                  backgroundColor: item.textColor !== 'transparent' ? `${item.textColor}05` : undefined
                                }}
                              >
                                {item.type === 'checkmark' ? '✓ Checked' : (item.text || '画像')}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Delete Trigger / Grab Handle */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!set.isBuiltIn && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteStampSet(set.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="セットを削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <span className="text-[9px] text-slate-450 font-bold block mt-2 text-right group-hover:text-blue-600 font-display">
                        クリックで一括配置 ({set.items.length}個) ➔
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

       {/* Adjustments Panel for selected Stamp */}
      <div className="border-b border-slate-150 bg-slate-50/40 select-none shrink-0">
        <button
          type="button"
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="w-full px-5 py-2.5 hover:bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-500 font-display transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-blue-500" />
            スタンプ詳細調整（選択中の印影）
          </span>
          {isSettingsOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-450" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-450" />}
        </button>

        {isSettingsOpen && (
          <div className="p-4 pt-0 pb-4 space-y-3">
            {activeTemplate ? (
              <div className="space-y-2.5 bg-white p-3 rounded-2xl border border-slate-105">
                {/* Display configuration specs */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-200 border border-slate-250 text-slate-650 font-bold px-1.5 py-0.5 rounded-md uppercase">
                    {activeTemplate.type}
                  </span>
                  <span className="text-xs font-bold text-slate-700 truncate">{activeTemplate.name}</span>
                </div>

                {/* Scale adjustment slider */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-450 mb-0.5">
                    <span>印面サイズ</span>
                    <span className="font-mono text-slate-650 text-xs font-bold">{activeWidth} × {activeHeight} pt</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={250}
                    value={activeWidth}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      // Preserve ratio
                      const ratio = activeTemplate.height / activeTemplate.width;
                      onUpdateActiveProps({
                        width: val,
                        height: Math.round(val * ratio)
                      });
                    }}
                    className="w-full h-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Opacity slider */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-450 mb-0.5">
                    <span>にじみ・不透明度</span>
                    <span className="font-mono text-slate-650 text-xs font-bold">{Math.round(activeOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={activeOpacity}
                    onChange={(e) => {
                      onUpdateActiveProps({ opacity: parseFloat(e.target.value) });
                    }}
                    className="w-full h-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Quick Colors Selector */}
                {activeTemplate.type !== 'image' && (
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">印色プリセット</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {quickColors.map((color) => {
                        const isSelected = activeColor === color.val;
                        return (
                          <button
                            key={color.val}
                            type="button"
                            onClick={() => onUpdateActiveProps({ textColor: color.val, borderColor: color.val })}
                            className={`px-2 py-1 border rounded-lg text-[9px] font-bold flex items-center gap-1 transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-200'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full block border border-slate-300" style={{ backgroundColor: color.val }} />
                            {color.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Save Customized Stamp to Template library */}
                <div className="pt-2.5 border-t border-slate-100 mt-1">
                  {!isSavingCustom ? (
                    <button
                      type="button"
                      onClick={() => setIsSavingCustom(true)}
                      className="w-full bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-650 py-2 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="現在の詳細設定（サイズ、にじみ、色）を、新しいカスタムスタンプテンプレートとして保存します。"
                    >
                      <Save className="w-3.5 h-3.5 text-blue-500" />
                      このスタンプをテンプレートとして保存
                    </button>
                  ) : (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-blue-200 space-y-2">
                      <span className="text-[10px] font-semibold text-blue-600 block">テンプレート名を入力:</span>
                      <input
                        type="text"
                        value={customSaveName}
                        onChange={(e) => setCustomSaveName(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-slate-705 focus:outline-none focus:border-blue-500 outline-none"
                        placeholder="例：様（特大サイズ）"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (customSaveName.trim()) {
                              onSaveActiveAsTemplate(customSaveName.trim());
                              setIsSavingCustom(false);
                            }
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 rounded-lg text-center cursor-pointer"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsSavingCustom(false)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold text-xs py-1.5 px-3 rounded-lg text-center cursor-pointer"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-white border border-dashed border-slate-200 rounded-xl">
                <p className="text-[10px] text-slate-400 font-medium">スタンプが選択されていません</p>
                <p className="text-[9px] text-slate-400 mt-0.5">テンプレートからスタンプをクリックしてください</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accordion Wrappers around Instant Action buttons */}
      <div className="border-b border-slate-150 select-none bg-slate-50/5 shrink-0">
        <button
          type="button"
          onClick={() => setIsBulkOpen(!isBulkOpen)}
          className="w-full px-5 py-2.5 hover:bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-500 font-display transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            一括同位置押印・その他
          </span>
          {isBulkOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-450" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-450" />}
        </button>

        {isBulkOpen && (
          <div className="p-4 pt-0 pb-4 space-y-2.5 shrink-0">
            {/* Bulk Placement Triggers */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={!hasFile || !activeTemplateId}
                onClick={() => {
                  if (confirmApplyAllPages) {
                    onApplyAllPages();
                    setConfirmApplyAllPages(false);
                  } else {
                    setConfirmApplyAllPages(true);
                    setTimeout(() => setConfirmApplyAllPages(false), 3000);
                  }
                }}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border disabled:opacity-45 disabled:pointer-events-none ${
                  confirmApplyAllPages
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-650 animate-pulse'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-650 shadow-xs'
                }`}
                title="現在のスタンプをPDFの全ページに同じ位置で一括押印します。"
              >
                <Layers className="w-3.5 h-3.5 animate-bounce" />
                {confirmApplyAllPages ? "⚠️ 本当に全ページに一括配置しますか？" : "全ページに一括同位置押印"}
              </button>

              <button
                type="button"
                disabled={!hasFile || !activeTemplateId}
                onClick={() => {
                  if (confirmApplyAllFiles) {
                    onApplyAllFiles();
                    setConfirmApplyAllFiles(false);
                  } else {
                    setConfirmApplyAllFiles(true);
                    setTimeout(() => setConfirmApplyAllFiles(false), 3000);
                  }
                }}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border disabled:opacity-45 disabled:pointer-events-none ${
                  confirmApplyAllFiles
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-650 animate-pulse'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-650 shadow-xs'
                }`}
                title="読み込まれているすべてのPDFファイルに、現在のスタンプを同じ座標で一括押印します。"
              >
                <Globe className="w-3.5 h-3.5" />
                {confirmApplyAllFiles ? "⚠️ 本当に全PDFファイルに一括配置しますか？" : "全PDFファイルに一括押印"}
              </button>

              <button
                type="button"
                disabled={!hasFile}
                onClick={() => {
                  if (confirmClear) {
                    onClearAllStamps();
                    setConfirmClear(false);
                  } else {
                    setConfirmClear(true);
                    setTimeout(() => setConfirmClear(false), 3000);
                  }
                }}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border disabled:opacity-45 disabled:pointer-events-none ${
                  confirmClear
                    ? 'bg-red-500 hover:bg-red-600 text-white border-red-550 animate-pulse'
                    : 'bg-white text-slate-500 hover:text-red-550 border-transparent hover:bg-red-50 hover:border-red-100 shadow-xs'
                }`}
              >
                {confirmClear ? "⚠️ 本当にすべての押印をクリアしますか？" : "現在のファイルの押印をすべてクリア"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion Wrapper around Backup & Restore */}
      <div className="border-b border-slate-150 select-none bg-slate-50/5 shrink-0">
        <button
          type="button"
          onClick={() => setIsBackupOpen(!isBackupOpen)}
          className="w-full px-5 py-2.5 hover:bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-500 font-display transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-500" />
            テンプレート入出力 (JSON)
          </span>
          {isBackupOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-450" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-450" />}
        </button>

        {isBackupOpen && (
          <div className="p-4 pt-0 pb-4 space-y-3 shrink-0">
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              作成したカスタムスタンプテンプレートや一括スタンプセットをJSONファイルとして保存・復元できます。
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onExportJSON}
                className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs font-sans"
                title="ローカルにカスタムテンプレートとセットをバックアップします。"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                エクスポート
              </button>

              <label
                className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-center font-sans"
                title="バックアップしたJSONファイルを読み込みます。"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-500" />
                インポート
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportJSON(file);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Compile Download Actions */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 mt-auto">
        <button
          type="button"
          disabled={!hasFile}
          onClick={onDownload}
          className="w-full bg-slate-900 hover:bg-slate-950 text-white disabled:hover:bg-slate-900 font-bold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer border border-slate-800"
        >
          <Download className="w-4 h-4 text-emerald-450" />
          PDFを書き出して保存
        </button>
      </div>

    </div>
  );
}
