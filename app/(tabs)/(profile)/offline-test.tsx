import { View, Text, Pressable, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getPendingAnalyses } from '@/services/claudeVisionService';
import { queryClient, OfflineRequestQueue } from '@/app/providers/OfflinePersistenceProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);

export default function OfflineTest() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [cacheSize, setCacheSize] = useState('0');
  const [storageKeys, setStorageKeys] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
      if (state.isConnected) {
        setTimeout(loadData, 2500);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const pending = await getPendingAnalyses();
      setPendingCount(pending.length);

      const keys = await AsyncStorage.getAllKeys();
      setStorageKeys([...keys]);

      let totalSize = 0;
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += new TextEncoder().encode(value).length;
        }
      }
      setCacheSize((totalSize / 1024).toFixed(2));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const clearCache = async () => {
    try {
      await AsyncStorage.clear();
      queryClient.clear();
      setCacheSize('0');
      setPendingCount(0);
      setStorageKeys([]);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  return (
    <StyledScrollView className="flex-1 bg-background-main">
      <StyledView className="p-4">
        {/* Nätverksstatus */}
        <StyledView className="mb-6 p-4 bg-background-light/50 rounded-lg">
          <StyledText className="text-text-primary font-sans-medium text-lg mb-2">
            Nätverksstatus
          </StyledText>
          <StyledView className="flex-row items-center bg-background-light/30 p-3 rounded-md">
            <StyledView className={`w-3 h-3 rounded-full mr-2 ${
              isOnline ? 'bg-status-success' : 'bg-status-error'
            }`} />
            <StyledText className="text-text-primary font-sans">
              {isOnline ? 'Online' : 'Offline'}
            </StyledText>
          </StyledView>
        </StyledView>

        {/* Cache information */}
        <StyledView className="mb-6 p-4 bg-background-light/50 rounded-lg">
          <StyledText className="text-text-primary font-sans-medium text-lg mb-2">
            Cache Information
          </StyledText>
          <StyledView className="bg-background-light/30 p-3 rounded-md">
            <StyledView className="flex-row justify-between items-center mb-2">
              <StyledText className="text-text-primary font-sans">Cache storlek:</StyledText>
              <StyledText className="text-primary font-sans-medium">{cacheSize} KB</StyledText>
            </StyledView>
            <StyledView className="flex-row justify-between items-center mb-2">
              <StyledText className="text-text-primary font-sans">Väntande analyser:</StyledText>
              <StyledText className="text-primary font-sans-medium">{pendingCount}</StyledText>
            </StyledView>
            <StyledView className="mt-4">
              <StyledText className="text-text-primary font-sans-medium mb-2">
                Lagrade nycklar: {storageKeys.length}
              </StyledText>
              <StyledView className="bg-background-dark/50 p-2 rounded-md">
                {storageKeys.map(key => (
                  <StyledText 
                    key={key} 
                    className="text-text-secondary font-sans text-sm py-1"
                  >
                    • {key}
                  </StyledText>
                ))}
              </StyledView>
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Kontroller */}
        <StyledView className="flex-row justify-between gap-4">
          <StyledPressable
            onPress={clearCache}
            className="flex-1 bg-status-error/90 p-4 rounded-lg active:opacity-70"
          >
            <StyledText className="text-text-primary font-sans-medium text-center">
              Rensa Cache
            </StyledText>
          </StyledPressable>
          
          <StyledPressable
            onPress={loadData}
            className="flex-1 bg-primary/90 p-4 rounded-lg active:opacity-70"
          >
            <StyledText className="text-text-primary font-sans-medium text-center">
              Uppdatera Status
            </StyledText>
          </StyledPressable>
        </StyledView>
      </StyledView>
    </StyledScrollView>
  );
}