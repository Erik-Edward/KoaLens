// app/(tabs)/(scan)/crop.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
// Använd vår wrapper istället för direktimport
import ImageCropPicker, { Image as CroppedImage } from '@/lib/imageCropPickerWrapper';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { captureException, addBreadcrumb } from '@/lib/sentry';
import { AnalysisService } from '@/services/analysisService';
import { logEvent } from '@/lib/analytics';

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
  
      // Extrahera ingredienser från bilden
      setLoading(true);
      
      // Logga att vi startar bildanalys
      logEvent('image_analysis_started', {
        imageWidth: croppedImage.width,
        imageHeight: croppedImage.height,
        isLandscape: croppedImage.width > croppedImage.height
      });
      
      try {
        addBreadcrumb('Starting image analysis', 'analysis', { path: croppedImage.path });
        
        // Använd analystjänsten för att extrahera ingredienser
        const analysisService = new AnalysisService();
        const ingredients = await analysisService.extractIngredientsFromImage(croppedImage.path);
        
        addBreadcrumb('Image analysis completed', 'analysis', { 
          ingredientsCount: ingredients.length 
        });
        
        // Logga att bildanalys lyckades
        logEvent('image_analysis_completed', {
          ingredientsCount: ingredients.length
        });
        
        // Skicka med både bilden och ingredienserna till result
        console.log('Navigating to result screen with extracted ingredients:', ingredients.length);
        try {
          await new Promise(resolve => setTimeout(resolve, 300)); // Kort väntetid för att säkerställa navigering
          console.log('Försöker navigera till resultatskärmen med params:', {
            pathname: '/(tabs)/(scan)/result',
            photoPath: croppedImage.path,
            ingredients: `${ingredients.length} st`
          });
          
          router.replace({
            pathname: '/(tabs)/(scan)/result',
            params: { 
              photoPath: croppedImage.path,
              image: croppedImage.path,
              ingredients: JSON.stringify(ingredients),
              width: croppedImage.width.toString(),
              height: croppedImage.height.toString(),
              isLandscape: (croppedImage.width > croppedImage.height).toString(),
              isCroppedImage: 'true'  // Already a string
            }
          });
          console.log('Navigation till resultatskärmen slutförd');
        } catch (navError) {
          console.error('Navigation error:', navError);
          // Fallback direkt till resultatskärmen om router.replaceAll misslyckas
          try {
            router.navigate('/(tabs)/(scan)/result');
          } catch (fallbackError) {
            console.error('Even fallback navigation failed:', fallbackError);
          }
        }
      } catch (analysisError) {
        console.error('Analysis error:', analysisError);
        captureException(analysisError instanceof Error ? analysisError : new Error(String(analysisError)));
        
        // Logga att bildanalys misslyckades
        logEvent('image_analysis_failed', {
          errorMessage: analysisError instanceof Error ? analysisError.message : String(analysisError)
        });
        
        // Anpassa felmeddelandet baserat på typen av fel
        let errorMessage = "Vi kunde inte identifiera några ingredienser i bilden. Försök ta en tydligare bild av ingredienslistan.";
        
        if (analysisError instanceof Error) {
          const errorMsg = analysisError.message.toLowerCase();
          
          if (errorMsg.includes('timeout') || 
              errorMsg.includes('nå servern') || 
              errorMsg.includes('internet') ||
              errorMsg.includes('kunde inte förbereda begäran')) {
            errorMessage = "Kunde inte ansluta till servern. Kontrollera din internetanslutning och försök igen.";
          } else if (errorMsg.includes('serverfel') || 
                     errorMsg.includes('oväntat svar') ||
                     errorMsg.includes('api svarade med ett fel')) {
            errorMessage = "Det uppstod ett problem med analysen på servern. Vänta en stund och försök igen.";
          } else if (errorMsg.includes('ogilt') || 
                     errorMsg.includes('kunde inte läsa') ||
                     errorMsg.includes('tom base64')) {
            errorMessage = "Det uppstod ett problem med bilden. Försök ta en ny bild av ingredienslistan.";
          } else if (errorMsg.includes('inga ingredienser')) {
            errorMessage = "Vi hittade inga ingredienser i bilden. Försök ta en tydligare bild där hela ingredienslistan syns.";
          }
          
          console.log('Detaljerat felmeddelande:', analysisError.message);
          console.log('Visar användarvänligt felmeddelande:', errorMessage);
        }
        
        Alert.alert(
          "Kunde inte tolka bilden",
          errorMessage,
          [{ text: "OK" }]
        );
        
        router.back();
      }
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