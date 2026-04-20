import React, { Component, ReactNode } from 'react';
import { Alert, Button, Stack, Text } from '@mantine/core';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import styles from '@/shared/styles/common.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert 
          color="red" 
          title="Something went wrong" 
          icon={<AlertTriangle size={20} />}
          variant="light"
          p="lg"
        >
          <Stack gap="md">
            <Text size="sm">
              An unexpected error occurred while rendering this component.
            </Text>
            
            {this.state.error && (
              <Text size="xs" c="dimmed" className={styles.monospace}>
                {this.state.error.message}
              </Text>
            )}
            
            <Button
              leftSection={<RefreshCw size={16} />}
              onClick={this.handleRetry}
              size="sm"
              variant="outline"
            >
              Try Again
            </Button>
          </Stack>
        </Alert>
      );
    }

    return this.props.children;
  }
}