const PAGE_PATTERN = /Page \d+:\n/g;
const PDF_HEADER_PATTERN = /\[PDF Content Extracted from:/;

export interface PageInfo {
  hasMultiplePages: boolean;
  pageCount: number;
  chunks: string[];
}

export const getPageInfo = (text: string): PageInfo => {
  const matches = text.match(PAGE_PATTERN);
  const hasMultiple = matches && matches.length > 1;
  
  if (!hasMultiple) {
    return { hasMultiplePages: false, pageCount: 1, chunks: [text] };
  }
  
  // Split by page pattern but preserve page markers in each chunk
  const chunks: string[] = [];
  const parts = text.split(PAGE_PATTERN);
  const pageMarkers = matches || [];
  
  // Remove PDF header if it exists
  let startIndex = 0;
  if (parts[0]?.match(PDF_HEADER_PATTERN)) {
    startIndex = 1;
  }
  
  // Reconstruct chunks with page markers
  for (let i = startIndex; i < parts.length; i++) {
    if (parts[i].trim()) {
      const pageMarker = pageMarkers[i - startIndex] || '';
      chunks.push(pageMarker + parts[i]);
    }
  }
  
  return { hasMultiplePages: true, pageCount: chunks.length, chunks };
};