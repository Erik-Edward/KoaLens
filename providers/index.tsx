import React, { useEffect } from 'react';
import { ApiStatusProvider } from '@/contexts/ApiStatusContext';
import { AlertProvider, setGlobalShowAlert, useAlert } from '@/utils/alertUtils';

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <ApiStatusProvider>
      <AlertProvider>
        {children}
      </AlertProvider>
    </ApiStatusProvider>
  );
} 