/**
 * Splits a long text string into multiple pages based on page dimensions and font size.
 * Uses a buffer system to treat Tables and Lists as blocks to avoid splitting them awkwardly.
 * 
 * @param text The full text to split
 * @param fontSize Current font size in pixels
 * @param lineHeight Line height multiplier (e.g., 1.5)
 * @returns Array of strings, where each string is a page
 */
export const paginateText = (text: string, fontSize: number, lineHeight: number): string[] => {
    if (!text) return [''];
  
    // A4 dimensions in pixels (794x1123)
    const PAGE_HEIGHT = 1123;
    
    // Aggressive vertical padding reduction to minimize whitespace
    // Visual padding is 48px bottom. We allow text to go up to 40px from bottom edge.
    const VERTICAL_PADDING = 40; 
    const AVAILABLE_HEIGHT = PAGE_HEIGHT - VERTICAL_PADDING;
    
    const pxPerLine = fontSize * lineHeight;
    
    const PAGE_WIDTH = 794;
    // Lined paper now has ~56px left padding + 48px right = 104px.
    const HORIZONTAL_PADDING_PX = 104; 
    const USABLE_WIDTH = PAGE_WIDTH - HORIZONTAL_PADDING_PX;
    
    const avgCharWidth = fontSize * 0.44; 
    const charsPerLine = Math.floor(USABLE_WIDTH / avgCharWidth);
  
    const lines = text.split('\n');
    const pages: string[] = [];
    
    let currentPageContent = '';
    let currentHeightUsed = 0;
    
    // Helper to calculate height of a block of text
    const calculateBlockHeight = (blockLines: string[]): number => {
        let height = 0;
        for (const line of blockLines) {
            let estimatedLines = 0;
            let extraHeight = 0;

            if (/^#{1,6}\s/.test(line)) {
                extraHeight += pxPerLine * 0.5; 
                estimatedLines = Math.ceil(line.length / (charsPerLine * 0.8)); 
            }
            // Table Row: significantly taller due to padding
            else if (/^\|.*\|$/.test(line.trim())) {
                extraHeight += pxPerLine * 0.8; // Table padding factor
                estimatedLines = 1;
            }
            // Horizontal Rule
            else if (/^---$/.test(line.trim())) {
                 extraHeight += pxPerLine * 0.5;
                 estimatedLines = 0;
            }
            else {
                 estimatedLines = Math.max(1, Math.ceil(line.length / charsPerLine));
            }
            height += (estimatedLines * pxPerLine) + extraHeight;
        }
        return height;
    };

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        
        // --- Block Detection ---
        // We try to grab a logical "chunk" (like a table) to decide if it fits
        const blockBuffer: string[] = [];
        let isTable = false;

        if (/^\|.*\|$/.test(line.trim())) {
            // Start of a table
            isTable = true;
            // Consume until end of table
            let j = i;
            while (j < lines.length && /^\|.*\|$/.test(lines[j].trim())) {
                blockBuffer.push(lines[j]);
                j++;
            }
        } else {
            // Single line block
            blockBuffer.push(line);
        }

        const blockHeight = calculateBlockHeight(blockBuffer);

        // Does it fit?
        if (currentHeightUsed + blockHeight > AVAILABLE_HEIGHT) {
            // If the page is empty, we force it in (unless it's bigger than a WHOLE page)
            if (currentHeightUsed === 0) {
                 pages.push(blockBuffer.join('\n'));
                 currentPageContent = '';
                 currentHeightUsed = 0;
            } else {
                // Page is full, push current page
                pages.push(currentPageContent);
                
                // Start new page with this block
                currentPageContent = blockBuffer.join('\n') + '\n';
                currentHeightUsed = blockHeight;
            }
        } else {
            // Fits in current page
            currentPageContent += blockBuffer.join('\n') + '\n';
            currentHeightUsed += blockHeight;
        }

        // Advance index
        i += blockBuffer.length;
    }
  
    if (currentPageContent.trim()) {
      pages.push(currentPageContent);
    }
  
    return pages.length > 0 ? pages : [''];
};