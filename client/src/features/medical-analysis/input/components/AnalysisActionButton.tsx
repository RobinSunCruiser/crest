import React from 'react';
import { Button } from '@mantine/core';
import { Play, Square } from 'lucide-react';

interface AnalysisActionButtonProps {
  processing: boolean;
  processingStep: string;
  inputText: string;
  processBatches: boolean;
  addToExisting: boolean;
  pageCount: number;
  onAnalyze: (addToExisting?: boolean) => void;
  onAnalyzeBatch: (processBatches: boolean, addFirstPageToExisting?: boolean) => void;
  onStop?: () => void;
}

export const AnalysisActionButton: React.FC<AnalysisActionButtonProps> = ({
  processing,
  processingStep: _processingStep,
  inputText,
  processBatches,
  addToExisting,
  pageCount,
  onAnalyze,
  onAnalyzeBatch,
  onStop,
}) => {
  const getButtonText = () => {
    if (processing) {
      return 'Stop Analysis';
    }
    
    if (processBatches) {
      return `Process ${pageCount} Pages in Batches`;
    }
    
    if (addToExisting) {
      return 'Add to Existing Analysis';
    }
    
    return 'Analyze Causal Structure';
  };

  const handleClick = () => {
    if (processing) {
      onStop?.();
    } else if (processBatches) {
      onAnalyzeBatch(true, addToExisting);
    } else {
      onAnalyze(addToExisting);
    }
  };

  const getButtonIcon = () => {
    if (processing) {
      return <Square size={16} />;
    }
    return <Play size={16} />;
  };

  const getButtonColor = () => {
    if (processing) {
      return 'red';
    }
    return 'blue';
  };

  return (
    <Button
      onClick={handleClick}
      disabled={!processing && !inputText.trim()}
      leftSection={getButtonIcon()}
      color={getButtonColor()}
      fullWidth
      size="lg"
    >
      {getButtonText()}
    </Button>
  );
};