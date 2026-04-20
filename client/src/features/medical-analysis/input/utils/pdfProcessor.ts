// PDF text extraction utility
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    if (!window.pdfjsLib) {
      await loadPDFJS();
    }

    if (!window.pdfjsLib || !window.pdfjsLib.getDocument) {
      throw new Error('PDF.js library not properly loaded');
    }

    const arrayBuffer = await file.arrayBuffer();
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('PDF file is empty or corrupted');
    }

    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    if (!pdf || !pdf.numPages) {
      throw new Error('Unable to load PDF document');
    }
    
    let extractedText = `[PDF Content Extracted from: ${file.name}]\n\n`;
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        if (!textContent || !textContent.items) {
          continue;
        }
        
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (pageText) {
          extractedText += `Page ${pageNum}:\n${pageText}\n\n`;
        }
      } catch {
        // Continue with other pages
      }
    }
    
    if (extractedText.length <= 100) {
      throw new Error('No readable text found in PDF - document may be image-based or encrypted');
    }
    
    return extractedText;
  } catch (error: any) {
    // Provide more specific error messages
    let errorMessage = 'Unknown error occurred';
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.name) {
      errorMessage = `PDF.js error: ${error.name}`;
    }
    
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
};

const loadPDFJS = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = './pdf.min.js';
    script.onload = () => {
      try {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
          resolve();
        } else {
          reject(new Error('PDF.js library not available after loading'));
        }
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load PDF.js from local files'));
    };
    document.head.appendChild(script);
  });
};

export const exportData = (data: any[], filename: string, headers: string[]) => {
  const csv = [headers, ...data].map(row => 
    row.map((cell: any) => `"${cell}"`).join(',')
  ).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};