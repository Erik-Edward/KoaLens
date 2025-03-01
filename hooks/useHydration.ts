// hooks/useHydration.ts
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@stores/useStore';

export const useHydration = () => {
  const [hydrated, setHydrated] = useState(false);

  const checkHydration = useCallback(() => {
    const isHydrated = useStore.persist.hasHydrated();
    if (isHydrated !== hydrated) {
      setHydrated(isHydrated);
    }
  }, [hydrated]);

  useEffect(() => {
    checkHydration();
    
    const unsubFinishHydration = useStore.persist.onFinishHydration(() => {
      checkHydration();
    });

    return () => {
      unsubFinishHydration();
    };
  }, [checkHydration]);

  return hydrated;
};