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

const TEXT_ASPECT = 840 / 1250;
const LOGO_ASPECT = 740 / 1250;

const ASSET_ZOOM = 1.7;

const TAGLINE = ['INTELLIGENCE.', 'PRECISION.', 'CONTROL.'] as const;

const TEXT_WIDTH = SCREEN_WIDTH * 0.50 * ASSET_ZOOM;
const TEXT_HEIGHT = TEXT_WIDTH * TEXT_ASPECT;

const LOGO_WIDTH = SCREEN_WIDTH * ASSET_ZOOM;
const LOGO_HEIGHT = LOGO_WIDTH * LOGO_ASPECT;

const LOGO_TOP_CROP = 0.12;
const LOGO_VISIBLE_RATIO = 0.52;

// Crop the PNG matte padding safely so visible artwork spacing is even.
const TEXT_TOP_CROP = 0.06;
const TEXT_VISIBLE_RATIO = 0.78;

const GAP_TEXT_TO_LOGO = 2;
const GAP_LOGO_TO_TAGLINE = 16;

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

  const logoFrameHeight = LOGO_HEIGHT * LOGO_VISIBLE_RATIO;
  const textFrameHeight = TEXT_HEIGHT * TEXT_VISIBLE_RATIO;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.stack, screenStyle]}>
        <Animated.View style={[styles.textFrame, { height: textFrameHeight }, textStyle]}>
          <Image
            source={require('@/assets/images/splash/drishx-text.png')}
            style={[styles.brandText, { marginTop: -TEXT_HEIGHT * TEXT_TOP_CROP }]}
            contentFit="contain"
            accessibilityLabel="DrishX"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.logoFrame,
            { height: logoFrameHeight, marginTop: GAP_TEXT_TO_LOGO },
            logoStyle,
          ]}>
          <Image
            source={require('@/assets/images/splash/drishx-logo.png')}
            style={[styles.logo, { marginTop: -LOGO_HEIGHT * LOGO_TOP_CROP }]}
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
  },
  textFrame: {
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    width: TEXT_WIDTH,
    height: TEXT_HEIGHT,
  },
  logoFrame: {
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    alignItems: 'center',
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
    color: '#E8E4DC',
    fontSize: SCREEN_WIDTH < 380 ? 13 : 14.5,
    lineHeight: SCREEN_WIDTH < 380 ? 24 : 26,
    letterSpacing: SCREEN_WIDTH < 380 ? 6 : 7,
    textAlign: 'center',
    fontWeight: '300',
    fontFamily: Platform.select({
      ios: 'Helvetica Neue',
      android: 'sans-serif-light',
      default: 'sans-serif',
    }),
  },
});
