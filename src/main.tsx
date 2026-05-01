import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import './index.css';
import App from '@/features/shell/App';
import { AuthProvider } from '@/features/auth/components/AuthContext';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <App />
        </AuthProvider>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
);
