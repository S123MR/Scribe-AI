import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { PaperPreview } from './components/PaperPreview';
import { ControlPanel } from './components/ControlPanel';
import { summarizeToNotes } from './services/geminiService';
import { HandwritingFont, PaperType, InkColor, NoteSettings, TableStyle } from './types';
import { paginateText } from './utils/textUtils';
import { htmlToMarkdown } from './utils/fileUtils';
import { PenTool, AlertCircle, RefreshCw } from 'lucide-react';

const DEFAULT_SETTINGS: NoteSettings = {
  font: HandwritingFont.INDIE_FLOWER,
  paperType: PaperType.LINED,
  inkColor: InkColor.BLUE,
  fontSize: 22,
  lineHeight: 1.6,
  letterSpacing: 0,
  paperColor: '#ffffff',
  tableStyle: TableStyle.BORDERS,
};

const INITIAL_TEXT = `Welcome to Scribe AI!

This tool turns your typed text into realistic handwritten notes.

We now support **bold text** and tables!

| Feature | Support |
| :--- | :--- |
| **Tables** | Yes |
| **Bold** | Yes |
| **Lined Paper** | Fixed Margin |

1. Type, paste (Rich Text supported!), or upload a .txt/.md/.docx/.pdf file.
2. The text will automatically flow across multiple pages.
3. Use "AI Format" to structure messy notes.
4. Download as a multi-page PDF or ZIP.

Try typing more text to see a new page appear...`;

