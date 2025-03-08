// hooks/useUsageLimit.ts
import { useCallback, useEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/providers/AuthProvider';

export function useUsageLimit() {
  const { user } = useAuth();
  const usageLimit = useStore(state => state.usageLimit);
  const fetchUsageLimit = useStore(state => state.fetchUsageLimit);
  
  const refreshUsageLimit = useCallback(async () => {
    if (user?.id) {
      await fetchUsageLimit(user.id);
    }
  }, [user, fetchUsageLimit]);
  
  // Kontrollera om vi behöver uppdatera användningsdata (äldre än 1 timme)
  const shouldRefresh = usageLimit.lastChecked
    ? new Date().getTime() - new Date(usageLimit.lastChecked).getTime() > 60 * 60 * 1000
    : true;
    
  useEffect(() => {
    if (user?.id && shouldRefresh) {
      refreshUsageLimit();
    }
  }, [user, shouldRefresh, refreshUsageLimit]);
  
  // Beräkna återstående analyser
  const remaining = usageLimit.isPremium 
    ? Infinity 
    : Math.max(0, usageLimit.analysesLimit - usageLimit.analysesUsed);
  
  // Kontrollera om användaren har nått sin gräns
  const hasReachedLimit = !usageLimit.isPremium && remaining <= 0;
  
  return {
    ...usageLimit,
    remaining,
    hasReachedLimit,
    refreshUsageLimit
  };
}