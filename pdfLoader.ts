import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Star, Sparkles, Upload, Image as ImageIcon, Lock, Unlock } from 'lucide-react';
import { StampTemplate, StampType } from '../types';
import { renderStampToDataUrl } from '../utils/canvasRenderer';
import { COLOR_VERMILLION, COLOR_RED, COLOR_BLUE, COLOR_GREEN, COLOR_DARK, getTodayString } from '../utils/defaultTemplates';

interface StampCreatorProps {
  onAddTemplate: (newTemplate: StampTemplate) => void;
  onClose: () => void;
}

export default function StampCreator({ onAddTemplate, onClose }: StampCreatorProps) {
  const [name, setName] = useState('マイスタンプ');
  const [type, setType] = useState<StampType>('round_seal');
  const [text, setText] = useState('山田');
  const [subText, setSubText] = useState('検印');
  const [textColor, setTextColor] = useState(COLOR_VERMILLION);
  const [borderColor, setBorderColor] = useState(COLOR_VERMILLION);
  const [fontFamily, setFontFamily] = useState('Noto Serif JP');
  const [hasBorder, setHasBorder] = useState(true);
  const [isDoubleBorder, setIsDoubleBorder] = useState(false);
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(60);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [opacity, setOpacity] = useState(0.95);
  
  // Custom image handling
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [recolorImage, setRecolorImage] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Generated preview DataUrl
  const [previewUrl, setPreviewUrl] = useState('');
  
  // Adjust default parameters when switching type
  useEffect(() => {
    if (type === 'round_seal') {
      setText('山田');
      setSubText('');
      setHasBorder(true);
      setIsDoubleBorder(false);
      setWidth(50);
      setHeight(50);
      setFontFamily('Noto Serif JP');
    } else if (type === 'square_seal') {
      setText('東京山田\n図書之印');
      setSubText('');
      setHasBorder(true);
      setIsDoubleBorder(true);
      setWidth(60);
      setHeight(60);
      setFontFamily('Noto Serif JP');
    } else if (type === 'date_seal') {
      setText(getTodayString());
      setSubText('検印');
      setHasBorder(true);
      setIsDoubleBorder(false);
      setWidth(75);
      setHeight(75);
      setFontFamily('Noto Sans JP');
    } else if (type === 'text') {
      setText('確認済');
      setSubText('');
      setHasBorder(true);
      setIsDoubleBorder(false);
      setWidth(100);
      setHeight(36);
      setFontFamily('Noto Sans JP');
    } else if (type === 'checkmark') {
      setText('');
      setSubText('');
      setHasBorder(false);
      setWidth(35);
      setHeight(35);
      setTextColor(COLOR_GREEN);
    } else if (type === 'image') {
      setName('画像ロゴスタンプ');
      setWidth(80);
      setHeight(80);
      setHasBorder(false);
    }
  }, [type]);

  // Dimensions synchronization
  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (aspectLocked && type !== 'text' && type !== 'image') {
      setHeight(val);
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (aspectLocked && type !== 'text' && type !== 'image') {
      setWidth(val);
    }
  };

  // Re-generate preview dynamically
  useEffect(() => {
    if (type === 'image') {
      if (imageDataUrl) {
        setPreviewUrl(imageDataUrl);
      } else {
        setPreviewUrl('');
      }
      return;
    }
    
    const url = renderStampToDataUrl({
      type,
      text,
      subText,
      textColor,
      borderColor: hasBorder ? borderColor : 'transparent',
      fontFamily,
      hasBorder,
      isDoubleBorder,
      width,
      height
    }, { scale: 3 });
    
    setPreviewUrl(url);
  }, [type, text, subText, textColor, borderColor, fontFamily, hasBorder, isDoubleBorder, width, height, imageDataUrl]);

  // Manage image upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const srcUrl = event.target?.result as string;
      if (recolorImage) {
        applyRecolorMask(srcUrl, textColor);
      } else {
        setImageDataUrl(srcUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Applies authentic vermillion/custom coloration onto the transparent PNG pixels
  const applyRecolorMask = (dataUrl: string, hexColor: string) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Draw uploaded image
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      // Convert HEX color to RGB
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      
      // Iterate through pixels and tint non-transparent areas
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 10) { // If pixel is visible
          data[i] = r;     // R
          data[i + 1] = g; // G
          data[i + 2] = b; // B
        }
      }
      
      ctx.putImageData(imgData, 0, 0);
      setImageDataUrl(canvas.toDataURL());
    };
  };

  // Trigger recoloration when color picker changes and recolor toggle is enabled
  useEffect(() => {
    if (type === 'image' && imageDataUrl && recolorImage) {
      applyRecolorMask(imageDataUrl, textColor);
    }
  }, [textColor, recolorImage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'image' && !imageDataUrl) {
      alert('画像をアップロードしてください。');
      return;
    }

    const newTemplate: StampTemplate = {
      id: `custom-${Date.now()}`,
      name: name || 'カスタムスタンプ',
      type,
      text: type === 'image' ? undefined : text,
      subText: type === 'round_seal' || type === 'date_seal' ? subText : undefined,
      textColor,
      borderColor: hasBorder ? borderColor : 'transparent',
      fontFamily,
      hasBorder,
      isDoubleBorder,
      width,
      height,
      opacity,
      imageDataUrl: type === 'image' ? (imageDataUrl || undefined) : undefined,
      isFavorite: false,
      isBuiltIn: false
    };

    onAddTemplate(newTemplate);
    onClose();
  };

  const presetColors = [
    { name: '朱色 (定番)', value: COLOR_VERMILLION },
    { name: '赤色', value: COLOR_RED },
    { name: '青色', value: COLOR_BLUE },
    { name: '緑色', value: COLOR_GREEN },
    { name: '墨色 (黒)', value: COLOR_DARK }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-800 font-display">オリジナルスタンプを作成</h2>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-650 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0">
          
          {/* Left Panel: Settings */}
          <div className="space-y-4 pr-1">
            
            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">スタンプの種類</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'round_seal', label: '丸型印 (個人ハンコ)' },
                  { id: 'square_seal', label: '角型印 (会社・社印)' },
                  { id: 'date_seal', label: '日付印 (データー印)' },
                  { id: 'text', label: '文字スタンプ (定型文)' },
                  { id: 'checkmark', label: 'チェックマーク (✓)' },
                  { id: 'image', label: '画像ロゴ (アップロード)' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setType(cat.id as StampType)}
                    className={`p-2.5 rounded-xl border font-medium text-left transition-all ${
                      type === cat.id
                        ? 'border-rose-500 bg-rose-50/40 text-rose-600 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Display Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">スタンプの名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm"
                placeholder="管理用のお名前"
              />
            </div>

            {/* Condition-based Inputs depending on StampType */}
            {type !== 'checkmark' && type !== 'image' && (
              <div className="space-y-3">
                {type === 'date_seal' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">上段（部門等）</label>
                        <input
                          type="text"
                          value={subText}
                          onChange={(e) => setSubText(e.target.value)}
                          maxLength={6}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs"
                          placeholder="総務部, 検印など"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">下段（名前等）</label>
                        <input
                          type="text"
                          value={name === 'マイスタンプ' ? '佐藤' : name}
                          onChange={(e) => setName(e.target.value)}
                          maxLength={4}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs"
                          placeholder="佐藤"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">中段（日付）</label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        maxLength={12}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs text-center font-mono"
                        placeholder="2026.06.17"
                      />
                    </div>
                  </>
                ) : type === 'round_seal' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">スタンプ文字</label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        maxLength={4}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm"
                        placeholder="山田"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        分割（二重構成用の部門）
                      </label>
                      <input
                        type="text"
                        value={subText}
                        onChange={(e) => setSubText(e.target.value)}
                        maxLength={6}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs"
                        placeholder="（オプション）医事課など"
                      />
                    </div>
                  </div>
                ) : type === 'square_seal' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      印面文字（改行でバランス調整）
                    </label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      maxLength={18}
                      rows={2}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs"
                      placeholder="株式会社&#10;東京オフィス&#10;之印"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">スタンプ定型文</label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      maxLength={30}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm"
                      placeholder="ご注文ありがとうございました。"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Custom Image Upload Panel */}
            {type === 'image' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-500 mb-1">スタンプ用の画像をアップロード</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-250 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 transition-colors bg-slate-50"
                >
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs text-slate-600 font-medium">PNG、JPG、SVGに対応</p>
                  <p className="text-[10px] text-slate-400 mt-1">透過PNGが推奨されます</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </div>
                
                {imageDataUrl && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                      画像の読み込みが完了しました
                    </span>
                    <button
                      type="button"
                      onClick={() => setImageDataUrl(null)}
                      className="text-xs text-red-500 hover:underline font-medium"
                    >
                      クリア
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="recolor_image"
                    checked={recolorImage}
                    onChange={(e) => setRecolorImage(e.target.checked)}
                    className="w-4 h-4 text-rose-500 focus:ring-rose-500 rounded border-slate-300"
                  />
                  <label htmlFor="recolor_image" className="text-xs text-slate-600 font-medium">
                    非透過ピクセルをスタンプ朱色で再加色する
                  </label>
                </div>
              </div>
            )}

            {/* Visual configuration */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              
              {/* Preset colors */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>スタンプの色</span>
                  <span className="text-[10px] text-slate-400 font-mono">{textColor}</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 justify-between bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    {presetColors.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => {
                          setTextColor(col.value);
                          setBorderColor(col.value);
                        }}
                        style={{ backgroundColor: col.value }}
                        title={col.name}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          textColor === col.value ? 'border-amber-300 shadow-md ring-2 ring-rose-300' : 'border-white'
                        }`}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      setBorderColor(e.target.value);
                    }}
                    className="w-9 h-9 p-0.5 rounded-xl cursor-pointer border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Borders, fonts and options */}
              {type !== 'checkmark' && type !== 'image' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">フォント</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs text-slate-700"
                    >
                      <option value="Noto Serif JP">明朝体 (本格和風)</option>
                      <option value="Noto Sans JP">ゴシック体 (明瞭)</option>
                      <option value="sans-serif">標準サンセリフ</option>
                      <option value="JetBrains Mono">等幅フォント</option>
                    </select>
                  </div>
                  
                  {type !== 'date_seal' && (
                    <div className="flex flex-col justify-end">
                      <div className="flex items-center gap-1.5 py-1.5">
                        <input
                          type="checkbox"
                          id="has_border"
                          checked={hasBorder}
                          onChange={(e) => setHasBorder(e.target.checked)}
                          className="w-3.5 h-3.5 text-rose-500 focus:ring-rose-400 rounded border-slate-250"
                        />
                        <label htmlFor="has_border" className="text-xs text-slate-600 font-medium">
                          外枠つき
                        </label>
                        
                        {hasBorder && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <input
                              type="checkbox"
                              id="is_double"
                              checked={isDoubleBorder}
                              onChange={(e) => setIsDoubleBorder(e.target.checked)}
                              className="w-3.5 h-3.5 text-rose-500 focus:ring-rose-400 rounded border-slate-250"
                            />
                            <label htmlFor="is_double" className="text-xs text-slate-600 font-medium">
                              二重枠
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sizing panel */}
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">デフォルトサイズ (ピクセル)</span>
                  {type !== 'text' && type !== 'image' && (
                    <button
                      type="button"
                      onClick={() => setAspectLocked(!aspectLocked)}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-750 transition-colors bg-white px-2 py-0.5 rounded-md border border-slate-200"
                    >
                      {aspectLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      アスペクト比固定: {aspectLocked ? 'オン' : 'オフ'}
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">幅</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={20}
                        max={300}
                        value={width}
                        onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                      <span className="text-xs font-mono text-slate-600 w-8 text-right font-medium">{width}px</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">高さ</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={20}
                        max={300}
                        value={height}
                        disabled={aspectLocked && type !== 'text' && type !== 'image'}
                        onChange={(e) => handleHeightChange(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500 disabled:opacity-50"
                      />
                      <span className="text-xs font-mono text-slate-600 w-8 text-right font-medium">{height}px</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opacity level */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 flex justify-between">
                  <span>不透明度</span>
                  <span className="font-mono text-slate-400">{Math.round(opacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

            </div>

          </div>

          {/* Right Panel: Instant Live Preview */}
          <div className="flex flex-col items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[300px] h-full">
            <div className="w-full text-center mb-2">
              <span className="text-xs font-bold text-slate-450 uppercase tracking-widest font-display">リアルタイムプレビュー</span>
            </div>
            
            {/* Stamp Display Stage */}
            <div className="flex-1 flex items-center justify-center w-full">
              <div 
                className="chess-grid bg-white min-w-[200px] min-h-[200px] rounded-xl border border-dashed border-slate-200 shadow-inner p-8 flex items-center justify-center relative overflow-hidden"
                style={{
                  backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px), radial-gradient(#cbd5e1 1.2px, #ffffff 1.2px)',
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px'
                }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Stamp Preview"
                    style={{
                      width: `${Math.min(140, width)}px`,
                      height: `${Math.min(140, height)}px`,
                      opacity: opacity,
                      objectFit: 'contain'
                    }}
                    className="drop-shadow-sm select-none"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center text-slate-400 max-w-[150px]">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">
                      {type === 'image' ? '画像を追加してください' : '生成中...'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Hint & Save triggers */}
            <div className="w-full mt-4 space-y-3">
              <div className="text-[10px] text-slate-400 bg-white p-2.5 rounded-xl border border-slate-150 leading-relaxed">
                作成したスタンプ印影は、お使いのブラウザ（ローカルストレージ）に自動保存。お気に入りトレイにいつまでも入ります。
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-slate-250 bg-white hover:bg-slate-50 rounded-xl font-medium text-slate-650 text-xs transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={type === 'image' && !imageDataUrl}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-md shadow-rose-500/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  テンプレートに保存
                </button>
              </div>
            </div>

          </div>

        </form>

      </div>
    </div>
  );
}