export default function App() {
  const [text, setText] = useState<string>(INITIAL_TEXT);
  const [settings, setSettings] = useState<NoteSettings>(DEFAULT_SETTINGS);
  
  // State for AI generation (Gemini)
  const [isGenerating, setIsGenerating] = useState(false);
  // State for Local processing (PDF/Zip creation)
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  
  // Ref to store array of page elements
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Split text into pages based on settings
  const pages = useMemo(() => {
    return paginateText(text, settings.fontSize, settings.lineHeight);
  }, [text, settings.fontSize, settings.lineHeight]);

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const generatedNotes = await summarizeToNotes(text);
      setText(generatedNotes);
    } catch (err: any) {
      setError(err.message || "Failed to generate notes. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  }, [text]);

  const handleFileUpload = useCallback((content: string) => {
    setText(content);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    if (html) {
        e.preventDefault();
        try {
            const md = htmlToMarkdown(html);
            // Insert at current cursor position
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentText = text;
            
            // Add padding newlines to ensure markdown separation
            const insertText = `\n\n${md}\n\n`;
            
            const newText = currentText.substring(0, start) + insertText + currentText.substring(end);
            
            setText(newText);
        } catch (err) {
            console.warn("Failed to convert pasted HTML to Markdown, falling back to plain text.");
            const plainText = e.clipboardData.getData('text/plain');
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newText = text.substring(0, start) + plainText + text.substring(end);
            setText(newText);
        }
    }
  }, [text]);

  const handleDownloadImage = useCallback(async (pageIndex: number = 0) => {
    const targetPage = pageRefs.current[pageIndex];
    if (!targetPage) {
        setError("Page not found to download.");
        return;
    }
    
    setIsProcessing(true);
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(targetPage, {
        scale: 2,
        useCORS: true,
      });
      const image = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.href = image;
      link.download = `scribe-page-${pageIndex + 1}.jpg`;
      link.click();
    } catch (err) {
      console.error("Image download failed", err);
      setError("Failed to download image.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDownloadZip = useCallback(async () => {
     if (pageRefs.current.length === 0) return;
     setIsProcessing(true);
     
     try {
         await document.fonts.ready;
         const zip = new JSZip();
         const folder = zip.folder("handwritten-notes");
         
         for (let i = 0; i < pages.length; i++) {
             const pageEl = pageRefs.current[i];
             if (!pageEl) continue;
             
             const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true });
             const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
             
             if (blob && folder) {
                 folder.file(`page-${i+1}.jpg`, blob);
             }
         }
         
         const content = await zip.generateAsync({ type: "blob" });
         const link = document.createElement('a');
         link.href = URL.createObjectURL(content);
         link.download = "scribe-notes.zip";
         link.click();
         
     } catch (err) {
         console.error("Zip generation failed", err);
         setError("Failed to create ZIP.");
     } finally {
         setIsProcessing(false);
     }
  }, [pages.length]);

  const handleDownloadPDF = useCallback(async () => {
    if (pageRefs.current.length === 0) return;
    setIsProcessing(true);

    try {
      await document.fonts.ready;
      
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pageRefs.current[i];
        if (!pageEl) continue;

        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(pageEl, {
          scale: 2, // Higher scale for better PDF quality
          useCORS: true,
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save('scribe-notes.pdf');

    } catch (err) {
      console.error("PDF download failed", err);
      setError("Failed to generate PDF.");
    } finally {
        setIsProcessing(false);
    }
  }, [pages.length]);

  // Responsive scaling logic
  const [scale, setScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
        if (!previewContainerRef.current) return;
        const containerWidth = previewContainerRef.current.clientWidth;
        const PAGE_WIDTH = 794; // A4 width
        const PADDING = 48; // Safe padding
        
        // Calculate scale to fit width, maxing out at 1 (100%)
        // Min scale 0.3 to prevent total collapse
        // Ensure containerWidth is valid
        if (containerWidth < 100) return;

        const newScale = Math.max(0.3, Math.min(1, (containerWidth - PADDING) / PAGE_WIDTH));
        setScale(newScale);
    };

    updateScale();
    // Add debouncing could be good here but simplistic is fine for now
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden h-screen">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white p-4 border-b border-slate-200 flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
          <PenTool size={18} />
        </div>
        <h1 className="font-bold text-slate-800">Scribe AI</h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* Input Column */}
            <div className="w-full md:w-1/3 min-w-[320px] border-r border-slate-200 bg-white flex flex-col z-10 shadow-sm order-2 md:order-1 h-1/3 md:h-auto">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Editor</h2>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        {text.length} chars
                    </span>
                </div>
                <textarea
                    className="flex-1 w-full p-6 resize-none focus:outline-none focus:ring-inset focus:bg-slate-50/50 text-slate-700 font-mono text-sm leading-relaxed transition-colors"
                    placeholder="Type or paste your notes here... (Supports Rich Text pasting!)"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onPaste={handlePaste}
                    spellCheck={false}
                />
            </div>

            {/* Preview Column */}
            <div 
                ref={previewContainerRef}
                className="flex-1 bg-slate-200/50 overflow-y-auto flex flex-col items-center py-8 relative scroll-smooth order-1 md:order-2 h-2/3 md:h-auto"
            >
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                    {pages.map((pageText, index) => (
                        <PaperPreview 
                            key={index}
                            ref={(el) => { pageRefs.current[index] = el; }}
                            text={pageText} 
                            settings={settings}
                            pageNumber={index + 1}
                        />
                    ))}
                </div>
                
                {/* Bottom spacer */}
                <div className="h-12 w-full shrink-0"></div>
            </div>

            {/* Error Toast */}
            {error && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-up">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                    <button 
                    onClick={() => setError(null)}
                    className="ml-auto text-red-500 hover:text-red-800"
                    >
                        &times;
                    </button>
                </div>
            )}
            
            {/* Loading Overlay for Processing (PDF/ZIP) */}
            {isProcessing && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-slate-100">
                        <RefreshCw className="animate-spin text-slate-600" size={32} />
                        <p className="text-slate-600 font-medium">Generating Document...</p>
                    </div>
                </div>
            )}

             {/* Loading Overlay for AI Generation */}
             {isGenerating && (
                <div className="absolute inset-0 bg-indigo-900/10 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-indigo-100">
                        <RefreshCw className="animate-spin text-indigo-600" size={32} />
                        <p className="text-indigo-600 font-medium">AI Writing Notes...</p>
                    </div>
                </div>
            )}
      </div>

      {/* Right: Controls Sidebar */}
      <div className="w-full md:w-80 h-auto md:h-full shrink-0 border-t md:border-t-0 z-20 shadow-xl bg-white hidden md:block">
        <ControlPanel
          settings={settings}
          onSettingsChange={setSettings}
          onGenerate={handleGenerate}
          onDownloadImage={handleDownloadImage}
          onDownloadZip={handleDownloadZip}
          onDownloadPDF={handleDownloadPDF}
          onFileUpload={handleFileUpload}
          isGenerating={isGenerating}
          isProcessing={isProcessing}
          totalPages={pages.length}
        />
      </div>
      
    </div>
  );
}