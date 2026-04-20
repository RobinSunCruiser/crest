import React, { useCallback } from 'react';
import { Box, Checkbox } from '@mantine/core';

interface ProcessingOptionsPanelProps {
  hasExistingResults: boolean;
  hasMultiplePages: boolean;
  pageCount: number;
  addToExisting: boolean;
  onAddToExistingChange: (checked: boolean) => void;
  processBatches: boolean;
  onProcessBatchesChange: (checked: boolean) => void;
  processing: boolean;
}

export const ProcessingOptionsPanel: React.FC<ProcessingOptionsPanelProps> = React.memo(({
  hasExistingResults,
  hasMultiplePages,
  pageCount,
  addToExisting,
  onAddToExistingChange,
  processBatches,
  onProcessBatchesChange,
  processing,
}) => {
  const handleAddToExistingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onAddToExistingChange(e.target.checked);
  }, [onAddToExistingChange]);

  const handleProcessBatchesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onProcessBatchesChange(e.target.checked);
  }, [onProcessBatchesChange]);

  return (
    <Box mb="md">
      {hasExistingResults && (
        <Checkbox
          label="Add to existing analysis"
          description="Merge new findings with previous results using LLM-based entity and relation merging"
          checked={addToExisting}
          onChange={handleAddToExistingChange}
          disabled={processing}
          mb="sm"
        />
      )}
      
      {hasMultiplePages && (
        <Checkbox
          label="Process in batches (recommended for large documents)"
          description={`Process ${pageCount} pages sequentially, building results iteratively`}
          checked={processBatches}
          onChange={handleProcessBatchesChange}
          disabled={processing}
        />
      )}
    </Box>
  );
});