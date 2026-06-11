'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useBrandColors } from '@/lib/theme-provider';
import type { AppAlertButton, AppAlertVariant } from '@/lib/app-alert';

type AppAlertModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  variant: AppAlertVariant;
  buttons: AppAlertButton[];
  onDismiss: () => void;
  onPressButton: (button: AppAlertButton) => void;
};

function variantIcon(variant: AppAlertVariant): keyof typeof MaterialIcons.glyphMap {
  switch (variant) {
    case 'danger':
      return 'delete-outline';
    case 'success':
      return 'check-circle';
    case 'error':
      return 'error-outline';
    default:
      return 'info-outline';
  }
}

export function AppAlertModal({
  visible,
  title,
  message,
  variant,
  buttons,
  onDismiss,
  onPressButton,
}: AppAlertModalProps) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  const iconName = variantIcon(variant);
  const iconColor =
    variant === 'danger'
      ? colors.danger
      : variant === 'error'
        ? colors.danger
        : variant === 'success'
          ? colors.success
          : colors.primary;

  const iconBg =
    variant === 'danger'
      ? 'rgba(220, 38, 38, 0.1)'
      : variant === 'error'
        ? 'rgba(220, 38, 38, 0.1)'
        : variant === 'success'
          ? 'rgba(5, 150, 105, 0.12)'
          : 'rgba(240, 161, 50, 0.14)';

  const useRowActions = buttons.length === 2;
  const cancelButton = buttons.find((button) => button.style === 'cancel');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (cancelButton) {
          onPressButton(cancelButton);
        } else {
          onDismiss();
        }
      }}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <MaterialIcons name={iconName} size={30} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.actions, useRowActions ? styles.actionsRow : null]}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              const isLast = index === buttons.length - 1;
              const isPrimary =
                !isCancel && !isDestructive && (buttons.length === 1 || isLast);
              const isSecondary =
                !isCancel && !isDestructive && buttons.length > 1 && !isLast;

              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    useRowActions ? styles.actionBtnRow : null,
                    isCancel ? styles.cancelBtn : null,
                    isDestructive ? styles.destructiveBtn : null,
                    isPrimary ? styles.primaryBtn : null,
                    isSecondary ? styles.secondaryBtn : null,
                    pressed ? styles.actionBtnPressed : null,
                  ]}
                  onPress={() => onPressButton(button)}>
                  <Text
                    style={[
                      styles.actionText,
                      isCancel ? styles.cancelText : null,
                      isDestructive ? styles.destructiveText : null,
                      isPrimary ? styles.primaryText : null,
                      isSecondary ? styles.secondaryText : null,
                    ]}>
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 18,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 8,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    title: {
      color: c.text,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      color: c.textMuted,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      marginBottom: 20,
    },
    actions: {
      width: '100%',
      gap: 10,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    actionBtn: {
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46,
    },
    actionBtnRow: {
      flex: 1,
    },
    actionBtnPressed: {
      opacity: 0.86,
    },
    cancelBtn: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.menuRowAlt,
    },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.08)',
    },
    primaryBtn: {
      backgroundColor: c.primary,
    },
    destructiveBtn: {
      backgroundColor: c.danger,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '800',
      textAlign: 'center',
    },
    cancelText: {
      color: c.textMuted,
    },
    primaryText: {
      color: c.primaryText,
    },
    secondaryText: {
      color: c.primary,
    },
    destructiveText: {
      color: '#FFFFFF',
    },
  });
