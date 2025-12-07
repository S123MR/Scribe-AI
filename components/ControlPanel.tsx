import React, { useRef, useState } from 'react';
import { HandwritingFont, InkColor, NoteSettings, PaperType, TableStyle } from '../types';
import { Type, RefreshCw, Sparkles, Upload, FileType, File, FolderArchive, Grid3X3 } from 'lucide-react';
import { parseFile } from '../utils/fileUtils';

interface ControlPanelProps {
  settings: NoteSettings;
  onSettingsChange: (newSettings: NoteSettings) => void;
  onGenerate: () => void;
  onDownloadImage: (pageIndex?: number) => void;
  onDownloadZip: () => void;
  onDownloadPDF: () => void;
  onFileUpload: (content: string) => void;
  isGenerating: boolean;
  isProcessing: boolean;
  totalPages: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  onSettingsChange,
  onGenerate,
  onDownloadImage,
  onDownloadZip,
  onDownloadPDF,
  onFileUpload,
  isGenerating,
  isProcessing,
  totalPages
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPageForDownload, setSelectedPageForDownload] = useState(1);
  const [isReadingFile, setIsReadingFile] = useState(false);

  const update = (key: keyof NoteSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    try {
        const content = await parseFile(file);
        if (content) {
            onFileUpload(content);
        }
    } catch (error) {
        console.error("Failed to read file", error);
        alert("Failed to read file. Please ensure it is a valid text, docx, or pdf file.");
    } finally {
        setIsReadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 p-6 bg-white border-l border-slate-200 overflow-y-auto no-scrollbar">
      
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-800">Scribe AI</h2>
        <p className="text-xs text-slate-500">Handwritten notes generator</p>
      </div>

      {/* Input Actions */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Source</label>
        
        <div className="grid grid-cols-2 gap-2">
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isReadingFile}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
                {isReadingFile ? <RefreshCw size={14} className="animate-spin"/> : <Upload size={14} />}
                <span>Import File</span>
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".txt,.md,.json,.docx,.pdf" 
                onChange={handleFileChange}
            />

            <button
            onClick={onGenerate}
            disabled={isGenerating || isProcessing}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium transition-colors"
            >
            {isGenerating ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
            <span>AI Format</span>
            </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center">Supports .txt, .md, .docx, .pdf</p>
      </div>

      <hr className="border-slate-100" />

      {/* Font Settings */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Type size={14} /> Font Style
        </label>
        <div className="grid grid-cols-1 gap-2">
          {Object.values(HandwritingFont).map((font) => (
            <button
              key={font}
              onClick={() => update('font', font)}
              className={`text-left px-3 py-2 rounded-lg border text-lg transition-all ${
                settings.font === font 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600' 
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
              style={{ fontFamily: font }}
            >
              {font}
            </button>
          ))}
        </div>
        
        <div className="space-y-4 mt-4">
           <div>
            <div className="flex justify-between text-xs mb-1.5 text-slate-600">
              <span>Size</span>
              <span>{settings.fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="42"
              value={settings.fontSize}
              onChange={(e) => update('fontSize', Number(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
           </div>

           <div>
            <div className="flex justify-between text-xs mb-1.5 text-slate-600">
              <span>Spacing</span>
              <span>{settings.letterSpacing}px</span>
            </div>
            <input
              type="range"
              min="-2"
              max="5"
              step="0.5"
              value={settings.letterSpacing}
              onChange={(e) => update('letterSpacing', Number(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
           </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Paper & Ink */}
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <File size={14} /> Paper & Ink
        </label>

        <div className="grid grid-cols-3 gap-2">
          {Object.values(PaperType).map((type) => (
            <button
              key={type}
              onClick={() => update('paperType', type)}
              className={`h-10 rounded-md border text-xs font-medium flex items-center justify-center transition-all ${
                settings.paperType === type
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.values(InkColor).map((color) => (
             <button
              key={color}
              onClick={() => update('inkColor', color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                settings.inkColor === color ? 'border-indigo-600 shadow-md scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
             />
          ))}
        </div>

        {/* Table Style */}
        <div className="mt-2">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Grid3X3 size={10} /> Table Style
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {Object.values(TableStyle).map((style) => (
                    <button
                        key={style}
                        onClick={() => update('tableStyle', style)}
                        className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all ${
                            settings.tableStyle === style 
                            ? 'bg-white shadow-sm text-indigo-600' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {style}
                    </button>
                ))}
            </div>
        </div>

      </div>

      <div className="mt-auto pt-6 flex flex-col gap-2">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Export</label>
            
            <button
                onClick={onDownloadPDF}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-sm text-sm"
            >
                {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <File size={16} />}
                <span>Download PDF (All)</span>
            </button>
            
            <button
                onClick={onDownloadZip}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-lg font-medium transition-colors text-sm"
            >
                <FolderArchive size={16} />
                <span>Download All (Images ZIP)</span>
            </button>

            <div className="flex gap-2">
                <input 
                    type="number" 
                    min="1" 
                    max={totalPages} 
                    value={selectedPageForDownload}
                    onChange={(e) => setSelectedPageForDownload(Math.min(Math.max(1, parseInt(e.target.value) || 1), totalPages))}
                    className="w-16 px-2 py-1 text-sm border border-slate-200 rounded-lg text-center"
                />
                <button
                    onClick={() => onDownloadImage(selectedPageForDownload - 1)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors text-sm"
                >
                    <FileType size={16} />
                    <span>Save Page</span>
                </button>
            </div>
        </div>
      </div>

    </div>
  );
};