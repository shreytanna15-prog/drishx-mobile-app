import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Dimensions, Platform, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TEXT_ASPECT = 408 / 612;
const LOGO_ASPECT = 742 / 1264;

const TAGLINE = ['INTELLIGENCE.', 'PRECISION.', 'CONTROL.'] as const;

const TEXT_WIDTH = SCREEN_WIDTH * 0.54;
const TEXT_HEIGHT = TEXT_WIDTH * TEXT_ASPECT;

const LOGO_WIDTH = SCREEN_WIDTH * 0.66;
const LOGO_HEIGHT = LOGO_WIDTH * LOGO_ASPECT;

const GAP_TEXT_TO_LOGO = 10;
const GAP_LOGO_TO_TAGLINE = 28;

/** Nudge the cluster slightly upward so tagline sits in the lower third. */
const STACK_OFFSET_Y = -SCREEN_HEIGHT * 0.035;

const FADE_IN_MS = 750;
const STAGGER_MS = 320;
const HOLD_MS = 1500;
const FADE_OUT_MS = 600;

const EASE_IN = Easing.out(Easing.cubic);
const EASE_OUT = Easing.in(Easing.cubic);

type BrandSplashProps = {
  onFinish?: () => void;
};

export function BrandSplash({ onFinish }: BrandSplashProps) {
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(12);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(14);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(10);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    textOpacity.value = withTiming(1, { duration: FADE_IN_MS, easing: EASE_IN });
    textTranslateY.value = withTiming(0, { duration: FADE_IN_MS, easing: EASE_IN });

    logoOpacity.value = withDelay(
      STAGGER_MS,
      withTiming(1, { duration: FADE_IN_MS, easing: EASE_IN })
    );
    logoTranslateY.value = withDelay(
      STAGGER_MS,
      withTiming(0, { duration: FADE_IN_MS, easing: EASE_IN })
    );

    taglineOpacity.value = withDelay(
      STAGGER_MS * 2,
      withTiming(1, { duration: FADE_IN_MS, easing: EASE_IN })
    );
    taglineTranslateY.value = withDelay(
      STAGGER_MS * 2,
      withTiming(0, { duration: FADE_IN_MS, easing: EASE_IN })
    );

    const fadeOutTimer = setTimeout(() => {
      screenOpacity.value = withTiming(
        0,
        { duration: FADE_OUT_MS, easing: EASE_OUT },
        (finished) => {
          if (finished && onFinish) {
            runOnJS(onFinish)();
          }
        }
      );
    }, STAGGER_MS * 2 + FADE_IN_MS + HOLD_MS);

    return () => clearTimeout(fadeOutTimer);
  }, [
    onFinish,
    logoOpacity,
    logoTranslateY,
    screenOpacity,
    taglineOpacity,
    taglineTranslateY,
    textOpacity,
    textTranslateY,
  ]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View
        style={[styles.stack, screenStyle, { transform: [{ translateY: STACK_OFFSET_Y }] }]}>
        <Animated.View style={[styles.brandTextWrap, textStyle]}>
          <Image
            source={require('@/assets/images/splash/drishx-text-removebg.png')}
            style={styles.brandText}
            contentFit="contain"
            accessibilityLabel="DrishX"
          />
        </Animated.View>

        <Animated.View style={[styles.logoWrap, { marginTop: GAP_TEXT_TO_LOGO }, logoStyle]}>
          <Image
            source={require('@/assets/images/splash/drishx-logo.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="DrishX logo"
          />
        </Animated.View>

        <Animated.View
          style={[styles.tagline, { marginTop: GAP_LOGO_TO_TAGLINE }, taglineStyle]}>
          {TAGLINE.map((line) => (
            <Text key={line} style={styles.taglineLine}>
              {line}
            </Text>
          ))}
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  stack: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brandTextWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    width: TEXT_WIDTH,
    height: TEXT_HEIGHT,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  tagline: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  taglineLine: {
    color: '#F2EFE8',
    fontSize: SCREEN_WIDTH < 380 ? 13 : 15,
    lineHeight: SCREEN_WIDTH < 380 ? 25 : 28,
    letterSpacing: SCREEN_WIDTH < 380 ? 6.5 : 7.5,
    textAlign: 'center',
    fontWeight: '300',
    fontFamily: Platform.select({
      ios: 'Helvetica Neue',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
  },
});
