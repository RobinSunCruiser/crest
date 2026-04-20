import React, { useMemo, useCallback } from 'react';
import { Card, Title, Text, Textarea, Stack } from '@mantine/core';
import { FileText } from 'lucide-react';
import styles from '@/shared/styles/common.module.css';
import { PromptEditor } from '@/features/medical-analysis/prompts/components';
import { FileUploadSection } from './FileUploadSection';
import { ProcessingOptionsPanel } from '@/features/medical-analysis/llm-config/components';
import { AnalysisActionButton } from './AnalysisActionButton';
import { ProcessingStatusDisplay } from '@/features/medical-analysis/results/components';
import { WatchConversationButton } from '@/features/medical-analysis/conversation/components';
import { estimateTokenCount } from '@/shared/utils';
import { getPageInfo } from '@/features/medical-analysis/input/utils/textChunking';
import { calculateProgressValue } from '@/features/medical-analysis/analysis/utils/progressUtils';

interface TextInputProps {
  inputText: string;
  onTextChange: (text: string) => void;
  onFileUpload: (file: File | null) => void;
  onAnalyze: (addToExisting?: boolean) => void;
  onAnalyzeBatch: (processBatches: boolean, addFirstPageToExisting?: boolean) => void;
  onStop?: () => void;
  processing: boolean;
  processingStep: string;
  error: string;
  batchProgress: { current: number; total: number };
  uploadedFile: File | null;
  hasExistingResults?: boolean;
}

export const TextInput: React.FC<TextInputProps> = React.memo(({
  inputText,
  onTextChange,
  onFileUpload,
  onAnalyze,
  onAnalyzeBatch,
  onStop,
  processing,
  processingStep,
  error,
  batchProgress,
  uploadedFile,
  hasExistingResults = false
}) => {
  const [addToExisting, setAddToExisting] = React.useState(false);
  const [processBatches, setProcessBatches] = React.useState(false);

  // Memoized calculations for performance
  const pageInfo = useMemo(() => getPageInfo(inputText), [inputText]);
  const tokenCount = useMemo(() => estimateTokenCount(inputText), [inputText]);

  // Reset processBatches to false when document has only one page
  React.useEffect(() => {
    if (!pageInfo.hasMultiplePages && processBatches) {
      setProcessBatches(false);
    }
  }, [pageInfo.hasMultiplePages, processBatches]);

  const handleFileChange = useCallback((file: File | null) => {
    onFileUpload(file);
  }, [onFileUpload]);

  const handleTextChange = useCallback((value: string) => {
    onTextChange(value);
  }, [onTextChange]);

  return (
    <Stack gap="md">
      <Card withBorder shadow="sm" radius="md" p="lg">
        <Title order={4} mb="sm">
          <FileText size={20} className={styles.iconInline} />
          Text Input & Analysis
        </Title>
        
        <Text size="sm" c="dimmed" mb="lg">
          Upload a PDF document or enter text directly for causal analysis
        </Text>
        
        <FileUploadSection
          uploadedFile={uploadedFile}
          onFileChange={handleFileChange}
          processing={processing}
        />

        <Textarea
          value={inputText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Enter medical text for causal analysis... Or upload a PDF document above."
          minRows={8}
          maxRows={16}
          autosize
          disabled={processing}
          mb="md"
        />

        <Text size="xs" c="dimmed" mb="md">
          {pageInfo.hasMultiplePages && (
            <>Multi-page document: {pageInfo.pageCount} pages | </>
          )}
          Estimated tokens: ~{tokenCount.toLocaleString()}
        </Text>

        <ProcessingOptionsPanel
          hasExistingResults={hasExistingResults}
          hasMultiplePages={pageInfo.hasMultiplePages}
          pageCount={pageInfo.pageCount}
          addToExisting={addToExisting}
          onAddToExistingChange={setAddToExisting}
          processBatches={processBatches}
          onProcessBatchesChange={setProcessBatches}
          processing={processing}
        />

        <AnalysisActionButton
          processing={processing}
          processingStep={processingStep}
          inputText={inputText}
          processBatches={processBatches}
          addToExisting={addToExisting}
          pageCount={pageInfo.pageCount}
          onAnalyze={onAnalyze}
          onAnalyzeBatch={onAnalyzeBatch}
          onStop={onStop}
        />

        <ProcessingStatusDisplay
          processing={processing}
          processingStep={processingStep}
          batchProgress={batchProgress}
          error={error}
          getProgressValue={calculateProgressValue}
        />
      </Card>

      <WatchConversationButton />

      <PromptEditor disabled={processing} />
    </Stack>
  );
});