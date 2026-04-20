import React, { useEffect, useState, useCallback } from 'react';
import {
  MantineProvider,
  AppShell,
  Group,
  Image,
  Text,
  Overlay,
  LoadingOverlay,
  Paper,
  Stack,
  Loader,
  Anchor,
  Popover,
  ActionIcon
} from '@mantine/core';
import { HiOutlineInformationCircle } from 'react-icons/hi2';
import { LuServerOff } from 'react-icons/lu';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { Auth } from '@/auth';
import { MedicalCausalAnalyzer } from '@/features/medical-analysis/components';
import { ErrorBoundary, ProtectedRoute } from '@/shared/components';
import { PromptProvider } from '@/features/medical-analysis/prompts';
import { remToPx, showNotification, getBasePath } from '@/shared/utils';
import { socketService } from '@/shared/services';
import { GraphComparisonPage } from '@/features/graph-comparison';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(socketService.isAuthenticated());
  const [isConnected, setIsConnected] = useState(socketService.isConnected());

  // Detect base path for proper routing and asset loading
  const basePath = getBasePath();

  // Subscribe to authentication and connection state changes
  useEffect(() => {
    socketService.onAuthChange(setIsAuthenticated);
    socketService.onConnectionChange((connected, error) => {
      setIsConnected(connected);

      // Show connection notifications
      if (error) {
        showNotification({
          title: 'Connection Error',
          message: error.message || 'Unable to connect to server',
          type: 'error',
          autoClose: 5000
        });
      } else if (connected && !socketService.isAuthenticated()) {
        // Only show connection success if we weren't previously connected
        showNotification({
          title: 'Connected',
          message: 'Successfully connected to server',
          type: 'success',
          autoClose: 3000
        });
      }
    });
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    return await socketService.login(username, password);
  }, []);

  return (
    <MantineProvider>
      <Notifications />
      <AppShell
        header={{ height: 75 }}
        padding="0"
      >
        {/* Server connection loading overlay */}
        <LoadingOverlay
          visible={!isConnected}
          loaderProps={{
            children: (
              <Paper withBorder>
                <Stack align="center" justify="center" gap="md" w={'20rem'} h={'20rem'} p={'lg'} bg="white">
                  <LuServerOff size={remToPx(5)} color="#24292E" />
                  <Text fw={600}>Server not reachable</Text>
                  <Text>Attempting to connect...</Text>
                  <Loader color="blue" />
                </Stack>
              </Paper>
            ),
          }}
        />

        {/* Application header */}
        <BrowserRouter basename={basePath}>
          <AppShell.Header p={'0.5rem'}>
            <Group justify="space-between" h="100%">
              <Group gap={'xs'}>
                <Text ff={'Orbitron'} fz={{ base: 24, sm: 30, md: 35 }} fw={500} px={'xs'}>
                  CREST
                  <Text ff={'Arial'} fw={500} fz={{ base: 12, sm: 14, md: 17 }} span>
                    v0.1.0
                  </Text>
                </Text>
                <Text size="sm" c="dimmed" display={{ base: 'none', md: 'block' }}>
                  Causal Relation Extraction Super Tool
                </Text>
              </Group>

              <Group gap="sm">
                <Group display={{ base: 'none', sm: 'flex' }} gap="xs">
                  <Anchor href="https://kimeko.digital-hub.sh/" target="_blank">
                    <Image h={{ base: 40, sm: 45, md: 58 }} src={basePath + "kimeko_logo.png"} alt="KIMEKO Logo" w="auto" />
                  </Anchor>
                  <Anchor href="https://www.uni-rostock.de/" target="_blank">
                    <Image h={{ base: 40, sm: 45, md: 58 }} src={basePath + "uni_logo.jpg"} alt="Uni Logo" w="auto" />
                  </Anchor>
                  <Anchor href="https://vac.uni-rostock.de/" target="_blank">
                    <Image h={{ base: 40, sm: 45, md: 58 }} src={basePath + "vac_logo.png"} alt="VAC Logo" w="auto" />
                  </Anchor>

                  <Popover width={200} position="bottom" withArrow shadow="xl">
                    <Popover.Target>
                      <ActionIcon size="lg" variant="transparent" mx={{ base: 5, sm: 10, md: 20 }}>
                        <HiOutlineInformationCircle size={remToPx(2)} />
                      </ActionIcon>
                    </Popover.Target>
                    <Popover.Dropdown w={{ base: 300, sm: 400, md: 500 }}>
                      <Text size="sm" lh={1.5} ta={'justify'}>
                        This project was developed as part of the KI-Med Collaboration Platform (KiMeKo) project for the extraction of causal models from medical texts. The tool was
                        created by Dr.-Ing. Robin Nicolay, Dr. rer. nat. Sebastian Bader and Felix Gratzkowski at the University of Rostock. The project is funded by the BMBF (funding code 01IS24056D) and aims to accelerate the development of AI-based
                        medical products.
                      </Text>
                    </Popover.Dropdown>
                  </Popover>
                </Group>
              </Group>

              {/* Mobile info button */}
              <Group display={{ base: 'flex', sm: 'none' }}>
                <Popover width={200} position="bottom" withArrow shadow="xl">
                  <Popover.Target>
                    <ActionIcon size="lg" variant="transparent" mx={5}>
                      <HiOutlineInformationCircle size={remToPx(2)} />
                    </ActionIcon>
                  </Popover.Target>
                  <Popover.Dropdown w={300}>
                    <Text size="sm" lh={1.5} ta={'justify'}>
                      This project was developed as part of the KI-Med Collaboration Platform (KiMeKo) project for the comparative analysis of AI models.
                    </Text>
                  </Popover.Dropdown>
                </Popover>
              </Group>
            </Group>
          </AppShell.Header>

          {/* Main content area */}
          <AppShell.Main>
            <ErrorBoundary>
              <Routes>
                <Route
                  path="/"
                  element={
                    <PromptProvider>
                      <MedicalCausalAnalyzer />
                    </PromptProvider>
                  }
                />
                <Route
                  path="/graph-comparison"
                  element={
                    <ProtectedRoute>
                      <GraphComparisonPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </ErrorBoundary>
          </AppShell.Main>
        </BrowserRouter>

        {/* Authentication overlay */}
        {!isAuthenticated && (
          <Overlay blur={5}>
            <Auth onLogin={handleLogin} />
          </Overlay>
        )}
      </AppShell>
    </MantineProvider>
  );
};

export default App;