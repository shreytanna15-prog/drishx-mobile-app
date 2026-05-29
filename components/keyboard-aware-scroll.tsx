import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type KeyboardAwareScrollProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  centerContent?: boolean;
  keyboardVerticalOffset?: number;
} & Pick<ScrollViewProps, 'showsVerticalScrollIndicator' | 'keyboardShouldPersistTaps'>;

export function KeyboardAwareScroll({
  children,
  contentContainerStyle,
  style,
  centerContent = false,
  keyboardVerticalOffset,
  showsVerticalScrollIndicator = false,
  keyboardShouldPersistTaps = 'handled',
}: KeyboardAwareScrollProps) {
  const insets = useSafeAreaInsets();
  const offset = keyboardVerticalOffset ?? insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={offset}>
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentContainerStyle={[
          styles.content,
          centerContent && styles.centered,
          contentContainerStyle,
        ]}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: 160,
  },
  centered: {
    justifyContent: 'center',
  },
});
