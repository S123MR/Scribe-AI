import React, { forwardRef, useMemo } from 'react';
import { NoteSettings, PaperType, TableStyle } from '../types';
import { marked } from 'marked';

interface PaperPreviewProps {
  text: string;
  settings: NoteSettings;
  pageNumber?: number;
}

// Configure marked to use GFM (GitHub Flavored Markdown) and breaks
marked.use({
  gfm: true,
  breaks: true,
});

// We use forwardRef to allow the parent to capture this DOM element for image generation
export const PaperPreview = forwardRef<HTMLDivElement, PaperPreviewProps>(({ text, settings, pageNumber }, ref) => {
  
  // Parse markdown safely
  const htmlContent = useMemo(() => {
    return marked.parse(text);
  }, [text]);

  // Dynamic styles based on settings
  const getPaperStyle = () => {
    const base = {
      backgroundColor: settings.paperColor,
      color: settings.inkColor,
      fontFamily: `"${settings.font}", cursive`,
      fontSize: `${settings.fontSize}px`,
      lineHeight: settings.lineHeight,
      letterSpacing: `${settings.letterSpacing}px`,
    };

    let backgroundStyle = {};
    let paddingLeft = '3rem'; // Default padding (p-12 = 3rem = 48px)

    switch (settings.paperType) {
      case PaperType.LINED:
        // Adjusted red line to be very close to left edge (30px)
        backgroundStyle = {
          backgroundImage: `
            linear-gradient(90deg, transparent 29px, #ef4444 29px, #ef4444 31px, transparent 31px),
            linear-gradient(#e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: `100% ${settings.lineHeight * settings.fontSize}px`,
          paddingTop: `${settings.lineHeight * settings.fontSize * 0.2}px`, 
        };
        // Padding just after the red line. 30px + ~12px padding = 42px ~= 2.6rem
        paddingLeft = '2.6rem'; 
        break;
      case PaperType.GRID:
        backgroundStyle = {
          backgroundImage: `
            linear-gradient(#cbd5e1 1px, transparent 1px),
            linear-gradient(90deg, #cbd5e1 1px, transparent 1px)
          `,
          backgroundSize: `25px 25px`,
        };
        break;
      case PaperType.DOTTED:
        backgroundStyle = {
          backgroundImage: `radial-gradient(#94a3b8 1.5px, transparent 1.5px)`,
          backgroundSize: `25px 25px`,
        };
        break;
      case PaperType.VINTAGE:
        backgroundStyle = {
          backgroundColor: '#fef3c7',
          backgroundImage: `
             repeating-linear-gradient(to right, transparent 0 100%, #17171705 100% 102%)
          `,
        };
        break;
      case PaperType.PLAIN:
      default:
        backgroundStyle = {};
        break;
    }

    return { ...base, ...backgroundStyle, paddingLeft };
  };

  // Generate Table CSS based on settings
  const getTableStyles = () => {
     const border = `2px solid ${settings.inkColor}`;
     // Sketchy border radius
     const borderRadius = "2px 5px 3px 6px"; 
     
     if (settings.tableStyle === TableStyle.MINIMAL) {
         return `
            .handwritten-content table { border: none; }
            .handwritten-content th { border-bottom: ${border}; }
            .handwritten-content td { border-bottom: 1px solid ${settings.inkColor}40; }
         `;
     }
     if (settings.tableStyle === TableStyle.STRIPED) {
         return `
            .handwritten-content table { border: ${border}; border-radius: ${borderRadius}; overflow: hidden; }
            .handwritten-content th { background-color: ${settings.inkColor}10; border-bottom: ${border}; }
            .handwritten-content tr:nth-child(even) { background-color: ${settings.inkColor}05; }
            .handwritten-content td { border-right: 1px solid ${settings.inkColor}20; }
            .handwritten-content td:last-child { border-right: none; }
         `;
     }
     // BORDERS (Default)
     return `
        .handwritten-content table { border: ${border}; border-radius: ${borderRadius}; }
        .handwritten-content th, .handwritten-content td { border: 1px solid ${settings.inkColor}; }
        .handwritten-content th { border-bottom: ${border}; background-color: ${settings.inkColor}05; }
     `;
  }

  const style = getPaperStyle();

  return (
    <div className="relative mb-8 shadow-xl transition-transform duration-300 origin-top">
        <style>{getTableStyles()}</style>
        <div 
        ref={ref}
        className="overflow-hidden relative bg-white"
        style={{
            width: '794px', 
            height: '1123px',
            ...style
        }}
        >
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-repeat z-10 mix-blend-multiply" 
            style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")` }}>
        </div>

        <div 
          className="relative z-20 h-full flex flex-col p-12"
          style={{ paddingLeft: style.paddingLeft }}
        >
            <div 
              className="handwritten-content flex-1 break-words overflow-hidden"
              dangerouslySetInnerHTML={{ __html: htmlContent as string }}
            />
            
            {pageNumber && (
                <div className="mt-auto pt-4 text-center opacity-40 text-xs font-sans pointer-events-none select-none">
                    Page {pageNumber}
                </div>
            )}
        </div>
        </div>
    </div>
  );
});

PaperPreview.displayName = 'PaperPreview';