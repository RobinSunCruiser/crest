import React, { useState, useCallback } from 'react';
import { Paper, TextInput, PasswordInput, Button, Stack, Title, Text, Alert } from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import { showNotification } from '@/shared/utils';
import styles from '@/shared/styles/common.module.css';

interface AuthProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; token?: string; error?: any }>;
}

export const Auth: React.FC<AuthProps> = React.memo(({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = useCallback(async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await onLogin(username, password);
      
      if (response.success) {
        showNotification({
          title: 'Login Successful',
          message: 'Welcome to CREST Medical Causal Analysis',
          type: 'success',
          autoClose: 4000
        });
        // Authentication state is now handled by socketService internally
      } else {
        setError(response.error?.message || 'Login failed');
      }
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [username, password, onLogin]);

  return (
    <main className={styles.centerLayout}>
      <Paper shadow="xl" p="xl" className={styles.fullWidthAuthPaper}>
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
          <Stack gap="md">
            <header className={styles.authContainer}>
              <Title order={2} mb="sm">
                CREST Login
              </Title>
              <Text size="sm" c="dimmed">
                Medical Causal Analysis Platform
              </Text>
            </header>

            {error && (
              <Alert icon={<AlertCircle size={16} />} color="red" role="alert">
                {error}
              </Alert>
            )}

            <TextInput
              label="Username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
              autoComplete="username"
            />

            <PasswordInput
              label="Password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
            >
              Login
            </Button>

            <Text size="xs" c="dimmed" className={styles.authContainer}>
              Default credentials: user / user
            </Text>
          </Stack>
        </form>
      </Paper>
    </main>
  );
});