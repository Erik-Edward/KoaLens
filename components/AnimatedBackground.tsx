// components/AnimatedBackground.tsx
import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { styled } from 'nativewind';

const StyledView = styled(View);
const AnimatedView = styled(Animated.View);

// Konfiguration
const CONFIG = {
  CUBE_SIZES: {
    SMALL: 30,
    MEDIUM: 45, // Används för de övre kuberna
    LARGE: 60,
  },
  ANIMATION: {
    COLOR_DURATION: 20000,
  },
};

// Färgpaletten med RGB-värden för interpolation
const COLORS = [
  { r: 255, g: 20, b: 147 },  // Hot Pink
  { r: 0, g: 255, b: 255 },   // Cyan
  { r: 255, g: 0, b: 255 },   // Magenta
  { r: 255, g: 69, b: 0 },    // Neon Orange
  { r: 138, g: 43, b: 226 },  // Electric Purple
];

const getInterpolatedColor = (progress: number) => {
  'worklet';
  const totalColors = COLORS.length;
  const index = Math.floor(progress * (totalColors - 1));
  const nextIndex = Math.min(index + 1, totalColors - 1);
  const remainder = progress * (totalColors - 1) - index;
  const currentColor = COLORS[index];
  const nextColor = COLORS[nextIndex];
  const r = interpolate(remainder, [0, 1], [currentColor.r, nextColor.r]);
  const g = interpolate(remainder, [0, 1], [currentColor.g, nextColor.g]);
  const b = interpolate(remainder, [0, 1], [currentColor.b, nextColor.b]);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.25)`;
};

export default function AnimatedBackground() {
  const { width, height } = useWindowDimensions();

  // Välj totala tider (i ms) för varje segment i cykeln.
  const T1 = 3000; // Kub1 rör sig från start till krockpunkt.
  const T2 = 3000; // Kub2 rör sig från sin startposition till högra kanten.
  const T3 = 3000; // Kub1 rör sig tillbaka från krockpunkt till start & Kub2 rör sig tillbaka.
  const totalCycle = T1 + T2 + T3; // Totalt: 9000 ms

  // Definiera ett fast gap mellan kuberna (ex. 45 pixlar)
  const gap = 45;
  // Mittpositionen för de övre kuberna med hänsyn till kubens bredd:
  const mid = (width - CONFIG.CUBE_SIZES.MEDIUM) / 2;
  // Kub1:s krockpunkt – lite till vänster om mitten:
  const cube1Collision = mid - gap / 2;
  // Kub2:s startposition – lite till höger om mitten:
  const cube2Collision = mid + gap / 2;
  // Kub2:s högra slutpunkt:
  const rightX = width - CONFIG.CUBE_SIZES.MEDIUM;

  // Shared values för de övre kuberna:
  // Kub1: flyttar från 0 till cube1Collision och tillbaka.
  const movingX1 = useSharedValue(0);
  // Kub2: är stationär vid cube2Collision under T1, sedan flyttar den till rightX och tillbaka till cube2Collision under T3.
  const movingX2 = useSharedValue(cube2Collision);

  // Övriga animationer (undre kub och synkroniserade kuber) lämnas oförändrade.
  const movingXLower = useSharedValue(0);
  const syncCube1 = useSharedValue(0);
  const syncCube2 = useSharedValue(0);
  const syncCube3 = useSharedValue(0);
  const colorProgress = useSharedValue(0);

  useEffect(() => {
    // Färganimation för alla kuber
    colorProgress.value = withRepeat(
      withTiming(1, {
        duration: CONFIG.ANIMATION.COLOR_DURATION,
        easing: Easing.linear,
      }),
      -1,
      true
    );

    // Övre rad – Kub1:
    movingX1.value = withRepeat(
      withSequence(
        // Fas 1: Flytta från 0 till cube1Collision (T1)
        withTiming(cube1Collision, { duration: T1, easing: Easing.inOut(Easing.ease) }),
        // Fas 3: Flytta tillbaka från cube1Collision till 0 (T3)
        withTiming(0, { duration: T3, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Övre rad – Kub2:
    movingX2.value = withRepeat(
      withSequence(
        // Fas 1: Håll positionen vid cube2Collision under T1 (stationär)
        withTiming(cube2Collision, { duration: T1, easing: Easing.linear }),
        // Fas 2: Flytta från cube2Collision till rightX under T2
        withTiming(rightX, { duration: T2, easing: Easing.inOut(Easing.ease) }),
        // Fas 3: Flytta tillbaka från rightX till cube2Collision under T3
        withTiming(cube2Collision, { duration: T3, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Undre horisontella kuben (som rör sig hela vägen)
    movingXLower.value = withRepeat(
      withSequence(
        withTiming(width - CONFIG.CUBE_SIZES.MEDIUM, { duration: totalCycle, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: totalCycle, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Synkroniserade kuber (oförändrade)
    const startSyncAnimation = () => {
      const distance = width - CONFIG.CUBE_SIZES.SMALL;
      return withRepeat(
        withSequence(
          withTiming(distance, { duration: totalCycle, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: totalCycle, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    };
    syncCube1.value = startSyncAnimation();
    setTimeout(() => { syncCube2.value = startSyncAnimation(); }, 400);
    setTimeout(() => { syncCube3.value = startSyncAnimation(); }, 800);
  }, [width]);

  // Animerade stilar för de övre kuberna:
  const topCube1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: movingX1.value }],
    backgroundColor: getInterpolatedColor(colorProgress.value),
  }));
  const topCube2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: movingX2.value }],
    backgroundColor: getInterpolatedColor(colorProgress.value),
  }));

  // Stil för den undre kuben:
  const lowerCubeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: movingXLower.value }],
    backgroundColor: getInterpolatedColor(colorProgress.value),
  }));

  // Stil för synkroniserade kuber:
  const syncCubeStyle = (syncVal: Animated.SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ translateX: syncVal.value }],
      backgroundColor: getInterpolatedColor(colorProgress.value),
    }));

  return (
    <StyledView className="absolute inset-0">
      {/* Stationära kuber */}
      <AnimatedView
        className="absolute rounded-xl"
        style={useAnimatedStyle(() => ({
          width: CONFIG.CUBE_SIZES.SMALL,
          height: CONFIG.CUBE_SIZES.SMALL,
          left: width * 0.2,
          top: height * 0.15,
          backgroundColor: getInterpolatedColor(colorProgress.value),
        }))}
      />
      <AnimatedView
        className="absolute rounded-xl"
        style={useAnimatedStyle(() => ({
          width: CONFIG.CUBE_SIZES.SMALL,
          height: CONFIG.CUBE_SIZES.SMALL,
          right: width * 0.15,
          top: height * 0.3,
          backgroundColor: getInterpolatedColor(colorProgress.value),
        }))}
      />

      {/* Övre horisontellt rörliga kuber: Kub1 och Kub2 */}
      <AnimatedView
        className="absolute rounded-xl"
        style={[
          { width: CONFIG.CUBE_SIZES.MEDIUM, height: CONFIG.CUBE_SIZES.MEDIUM, top: height * 0.25 },
          topCube1Style,
        ]}
      />
      <AnimatedView
        className="absolute rounded-xl"
        style={[
          { width: CONFIG.CUBE_SIZES.MEDIUM, height: CONFIG.CUBE_SIZES.MEDIUM, top: height * 0.25 },
          topCube2Style,
        ]}
      />

      {/* Undre horisontellt rörliga kuben */}
      <AnimatedView
        className="absolute rounded-xl"
        style={[
          { width: CONFIG.CUBE_SIZES.MEDIUM, height: CONFIG.CUBE_SIZES.MEDIUM, top: height * 0.75 },
          lowerCubeStyle,
        ]}
      />

      {/* Synkroniserade kuber */}
      <AnimatedView
        className="absolute rounded-xl"
        style={useAnimatedStyle(() => ({
          width: CONFIG.CUBE_SIZES.SMALL,
          height: CONFIG.CUBE_SIZES.SMALL,
          top: height * 0.5 + 28,
          transform: [{ translateX: syncCube1.value }],
          backgroundColor: getInterpolatedColor(colorProgress.value),
        }))}
      />
      <AnimatedView
        className="absolute rounded-xl"
        style={useAnimatedStyle(() => ({
          width: CONFIG.CUBE_SIZES.SMALL,
          height: CONFIG.CUBE_SIZES.SMALL,
          top: height * 0.5 + CONFIG.CUBE_SIZES.SMALL + 10 + 28,
          transform: [{ translateX: syncCube2.value }],
          backgroundColor: getInterpolatedColor(colorProgress.value),
        }))}
      />
      <AnimatedView
        className="absolute rounded-xl"
        style={useAnimatedStyle(() => ({
          width: CONFIG.CUBE_SIZES.SMALL,
          height: CONFIG.CUBE_SIZES.SMALL,
          top: height * 0.5 + (CONFIG.CUBE_SIZES.SMALL + 10) * 2 + 28,
          transform: [{ translateX: syncCube3.value }],
          backgroundColor: getInterpolatedColor(colorProgress.value),
        }))}
      />
    </StyledView>
  );
}
