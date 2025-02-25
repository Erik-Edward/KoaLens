import { FC, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { CameraGuide } from '@/components/CameraGuide';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

const ScanScreen: FC = () => {
  const [showGuide, setShowGuide] = useState(false);

  const handleScanPress = () => {
    router.push('./camera');
  };

  return (
    <StyledView className="flex-1 bg-background-main">
      {showGuide ? (
        <CameraGuide onClose={() => setShowGuide(false)} isTransparent={false} />
      ) : (
        <StyledView 
          className="flex-1 justify-center items-center px-4"
          accessibilityLabel="Skanna produkt skärm"
        >
          {/* Main Content */}
          <StyledView className="items-center space-y-8">
            <StyledPressable 
              onPress={handleScanPress}
              className="items-center active:scale-95 transition-transform"
              style={({ pressed }) => ({
                opacity: pressed ? 0.9 : 1,
              })}
              accessibilityLabel="Öppna kamera för att skanna ingredienslista"
              accessibilityRole="button"
            >
              <StyledView className="w-36 h-36 bg-primary rounded-full justify-center items-center shadow-2xl">
                <StyledView className="w-32 h-32 rounded-full justify-center items-center bg-primary shadow-inner">
                  <Ionicons 
                    name="camera-outline" 
                    size={56}
                    color="#ffffff"
                  />
                </StyledView>
              </StyledView>
            </StyledPressable>

            {/* Instruktionsruta */}
            <StyledView className="bg-background-light/60 backdrop-blur-sm rounded-xl px-8 py-5 max-w-[280px] shadow-lg">
              <StyledText 
                className="text-text-primary font-sans text-base text-center leading-relaxed"
                accessibilityRole="text"
              >
                Tryck för att skanna en ingredienslista
              </StyledText>
            </StyledView>
          </StyledView>

          {/* Bottom Section */}
          <StyledView className="absolute bottom-12 w-full max-w-sm">
            {/* Instruction text */}
            <StyledView className="bg-background-light/30 rounded-lg mx-4 p-4 mb-4">
              <StyledText 
                className="text-text-secondary/80 font-sans text-sm text-center leading-relaxed"
                accessibilityRole="text"
              >
                Placera ingredienslistan inom kameraramen och håll kameran stilla för bästa resultat
              </StyledText>
            </StyledView>
            
            {/* Guide button */}
            <StyledPressable 
              onPress={() => setShowGuide(true)}
              className="flex-row justify-center items-center mx-4 py-3 bg-background-light/40 rounded-lg active:opacity-70"
              accessibilityLabel="Visa guide för skanning"
              accessibilityRole="button"
            >
              <Ionicons 
                name="help-circle-outline" 
                size={20} 
                color="#ffd33d"
              />
              <StyledText className="text-primary font-sans-medium text-sm ml-2">
                Visa guide för skanning
              </StyledText>
            </StyledPressable>
          </StyledView>
        </StyledView>
      )}
    </StyledView>
  );
};

export default ScanScreen;