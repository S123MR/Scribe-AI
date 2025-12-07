/**
 * Splits a long text string into multiple pages based on page dimensions and font size.
 * Handles wrapping of long lines and keeps tables/blocks together where possible.
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
    
    // Vertical padding
    // 48px top padding + 48px bottom padding = 96px reserved.
    // We allow content to go up to 1020px roughly.
    const VERTICAL_PADDING = 96; 
    const AVAILABLE_HEIGHT = PAGE_HEIGHT - VERTICAL_PADDING;
    
    const pxPerLine = fontSize * lineHeight;
    
    const PAGE_WIDTH = 794;
    // Horizontal padding. Lined paper is now ~42px left. Right is 48px. Total ~90px.
    const HORIZONTAL_PADDING_PX = 92; 
    const USABLE_WIDTH = PAGE_WIDTH - HORIZONTAL_PADDING_PX;
    
    // Average char width estimation for handwriting fonts (they are often condensed)
    const avgCharWidth = fontSize * 0.45; 
    const charsPerLine = Math.floor(USABLE_WIDTH / avgCharWidth);
  
    // 1. Split into logical blocks (Paragraphs, Tables, HRs)
    const rawLines = text.split('\n');
    const blocks: { type: 'text' | 'table' | 'hr', content: string[] }[] = [];
    
    let i = 0;
    while (i < rawLines.length) {
        const line = rawLines[i];
        const trimmed = line.trim();

        // Table Detection
        // Check if line starts with | (common for GFM tables)
        if (trimmed.startsWith('|')) {
            const tableLines: string[] = [];
            let j = i;
            // Collect all consecutive lines that look like table rows
            while (j < rawLines.length && rawLines[j].trim().startsWith('|')) {
                tableLines.push(rawLines[j]);
                j++;
            }
            blocks.push({ type: 'table', content: tableLines });
            i = j;
            continue;
        }

        // HR Detection
        if (/^---$/.test(trimmed) || /^___$/.test(trimmed) || /^\*\*\*$/.test(trimmed)) {
            blocks.push({ type: 'hr', content: [line] });
            i++;
            continue;
        }

        // Normal text (paragraphs)
        blocks.push({ type: 'text', content: [line] });
        i++;
    }

    // 2. Process blocks into Pages
    const pages: string[] = [];
    let currentPageLines: string[] = [];
    let currentHeightUsed = 0;

    const pushPage = () => {
        if (currentPageLines.length > 0) {
            pages.push(currentPageLines.join('\n'));
        } else {
            // Push empty page if somehow triggered
            pages.push('');
        }
        currentPageLines = [];
        currentHeightUsed = 0;
    };

    // Helper to calculate height of lines
    const getLineHeight = (isHeader: boolean, isTable: boolean, isHr: boolean) => {
        if (isTable) return pxPerLine * 1.0; 
        if (isHr) return pxPerLine * 0.5;
        if (isHeader) return pxPerLine * 1.5;
        return pxPerLine;
    };

    const wrapText = (str: string, max: number): string[] => {
        if (str.length <= max) return [str];
        const words = str.split(' ');
        const wrapped: string[] = [];
        let current = words[0] || '';

        for (let k = 1; k < words.length; k++) {
            const word = words[k];
            if (current.length + 1 + word.length <= max) {
                current += ' ' + word;
            } else {
                wrapped.push(current);
                current = word;
            }
        }
        wrapped.push(current);
        return wrapped;
    };

    for (const block of blocks) {
        if (block.type === 'table') {
            // Identify headers (assume first 2 lines: Title row + Separator row)
            const headers = block.content.slice(0, 2);
            const tableHeight = block.content.length * getLineHeight(false, true, false);
            
            // Check if entire table fits on current page
            if (currentHeightUsed + tableHeight <= AVAILABLE_HEIGHT) {
                // Add spacer if needed
                if (currentPageLines.length > 0) {
                     currentPageLines.push(''); 
                     currentHeightUsed += pxPerLine;
                }
                currentPageLines.push(...block.content);
                currentHeightUsed += tableHeight; 
            } 
            else {
                // Table must be split.
                // Add newline spacer if we are not at top
                if (currentPageLines.length > 0 && currentHeightUsed > 0) {
                     currentPageLines.push('');
                     currentHeightUsed += pxPerLine;
                }

                // Iterate through rows
                for (let r = 0; r < block.content.length; r++) {
                    const row = block.content[r];
                    const isHeaderRow = r < 2;

                    // If page is full, push new page
                    if (currentHeightUsed + pxPerLine > AVAILABLE_HEIGHT) {
                        pushPage();
                        
                        // CRITICAL: If we split a table, we MUST repeat headers on the new page
                        // so it renders as a valid table, UNLESS we are currently printing the headers.
                        // Only repeat if we have valid headers (length >= 2)
                        if (!isHeaderRow && headers.length === 2) {
                            currentPageLines.push(...headers);
                            currentHeightUsed += (headers.length * pxPerLine);
                        }
                    }
                    
                    currentPageLines.push(row);
                    currentHeightUsed += pxPerLine;
                }
            }
        } 
        else if (block.type === 'hr') {
             const h = getLineHeight(false, false, true);
             if (currentHeightUsed + h > AVAILABLE_HEIGHT) {
                 pushPage();
             }
             currentPageLines.push(block.content[0]);
             currentHeightUsed += h;
        }
        else {
            // Text Block (Paragraph)
            const line = block.content[0];
            const isHeader = /^#{1,6}\s/.test(line);
            
            if (isHeader) {
                const height = getLineHeight(true, false, false);
                if (currentHeightUsed + height > AVAILABLE_HEIGHT) {
                    pushPage();
                }
                currentPageLines.push(line);
                currentHeightUsed += height;
            } else {
                // Wrap text for accurate height calculation
                const visualLines = wrapText(line, charsPerLine);
                
                for (let k = 0; k < visualLines.length; k++) {
                    const vLine = visualLines[k];
                    const height = pxPerLine;
                    
                    if (currentHeightUsed + height > AVAILABLE_HEIGHT) {
                        pushPage();
                    }
                    
                    currentPageLines.push(vLine);
                    currentHeightUsed += height;
                }
            }
        }
    }

    if (currentPageLines.length > 0) {
        pages.push(currentPageLines.join('\n'));
    }

    return pages.length > 0 ? pages : [''];
};