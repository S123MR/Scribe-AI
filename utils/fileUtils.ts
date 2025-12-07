import * as pdfjsLib from 'pdfjs-dist';

// Handle potential ESM default export wrapper
// Some CDN builds put the library under .default, others export it directly
const pdf = (pdfjsLib as any).default || pdfjsLib;

// Set worker source for PDF.js
// We use the same version as in importmap to ensure compatibility
if (pdf.GlobalWorkerOptions) {
    pdf.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

/**
 * Main entry point to parse various file types
 */
export const parseFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  try {
    if (extension === 'docx') {
        return await parseDocx(file);
    } else if (extension === 'pdf') {
        return await parsePdf(file);
    } else {
        // Fallback for text/md/json
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string || '');
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
  } catch (err) {
      console.error("File parsing error:", err);
      throw new Error(`Failed to parse ${extension?.toUpperCase()} file.`);
  }
}

/**
 * Parse DOCX using Mammoth (loaded globally in index.html)
 * We use convertToHtml + htmlToMarkdown to preserve formatting like bold, tables, lists
 */
async function parseDocx(file: File): Promise<string> {
   const arrayBuffer = await file.arrayBuffer();
   // @ts-ignore - Mammoth is loaded via script tag
   if (!window.mammoth) throw new Error("Mammoth library not loaded");
   
   // @ts-ignore
   // convertToHtml preserves structure better than extractRawText
   const result = await window.mammoth.convertToHtml({ arrayBuffer });
   
   // Convert the HTML result to Markdown
   return htmlToMarkdown(result.value);
}

/**
 * Parse PDF using PDF.js
 */
async function parsePdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    
    // getDocument returns a loading task, we need the promise
    const loadingTask = pdf.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        
        // Basic layout preservation: add newline if y-coordinate changes significantly?
        // For now, standard joining. PDF structure extraction is complex.
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
    }
    return fullText;
}

/**
 * Convert HTML string to Markdown using Turndown (loaded globally)
 * Used for rich text pasting and DOCX conversion
 */
export const htmlToMarkdown = (html: string): string => {
    // @ts-ignore
    if (!window.TurndownService) return html; 
    
    // @ts-ignore
    const turndownService = new window.TurndownService({
        headingStyle: 'atx', // Use # for headings
        bulletListMarker: '-', // Use - for bullets
        codeBlockStyle: 'fenced'
    });

    // @ts-ignore
    // Use GFM plugin for tables if available
    if (window.turndownPluginGfm) {
        // @ts-ignore
        const gfm = window.turndownPluginGfm.gfm;
        turndownService.use(gfm);
    }
    
    return turndownService.turndown(html);
}