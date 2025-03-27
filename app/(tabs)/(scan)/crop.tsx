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
  const [showOptions, setShowOptions] = useState(false);
  
  // Kontrollera om vi kör på web eller i Expo Go
  const isWebEnvironment = Platform.OS === 'web';

  // Hantera direkt analys utan beskärning
  const handleDirectAnalysis = async () => {
    if (!photoPath) {
      setError('Ingen bild tillgänglig för analys');
      return;
    }
    
    setLoading(true);
    try {
      addBreadcrumb('Starting direct image analysis', 'analysis', { photoPath });
      logEvent('direct_image_analysis_started', { skipCrop: true });
      
      // Använd den fullständiga bilden för analys
      const fullImagePath = `file://${photoPath}`;
      const analysisService = new AnalysisService();
      
      // Analysera bilden direkt
      const analysisResult = await analysisService.analyzeImageDirectly(fullImagePath);
      
      addBreadcrumb('Direct image analysis completed', 'analysis', { 
        isVegan: analysisResult.isVegan,
        confidence: analysisResult.confidence,
        ingredientsCount: analysisResult.ingredientList?.length || 0
      });
      
      logEvent('direct_image_analysis_completed', {
        isVegan: analysisResult.isVegan,
        confidence: analysisResult.confidence,
        skipCrop: true
      });
      
      // Navigera till resultatskärmen med analysen
      console.log('Navigating to result screen with direct analysis result');
      
      router.replace({
        pathname: '/(tabs)/(scan)/result',
        params: { 
          photoPath: fullImagePath,
          analysisResult: JSON.stringify(analysisResult),
          isDirectAnalysis: 'true'
        }
      });
    } catch (analysisError) {
      console.error('Direct analysis error:', analysisError);
      captureException(analysisError instanceof Error ? analysisError : new Error(String(analysisError)));
      
      logEvent('direct_image_analysis_failed', {
        errorMessage: analysisError instanceof Error ? analysisError.message : String(analysisError),
        skipCrop: true
      });
      
      // Visa informativt felmeddelande
      let errorMessage = "Vi kunde inte analysera bilden. Försök ta en tydligare bild av produkten.";
      
      if (analysisError instanceof Error) {
        const errorMsg = analysisError.message.toLowerCase();
        
        if (errorMsg.includes('timeout') || errorMsg.includes('nätverks')) {
          errorMessage = "Kunde inte ansluta till servern. Kontrollera din internetanslutning och försök igen.";
        }
      }
      
      Alert.alert(
        "Analys misslyckades",
        errorMessage,
        [{ text: "OK" }]
      );
      
      router.back();
    } finally {
      setLoading(false);
    }
  };

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
        compressImageQuality: 0.9, // Sänkt från 1.0 för bättre prestanda med Gemini
        compressImageMaxWidth: 1200, // Anpassat för Gemini 2.5 Pro
        compressImageMaxHeight: 1200, // Anpassat för Gemini 2.5 Pro
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
        isLandscape: croppedImage.width > croppedImage.height,
        skipCrop: false
      });
      
      try {
        addBreadcrumb('Starting image analysis', 'analysis', { path: croppedImage.path });
        
        // Använd AnalysisService för direkt bildanalys med Gemini
        const analysisService = new AnalysisService();
        
        // Använd analyzeImageDirectly istället för att extrahera ingredienser först
        const analysisResult = await analysisService.analyzeImageDirectly(croppedImage.path);
        
        addBreadcrumb('Image analysis completed', 'analysis', { 
          isVegan: analysisResult.isVegan,
          confidence: analysisResult.confidence,
          ingredientsCount: analysisResult.watchedIngredients?.length || 0
        });
        
        // Logga att bildanalys lyckades
        logEvent('image_analysis_completed', {
          isVegan: analysisResult.isVegan,
          confidence: analysisResult.confidence,
          skipCrop: false
        });
        
        // Navigera till resultatskärmen med analysen
        console.log('Navigating to result screen with analysis result');
        
        // Använd router.replace för mer konsekvent navigation
        router.replace({
          pathname: '/(tabs)/(scan)/result',
          params: { 
            photoPath: croppedImage.path,
            analysisResult: JSON.stringify(analysisResult),
            isDirectAnalysis: 'true'
          }
        });
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
      } else {
        // Användaren avbröt beskärningen, visa alternativen
        setShowOptions(true);
        setLoading(false);
        return;
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
          onPress={handleDirectAnalysis}
          className="bg-primary px-6 py-3 rounded-lg mb-4"
        >
          <StyledText className="text-text-inverse font-sans-medium">
            Analysera hela bilden
          </StyledText>
        </StyledPressable>
        <StyledPressable 
          onPress={handleBack}
          className="bg-gray-600 px-6 py-3 rounded-lg"
        >
          <StyledText className="text-text-inverse font-sans-medium">
            Gå tillbaka
          </StyledText>
        </StyledPressable>
      </StyledView>
    );
  }

  // Visa alternativ om användaren avbröt beskärningen
  if (showOptions) {
    return (
      <StyledView className="flex-1 bg-background-main justify-center items-center p-4">
        <Ionicons name="help-circle-outline" size={48} color="#ffd33d" />
        <StyledText className="text-text-primary font-sans-bold text-xl text-center mt-4 mb-2">
          Hur vill du fortsätta?
        </StyledText>
        <StyledText className="text-text-secondary font-sans text-center mb-6">
          Du kan välja att beskära bilden för bättre resultat eller analysera hela bilden direkt.
        </StyledText>
        <StyledPressable 
          onPress={handleCrop}
          className="bg-primary px-6 py-3 rounded-lg mb-4 w-64"
        >
          <StyledText className="text-text-inverse font-sans-medium text-center">
            Beskär bilden (rekommenderas)
          </StyledText>
        </StyledPressable>
        <StyledPressable 
          onPress={handleDirectAnalysis}
          className="bg-gray-700 px-6 py-3 rounded-lg mb-4 w-64"
        >
          <StyledText className="text-text-inverse font-sans-medium text-center">
            Analysera hela bilden
          </StyledText>
        </StyledPressable>
        <StyledPressable 
          onPress={handleBack}
          className="px-6 py-3 mb-4"
        >
          <StyledText className="text-text-secondary font-sans-medium text-center">
            Gå tillbaka
          </StyledText>
        </StyledPressable>
      </StyledView>
    );
  }

  // Starta beskärning direkt när komponenten laddas om vi inte är på web
  React.useEffect(() => {
    if (!isWebEnvironment && !showOptions) {
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
          <StyledText className="text-text-primary font-sans text-center mt-4">
            Beskär och analyserar ingredienser...
          </StyledText>
        </>
      ) : (
        <>
          <Ionicons name="crop-outline" size={48} color="#ffd33d" />
          <StyledText className="text-text-primary font-sans-bold text-xl text-center mt-4 mb-2">
            Beskärningsverktyget laddas...
          </StyledText>
          <StyledText className="text-text-secondary font-sans text-center mb-6">
            Om beskärningsverktyget inte öppnas automatiskt, tryck på "Försök igen" nedan.
          </StyledText>
          <StyledView className="flex-row">
            <StyledPressable 
              onPress={handleCrop}
              className="bg-primary px-6 py-3 rounded-lg mr-2"
            >
              <StyledText className="text-text-inverse font-sans-medium">
                Försök igen
              </StyledText>
            </StyledPressable>
            <StyledPressable 
              onPress={handleDirectAnalysis}
              className="bg-gray-700 px-6 py-3 rounded-lg"
            >
              <StyledText className="text-text-inverse font-sans-medium">
                Analysera direkt
              </StyledText>
            </StyledPressable>
          </StyledView>
        </>
      )}
    </StyledView>
  );
}