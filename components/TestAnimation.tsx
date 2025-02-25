// components/TestAnimation.tsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { styled } from 'nativewind';

const StyledView = styled(View);
const AnimatedView = styled(Animated.View);

export default function TestAnimation() {
  const offset = useSharedValue(0);

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  useEffect(() => {
    console.log('Starting test animation');
    offset.value = withRepeat(
      withTiming(100, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  return (
    <StyledView className="absolute inset-0 items-center justify-center">
      <AnimatedView
        className="w-20 h-20 bg-primary rounded-xl"
        style={animatedStyles}
      />
    </StyledView>
  );
}