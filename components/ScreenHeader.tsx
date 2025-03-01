// components/ScreenHeader.tsx
import { FC } from 'react';
import { View, Text } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

interface ScreenHeaderProps {
  title: string;
}

export const ScreenHeader: FC<ScreenHeaderProps> = ({ title }) => {
  return (
    <StyledView className="bg-background-main px-4 pt-12 pb-6">
      <StyledText className="text-text-primary font-sans-bold text-2xl">
        {title}
      </StyledText>
    </StyledView>
  );
};