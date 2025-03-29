import React from 'react';
import { ApiStatusProvider } from '@/contexts/ApiStatusContext';

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <ApiStatusProvider>
      {children}
    </ApiStatusProvider>
  );
} 