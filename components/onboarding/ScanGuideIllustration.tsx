// components/onboarding/ScanGuideIllustration.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { styled } from 'nativewind';
import Svg, { 
  Rect, 
  Line,
  Defs,
  LinearGradient,
  Stop,
  G,
  Text
} from 'react-native-svg';

const StyledView = styled(View);

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedG = Animated.createAnimatedComponent(G);

export default function ScanGuideIllustration() {
  const frameOpacity = useRef(new Animated.Value(0.8)).current;
  const scanLineY = useRef(new Animated.Value(60)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animera skanningsramen
    Animated.loop(
      Animated.sequence([
        Animated.timing(frameOpacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(frameOpacity, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Fullständig skanningsanimation med resultat
    const scanningSequence = Animated.sequence([
      Animated.delay(500), // Initial väntan
      // Första skanningen
      Animated.timing(scanLineY, {
        toValue: 160,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(scanLineY, {
        toValue: 60,
        duration: 1000,
        useNativeDriver: false,
      }),
      // Andra skanningen
      Animated.timing(scanLineY, {
        toValue: 160,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(scanLineY, {
        toValue: 60,
        duration: 1000,
        useNativeDriver: false,
      }),
      // Visa resultat
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      })
    ]);

    scanningSequence.start();
  }, []);

  return (
    <StyledView className="w-full aspect-[4/5] items-center justify-center">
      <Svg viewBox="0 0 400 500" className="w-full h-full">
        <Defs>
          <LinearGradient id="phoneEdge" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#3a3f44" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#25292e" stopOpacity="0.8" />
          </LinearGradient>
          
          <LinearGradient id="screenGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#25292e" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#1a1d20" stopOpacity="0.9" />
          </LinearGradient>

          <LinearGradient id="scanLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#ffd33d" stopOpacity="0" />
            <Stop offset="0.4" stopColor="#ffd33d" stopOpacity="1" />
            <Stop offset="0.6" stopColor="#ffd33d" stopOpacity="1" />
            <Stop offset="1" stopColor="#ffd33d" stopOpacity="0" />
          </LinearGradient>

          <LinearGradient id="resultTransition" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1a1d20" stopOpacity="0" />
            <Stop offset="0.2" stopColor="#1a1d20" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#1a1d20" stopOpacity="0.95" />
          </LinearGradient>
        </Defs>

        {/* Phone body */}
        <Rect
          x="60"
          y="40"
          width="280"
          height="420"
          rx="20"
          fill="url(#phoneEdge)"
          stroke="#3a3f44"
          strokeWidth="2"
        />

        {/* Screen */}
        <Rect
          x="70"
          y="50"
          width="260"
          height="400"
          rx="15"
          fill="url(#screenGlow)"
        />

        {/* Camera UI */}
        <G transform="translate(90, 70)">
          {/* Video frame */}
          <AnimatedRect
            x="20"
            y="60"
            width="180"
            height="120"
            rx="8"
            fill="none"
            stroke="#ffd33d"
            strokeWidth="2"
            strokeDasharray="8,8"
            opacity={frameOpacity}
          />

          {/* Scanning line */}
          <AnimatedLine
            x1="20"
            y1={scanLineY}
            x2="200"
            y2={scanLineY}
            stroke="url(#scanLine)"
            strokeWidth="2"
          />

          {/* Example text lines */}
          {[0, 1, 2, 3].map((i) => (
            <Rect
              key={i}
              x="40"
              y={85 + (i * 14)}
              width={Math.random() * 80 + 40}
              height="5"
              rx="2"
              fill="#ffffff"
              opacity="0.3"
            />
          ))}

          {/* Results section */}
          <AnimatedG opacity={resultOpacity}>
            {/* Result text - justerad höjd uppåt */}
            <Text
              x="110"
              y="210"  // Flyttad upp från 220
              fontSize="18"
              fill="#ffffff"
              textAnchor="middle"
              fontFamily="PlusJakartaSans-Medium"
            >
              Produkten är
            </Text>
            <Text
              x="110"
              y="245"  // Flyttad upp från 260
              fontSize="28"
              fill="#4caf50"
              textAnchor="middle"
              fontFamily="PlusJakartaSans-Bold"
            >
              VEGANSK
            </Text>

            {/* Ingredients list - komprimerad spacing */}
            <Text
              x="40"
              y="285"  // Flyttad upp från 300
              fontSize="20"
              fill="#ffffff"
              fontFamily="PlusJakartaSans-Medium"
            >
              Ingredienser:
            </Text>
            <Text
              x="40"
              y="315"  // Flyttad upp och mindre mellanrum
              fontSize="18"
              fill="#cccccc"
              fontFamily="PlusJakartaSans-Regular"
            >
              • Sojaprotein
            </Text>
            <Text
              x="40"
              y="340"  // Flyttad upp och mindre mellanrum
              fontSize="18"
              fill="#cccccc"
              fontFamily="PlusJakartaSans-Regular"
            >
              • E410 (Fruktkärnmjöl)
            </Text>
            <Text
              x="40"
              y="365"  // Flyttad upp och mindre mellanrum
              fontSize="18"
              fill="#cccccc"
              fontFamily="PlusJakartaSans-Regular"
            >
              • Kikärtsmjöl
            </Text>
          </AnimatedG>
        </G>
      </Svg>
    </StyledView>
  );
}