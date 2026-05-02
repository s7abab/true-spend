import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from '@/features/shell/App';
import { AuthProvider } from '@/features/auth/components/AuthContext';
import { AuthQuerySync } from '@/features/auth/components/AuthQuerySync';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { queryClient } from '@/shared/lib/queryClient';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <MotionConfig reducedMotion="user">
            <AuthProvider>
              <AuthQuerySync />
              <App />
            </AuthProvider>
          </MotionConfig>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
