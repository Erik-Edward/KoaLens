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
      {/* Använd padding-top för att flytta ner innehållet från toppen */}
      <StyledView className="pt-16 flex-1">
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

        {/* Illustration med flex-1 för att ta upp resterande utrymme */}
        <StyledView className="flex-1 justify-center">
          <ScanGuideIllustration />
        </StyledView>
      </StyledView>
    </StyledView>
  );
};

export default function ScanGuideStep() {
  const content = {
    title: "Skanna ingredienslistan",
    description: "Ta ett foto och justera bilden så att ingredienslistan syns tydligt. KoaLens analyserar sedan innehållet.",
  };

  return <ScanGuideContent {...content} />;
}