import React from 'react';
import { Group, FileInput, Text } from '@mantine/core';
import { Upload } from 'lucide-react';
import styles from '@/shared/styles/common.module.css';

interface FileUploadSectionProps {
  uploadedFile: File | null;
  onFileChange: (file: File | null) => void;
  processing: boolean;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = React.memo(({
  uploadedFile,
  onFileChange,
  processing,
}) => {
  return (
    <Group mb="lg">
      <FileInput
        accept=".pdf"
        onChange={onFileChange}
        placeholder="Upload PDF document"
        leftSection={<Upload size={16} />}
        disabled={processing}
className={styles.flex1}
      />
      {uploadedFile && (
        <Text size="sm" c="dimmed">
          {uploadedFile.name}
        </Text>
      )}
    </Group>
  );
});