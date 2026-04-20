import React from 'react';
import { Box, Text, Alert } from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

interface ProcessingStatusDisplayProps {
  processing: boolean;
  processingStep: string;
  batchProgress: { current: number; total: number };
  error: string;
  getProgressValue: (step: string) => number;
}

export const ProcessingStatusDisplay: React.FC<ProcessingStatusDisplayProps> = React.memo(({
  processing,
  processingStep,
  batchProgress,
  error,
  getProgressValue,
}) => {
  return (
    <>
      {processing && processingStep && (
        <Box mt="md">
          {batchProgress.total > 0 && (
            <Box mb="md">
              <ProgressBar
                value={(batchProgress.current / batchProgress.total) * 100}
                color="blue"
                size="xl"
                label="Batch Progress"
                description={`${batchProgress.current} / ${batchProgress.total} pages`}
                striped
                animated
              />
            </Box>
          )}

          <ProgressBar
            value={getProgressValue(processingStep)}
            color="blue"
            size="lg"
            label={processingStep}
            description={`${Math.round(getProgressValue(processingStep))}%`}
            animated
          />
          
          <Text size="xs" c="dimmed" mt="xs" ta="center">
            {batchProgress.total > 0 ? 
              'Processing each page individually - may take several minutes for large documents' :
              'This may take up to 5 minutes depending on text complexity and model response time'
            }
          </Text>
        </Box>
      )}

      {error && (
        <Alert
          icon={<AlertCircle size={16} />}
          color="red"
          title="Analysis Error"
          mt="md"
        >
          {error}
        </Alert>
      )}
    </>
  );
});