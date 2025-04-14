// components/onboarding/ScanGuideContent.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';
import ScanGuideIllustration from './ScanGuideIllustration';

const StyledView = styled(View);
const StyledText = styled(Text);

interface GuideStepProps {
  title: string;
  description: string;
}

export const ScanGuideContent: React.FC<GuideStepProps> = ({ title, description }) => {
  return (
    <StyledView className="flex-1 px-6">
      {/* Reduced top padding from pt-16 to pt-8 */}
      <StyledView className="pt-8 flex-1">
        {/* Title & Description */}
        <StyledView className="mb-8">
          <StyledText
            className="text-text-primary font-sans-bold text-3xl text-center mb-4"
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
          >
            {title}
          </StyledText>
          <StyledText className="text-text-secondary font-sans text-lg text-center">
            {description}
          </StyledText>
        </StyledView>

        {/* Illustration container */}
        <StyledView className="justify-center items-center">
          <ScanGuideIllustration />
        </StyledView>
      </StyledView>
    </StyledView>
  );
};

export default function ScanGuideStep() {
  const content = {
    title: "Analysera ingredienslistan",
    description: "Rikta telefonen mot ingredienslistan (stående eller liggande) och panorera vid behov för att fånga alla ingredienser. Efter några sekunder får du resultatet av analysen.",
  };

  return <ScanGuideContent {...content} />;
}