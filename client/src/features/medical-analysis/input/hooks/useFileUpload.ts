import { useState, useCallback } from 'react';
import { extractTextFromPDF } from '@/features/medical-analysis/input/utils/pdfProcessor';
import { useNotifications, useErrorHandling } from '@/shared/hooks';

/**
 * Custom hook for file upload handling
 */
export const useFileUpload = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const { showSuccess } = useNotifications();
  const { handleAsyncError } = useErrorHandling();

  const handleFileUpload = useCallback(async (
    file: File | null,
    onTextExtracted: (text: string) => void,
    onError: (error: string) => void
  ) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      const errorMessage = 'Please upload a PDF file';
      onError(errorMessage);
      return;
    }

    const result = await handleAsyncError(async () => {
      setUploadedFile(file);
      const extractedText = await extractTextFromPDF(file);
      onTextExtracted(extractedText);
      onError(''); // Clear any previous errors
      return extractedText;
    }, 'PDF Processing', {
      notificationTitle: 'PDF Processing Failed'
    });

    if (result) {
      showSuccess('Text extracted successfully from PDF', 'PDF Processed');
    }
  }, [showSuccess, handleAsyncError]);

  const clearFile = useCallback(() => {
    setUploadedFile(null);
  }, []);

  return {
    uploadedFile,
    handleFileUpload,
    clearFile,
  };
};