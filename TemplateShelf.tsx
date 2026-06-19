import React, { useRef } from 'react';
import { FileUp, FileText, ChevronRight, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { PDFDocumentFile } from '../types';

interface SidebarProps {
  files: PDFDocumentFile[];
  activeFileId: string | null;
  activePageNumber: number;
  onSelectFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
  onSelectPage: (pageNum: number) => void;
  onFilesUpload: (uploadedFiles: FileList) => void;
  isLoading: boolean;
  loadingStatus: string;
}

export default function Sidebar({
  files,
  activeFileId,
  activePageNumber,
  onSelectFile,
  onRemoveFile,
  onSelectPage,
  onFilesUpload,
  isLoading,
  loadingStatus
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const activeFile = files.find((f) => f.id === activeFileId);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesUpload(e.dataTransfer.files);
    }
  };

  // Format bytes for display
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="w-80 border-r border-slate-200 bg-white flex flex-col h-full text-slate-700 font-sans select-none shrink-0">
      
      {/* Upload Zone */}
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="p-5 border-b border-slate-150 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex flex-col items-center justify-center text-center relative group"
      >
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:bg-blue-100/70 group-hover:scale-105 transition-all duration-300 shadow-[0_2px_8px_rgba(59,130,246,0.08)] mb-3">
          <FileUp className="w-5.5 h-5.5 text-blue-500" />
        </div>
        <span className="text-xs font-bold text-slate-700">PDFをドラッグ ＆ ドロップ</span>
        <span className="text-[10px] text-slate-450 mt-1">またはファイル選択（複数対応）</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => e.target.files && onFilesUpload(e.target.files)}
          className="hidden"
        />
        
        {isLoading && (
          <div className="absolute inset-x-0 bottom-0 top-0 bg-white/95 flex flex-col items-center justify-center p-3">
            <div className="w-5 h-5 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mb-2" />
            <span className="text-[10px] text-slate-600 font-medium animate-pulse">{loadingStatus || '読み込み中...'}</span>
          </div>
        )}
      </div>

      {/* Loaded Files Row */}
      <div className="p-4 border-b border-slate-150">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 font-display">読み込んだPDF ({files.length})</span>
        </div>
        
        {files.length === 0 ? (
          <div className="text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-3 flex flex-col items-center">
            <FileText className="w-6 h-6 text-slate-300 mb-1" />
            <span className="text-[10px] text-slate-400 font-medium">PDFファイルがありません</span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {files.map((file) => {
              const isActive = file.id === activeFileId;
              const stampedCount = file.placedElements.length;
              return (
                <div 
                  key={file.id}
                  onClick={() => onSelectFile(file.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-blue-50 border border-blue-200 text-blue-600' 
                      : 'hover:bg-slate-50 border border-transparent text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                    <FileText className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                    <span className="truncate pr-1 block text-left leading-tight" title={file.name}>{file.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {stampedCount > 0 && (
                      <span className="bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 text-[9px] rounded-full border border-blue-100 shadow-xs">
                        {stampedCount}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(file.id);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Page Previews / Thumbnails */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20">
        <span className="text-xs font-bold text-slate-500 block font-display">ページプレビュー</span>
        
        {activeFile ? (
          <div className="grid grid-cols-2 gap-3 pb-4">
            {activeFile.thumbnailPageUrls.map((thumbUrl, idx) => {
              const pageNum = idx + 1;
              const isActivePage = pageNum === activePageNumber;
              const pageStamps = activeFile.placedElements.filter(el => el.pageNumber === pageNum);
              const isStamped = pageStamps.length > 0;
              
              return (
                <div 
                  key={pageNum}
                  onClick={() => onSelectPage(pageNum)}
                  className={`flex flex-col items-center group cursor-pointer ${
                    isActivePage ? 'scale-103' : ''
                  }`}
                >
                  <div className={`relative bg-white rounded-xl overflow-hidden shadow-sm transition-all group-hover:shadow-md border-2 ${
                    isActivePage 
                      ? 'border-rose-500 ring-2 ring-rose-100' 
                      : 'border-slate-200 group-hover:border-slate-350'
                  }`}>
                    {thumbUrl ? (
                      <img 
                        src={thumbUrl} 
                        alt={`Page ${pageNum}`} 
                        className="w-full h-auto object-cover max-h-36 block select-none pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-24 h-32 flex items-center justify-center bg-slate-100 text-slate-400">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    )}
                    
                    {/* Floating Indicators */}
                    <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
                      {isStamped && (
                        <span className="bg-emerald-500 text-white font-bold px-1 py-0.5 rounded-md text-[8px] flex items-center gap-0.5 border border-emerald-400/30 shadow-xs">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {pageStamps.length}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/85 p-1 text-center backdrop-blur-xs">
                      <span className="text-[10px] font-bold text-slate-100">{pageNum} / {activeFile.thumbnailPageUrls.length} p</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
            <FileText className="w-10 h-10 mb-2 opacity-30 text-slate-300" />
            <p className="text-xs px-2 leading-relaxed">
              PDFファイルをアップロードすると、ここに各ページの一覧が表示されます。
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
