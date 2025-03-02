// app/(tabs)/(scan)/crop.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
// Använd vår wrapper istället för direktimport
import ImageCropPicker, { Image as CroppedImage } from '@/lib/imageCropPickerWrapper';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { captureException, addBreadcrumb } from '@/lib/sentry';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

interface CropError {
  code?: string;
  message?: string;
}

export default function CropScreen() {
  const { photoPath } = useLocalSearchParams<{ photoPath: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Kontrollera om vi kör på web eller i Expo Go
  const isWebEnvironment = Platform.OS === 'web';

  const handleCrop = async () => {
    // Om vi är i webbmiljö, visa fel och gå tillbaka
    if (isWebEnvironment) {
      setError('Bildbeskärning är inte tillgänglig i webbläsaren.');
      return;
    }
    
    setLoading(true);
    try {
      addBreadcrumb('Starting image crop', 'crop', { photoPath });
      
      const croppedImage: CroppedImage = await ImageCropPicker.openCropper({
        path: `file://${photoPath}`,
        // Grundläggande dimensioner
        width: 2000,
        height: 2000,
        // Kvalitetsinställningar
        compressImageQuality: 1,
        compressImageMaxWidth: 2000,
        compressImageMaxHeight: 2000,
        // UI inställningar
        cropperToolbarTitle: 'Markera ingredienslistan',
        cropperToolbarColor: '#1a1d20',
        cropperStatusBarColor: '#1a1d20',
        cropperToolbarWidgetColor: '#ffd33d',
        cropperActiveWidgetColor: '#ffd33d',
        // Beskärningsinställningar
        freeStyleCropEnabled: true,
        showCropGuidelines: true,
        showCropFrame: true,
        enableRotationGesture: false,
        hideBottomControls: true,
        aspectRatio: null,
        // Svenska texter
        cropperChooseText: 'Klar',
        cropperCancelText: 'Avbryt',
      });
  
      addBreadcrumb('Image cropped successfully', 'crop', { 
        width: croppedImage.width,
        height: croppedImage.height,
        path: croppedImage.path
      });
  
      // Skicka med orientering och dimensioner till result
      router.push({
        pathname: './result',
        params: { 
          photoPath: croppedImage.path,
          width: croppedImage.width.toString(),
          height: croppedImage.height.toString(),
          isLandscape: (croppedImage.width > croppedImage.height).toString(),
          isCroppedImage: 'true'  // Redan en sträng
        }
      });
    } catch (error) {
      const cropError = error as CropError;
      
      // Spåra endast riktiga fel, inte användare som avbryter
      if (cropError?.message !== 'User cancelled image selection') {
        console.error('Crop error:', cropError);
        captureException(cropError instanceof Error ? cropError : new Error(String(cropError)));
        setError('Kunde inte beskära bilden. Försök igen.');
      }
      
      router.back();
    } finally {
      setLoading(false);
    }
  };
  

  const handleBack = () => {
    router.back();
  };

  // Visa ett informationsmeddelande i webbmiljön
  if (isWebEnvironment) {
    return (
      <StyledView className="flex-1 bg-background-main justify-center items-center p-4">
        <Ionicons name="crop-outline" size={48} color="#ffffff" />
        <StyledText className="text-text-primary font-sans-bold text-xl text-center mt-4 mb-2">
          Beskärning ej tillgänglig
        </StyledText>
        <StyledText className="text-text-secondary font-sans text-center mb-6">
          Bildbeskärningsfunktionen är bara tillgänglig på fysiska enheter och i EAS builds, inte i webbläsaren eller Expo Go.
        </StyledText>
        <StyledPressable 
          onPress={handleBack}
          className="bg-primary px-6 py-3 rounded-lg"
        >
          <StyledText className="text-text-inverse font-sans-medium">
            Gå tillbaka
          </StyledText>
        </StyledPressable>
      </StyledView>
    );
  }

  // Starta beskärning direkt när komponenten laddas om vi inte är på web
  React.useEffect(() => {
    if (!isWebEnvironment) {
      handleCrop();
    }
  }, []);

  if (error) {
    return (
      <StyledView className="flex-1 bg-background-main justify-center items-center p-4">
        <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
        <StyledText className="text-text-primary font-sans text-center mt-4">
          {error}
        </StyledText>
        <StyledPressable 
          onPress={handleBack}
          className="mt-6 bg-primary px-6 py-3 rounded-lg"
        >
          <StyledText className="text-text-inverse font-sans-medium">
            Försök igen
          </StyledText>
        </StyledPressable>
      </StyledView>
    );
  }

  return (
    <StyledView className="flex-1 bg-background-main justify-center items-center p-4">
      {loading ? (
        <>
          <ActivityIndicator size="large" color="#ffd33d" />
          <StyledText className="text-text-primary font-sans text-lg mt-4">
            Förbereder beskärning...
          </StyledText>
        </>
      ) : (
        <StyledView className="items-center">
          <Ionicons name="crop-outline" size={48} color="#ffffff" />
          <StyledText className="text-text-primary font-sans text-lg text-center mt-4">
            Markera ingredienslistan
          </StyledText>
          <StyledText className="text-text-secondary font-sans text-sm text-center mt-2">
            Dra i hörnen och zooma för att justera bilden
          </StyledText>
          <StyledText className="text-text-secondary font-sans text-sm text-center mt-1">
            Fungerar även för liggande ingredienslistor
          </StyledText>
        </StyledView>
      )}
    </StyledView>
  );
}