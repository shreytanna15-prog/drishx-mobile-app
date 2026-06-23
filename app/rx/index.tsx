'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appAlert } from '@/lib/app-alert';

import { KeyboardAwareScroll } from '@/components/keyboard-aware-scroll';
import { OrderPlacedModal } from '@/components/order-placed-modal';
import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { formatPowerLabel } from '@/lib/cart-utils';
import { useAuth } from '@/lib/auth';
import {
  buildAddOptions,
  buildCylOptions,
  buildRxAxisOptions,
  buildSphOptions,
  createDefaultRxPrescription,
  getRxLensCount,
  getRxOrderSummaryLabel,
  lensTypeTitle,
  PRODUCT_NAME_MAX,
  REMARKS_MAX,
  RX_DIAMETER_PRESETS,
  RX_LENS_COATING_PRESETS,
  RX_LENS_FEATURE_PRESETS,
  RX_LENS_INDEX_PRESETS,
  RX_LENS_TYPE_OPTIONS,
  RX_ORDER_FOR_OPTIONS,
  RX_REMARK_TAGS,
  rxShowsAdd,
  snapToRxAxis,
  stepEyePower,
  stepRxAxis,
  type RxEyePower,
  type RxLensTypeId,
  type RxOrderFor,
  type RxPrescription,
} from '@/lib/rx-order';
import { placeRxOrder, uploadRxPrescription } from '@/lib/rx-orders-api';
import { useBrandColors } from '@/lib/theme-provider';

type PickedPrescription = {
  uri: string;
  mimeType: string;
  fileName: string;
};

type EyeSide = 'right' | 'left';
type PowerField = 'sph' | 'cyl' | 'axis' | 'add';

function SectionHeader({ number, title }: { number: number; title: string }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{number}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function PowerStepper({
  value,
  label,
  onDecrease,
  onIncrease,
  disabled,
}: {
  value: string;
  label?: string;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
}) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.stepperWrap}>
      {label ? <Text style={styles.stepperLabel}>{label}</Text> : null}
      <View style={[styles.stepper, disabled && styles.stepperDisabled]}>
        <Pressable
          style={styles.stepperBtn}
          onPress={onDecrease}
          disabled={disabled}
          hitSlop={6}>
          <MaterialIcons name="remove" size={16} color={disabled ? colors.textMuted : colors.text} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          style={styles.stepperBtn}
          onPress={onIncrease}
          disabled={disabled}
          hitSlop={6}>
          <MaterialIcons name="add" size={16} color={disabled ? colors.textMuted : colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function DiameterField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.diameterWrap}>
      <Pressable
        style={[styles.diameterDropdown, disabled && styles.stepperDisabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}>
        <Text style={styles.diameterDropdownText}>{value || '65'}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={18} color={colors.textMuted} />
      </Pressable>
      <TextInput
        style={[styles.diameterInput, disabled && styles.stepperDisabled]}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholder="mm"
        placeholderTextColor={colors.textMuted}
        editable={!disabled}
        maxLength={4}
      />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.diameterModalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.diameterModalCard}>
            <Text style={styles.diameterModalTitle}>Select diameter</Text>
            {RX_DIAMETER_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                style={styles.diameterOption}
                onPress={() => {
                  onChange(preset);
                  setOpen(false);
                }}>
                <Text style={styles.diameterOptionText}>{preset} mm</Text>
                {value === preset ? (
                  <MaterialIcons name="check" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function RequirementSelectField({
  label,
  value,
  onChange,
  presets,
  modalTitle,
  manualPlaceholder = 'Custom',
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  presets: readonly string[];
  modalTitle: string;
  manualPlaceholder?: string;
}) {
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const displayValue = value.trim() || presets[0] || '';

  return (
    <View style={styles.requirementRow}>
      <Text style={styles.requirementRowLabel}>{label}</Text>
      <View style={styles.requirementInputWrap}>
        <Pressable style={styles.requirementDropdown} onPress={() => setOpen(true)}>
          <Text style={styles.requirementDropdownText} numberOfLines={1}>
            {displayValue}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={18} color={colors.textMuted} />
        </Pressable>
        <TextInput
          style={styles.requirementManualInput}
          value={value}
          onChangeText={onChange}
          placeholder={manualPlaceholder}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.diameterModalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.diameterModalCard}>
            <Text style={styles.diameterModalTitle}>{modalTitle}</Text>
            {presets.map((preset) => (
              <Pressable
                key={preset}
                style={styles.diameterOption}
                onPress={() => {
                  onChange(preset);
                  setOpen(false);
                }}>
                <Text style={styles.diameterOptionText}>{preset}</Text>
                {value === preset ? (
                  <MaterialIcons name="check" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function RxOrderScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const { getAuthHeaders } = useAuth();

  const [lensType, setLensType] = useState<RxLensTypeId>('single-vision');
  const [orderFor, setOrderFor] = useState<RxOrderFor>('both');
  const [pairQuantity, setPairQuantity] = useState(1);
  const [samePowerForBothEyes, setSamePowerForBothEyes] = useState(true);
  const [prescription, setPrescription] = useState<RxPrescription>(() =>
    createDefaultRxPrescription('single-vision')
  );
  const [feature, setFeature] = useState('Clear');
  const [lensIndex, setLensIndex] = useState('1.56');
  const [coating, setCoating] = useState('HMC');
  const [productName, setProductName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [remarkTags, setRemarkTags] = useState<string[]>([]);
  const [pickedPrescription, setPickedPrescription] = useState<PickedPrescription | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlacedMessage, setOrderPlacedMessage] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const showAdd = rxShowsAdd(lensType);
  const sphOptions = useMemo(() => buildSphOptions(), []);
  const cylOptions = useMemo(() => buildCylOptions(), []);
  const addOptions = useMemo(() => buildAddOptions(), []);
  const axisOptions = useMemo(() => buildRxAxisOptions(), []);

  const orderSummaryLabel = getRxOrderSummaryLabel(orderFor, pairQuantity);
  const lensCount = getRxLensCount(orderFor, pairQuantity);

  useEffect(() => {
    setPrescription((current) => createDefaultRxPrescription(lensType));
  }, [lensType]);

  const snapPower = useCallback(
    (field: PowerField, value: number): number => {
      if (field === 'axis') {
        return snapToRxAxis(value);
      }
      if (field === 'sph') {
        const options = sphOptions;
        return options.reduce((best, option) =>
          Math.abs(option - value) < Math.abs(best - value) ? option : best
        );
      }
      if (field === 'cyl') {
        const options = cylOptions;
        return options.reduce((best, option) =>
          Math.abs(option - value) < Math.abs(best - value) ? option : best
        );
      }
      const options = addOptions;
      return options.reduce((best, option) =>
        Math.abs(option - value) < Math.abs(best - value) ? option : best
      );
    },
    [addOptions, axisOptions, cylOptions, sphOptions]
  );

  const formatFieldValue = useCallback((field: PowerField, value: number): string => {
    if (field === 'axis') {
      return String(Math.round(value));
    }
    return formatPowerLabel(value);
  }, []);

  const stepField = useCallback(
    (field: PowerField, current: number, direction: 1 | -1): number => {
      if (field === 'axis') {
        return stepRxAxis(current, direction);
      }
      return stepEyePower(field, current, direction);
    },
    []
  );

  const updateEyeField = useCallback(
    (eye: EyeSide, field: PowerField, direction: 1 | -1) => {
      setPrescription((current) => {
        const updatedEye: RxEyePower = {
          ...current[eye],
          [field]: snapPower(field, stepField(field, current[eye][field], direction)),
        };

        if (samePowerForBothEyes && orderFor === 'both') {
          return {
            right: { ...updatedEye },
            left: { ...updatedEye },
          };
        }

        return {
          ...current,
          [eye]: updatedEye,
        };
      });
    },
    [orderFor, samePowerForBothEyes, snapPower, stepField]
  );

  const updateDiameter = useCallback(
    (eye: EyeSide, value: string) => {
      const cleaned = value.replace(/[^0-9]/g, '');
      setPrescription((current) => {
        const updatedEye = { ...current[eye], diameter: cleaned };
        if (samePowerForBothEyes && orderFor === 'both') {
          return {
            right: { ...updatedEye },
            left: { ...updatedEye },
          };
        }
        return { ...current, [eye]: updatedEye };
      });
    },
    [orderFor, samePowerForBothEyes]
  );

  const toggleSamePower = () => {
    setSamePowerForBothEyes((current) => {
      const next = !current;
      if (next) {
        setPrescription((prev) => ({
          right: { ...prev.right },
          left: { ...prev.right },
        }));
      }
      return next;
    });
  };

  const toggleRemarkTag = (tag: string) => {
    setRemarkTags((current) =>
      current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag]
    );
  };

  const applyPickedAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri) {
      appAlert('Upload failed', 'Could not read the selected file.');
      return;
    }
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const fileName =
      asset.fileName ?? `prescription-${Date.now()}.${mimeType.includes('png') ? 'png' : 'jpg'}`;
    setPickedPrescription({ uri: asset.uri, mimeType, fileName });
  }, []);

  const handlePrescriptionUpload = () => {
    appAlert('Upload prescription', 'JPG or PNG', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take photo',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            appAlert('Permission needed', 'Camera access is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) {
            applyPickedAsset(result.assets[0]);
          }
        },
      },
      {
        text: 'Choose from gallery',
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            appAlert('Permission needed', 'Photo library access is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) {
            applyPickedAsset(result.assets[0]);
          }
        },
      },
    ]);
  };

  const handlePlaceOrder = async () => {
    if (placingOrder) return;

    setPlacingOrder(true);
    try {
      let prescriptionImageUrl: string | null = null;
      if (pickedPrescription) {
        const upload = await uploadRxPrescription(
          pickedPrescription.uri,
          pickedPrescription.mimeType,
          pickedPrescription.fileName,
          getAuthHeaders()
        );
        prescriptionImageUrl = upload.storedImageUrl || upload.imageUrl;
      }

      const featureValue = feature.trim() || 'Clear';
      const lensIndexValue = lensIndex.trim() || '1.56';
      const coatingValue = coating.trim() || 'HMC';

      const result = await placeRxOrder(
        {
          lensType,
          orderFor,
          quantity: lensCount,
          samePowerForBothEyes,
          prescription,
          feature: featureValue,
          lensIndex: lensIndexValue,
          coating: coatingValue,
          productName: productName.trim() || null,
          remarks: remarks.trim() || null,
          remarkTags,
          prescriptionImageUrl,
        },
        getAuthHeaders()
      );

      if (result.success) {
        setOrderPlacedMessage(result.message);
        return;
      }

      appAlert('Order failed', result.error);
    } catch (err) {
      appAlert(
        'Order failed',
        err instanceof Error ? err.message : 'Could not place your order. Please try again.'
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const showRightEye = orderFor === 'both' || orderFor === 'right';
  const showLeftEye = orderFor === 'both' || orderFor === 'left';
  const quantityHint =
    orderFor === 'both'
      ? `You are ordering ${pairQuantity} ${pairQuantity === 1 ? 'Pair' : 'Pairs'} (${lensCount} Lenses)`
      : `You are ordering ${lensCount} ${lensCount === 1 ? 'Lens' : 'Lenses'}`;

  const summaryDetails = [
    `Lens: ${lensTypeTitle(lensType)}`,
    `Order: ${orderSummaryLabel}`,
    `Feature: ${feature.trim() || 'Clear'}`,
    `Index: ${lensIndex.trim() || '1.56'}`,
    `Coating: ${coating.trim() || 'HMC'}`,
    productName.trim() ? `Product: ${productName.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <View style={styles.root}>
      <OrderPlacedModal
        visible={orderPlacedMessage !== null}
        message={orderPlacedMessage ?? ''}
        onViewOrders={() => {
          setOrderPlacedMessage(null);
          router.replace('/(tabs)/my-orders' as never);
        }}
        onContinueShopping={() => {
          setOrderPlacedMessage(null);
          router.replace('/(tabs)/' as never);
        }}
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>New RX Order</Text>
            <Text style={styles.subtitle}>Create a new prescription order</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <KeyboardAwareScroll contentContainerStyle={styles.scrollContent}>
          <SectionHeader number={1} title="Lens Type" />
          <View style={styles.lensTypeRow}>
            {RX_LENS_TYPE_OPTIONS.map((option) => {
              const selected = lensType === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.lensTypeCard, selected && styles.lensTypeCardSelected]}
                  onPress={() => setLensType(option.id)}>
                  {selected ? (
                    <MaterialIcons
                      name="check-circle"
                      size={18}
                      color={colors.primary}
                      style={styles.lensTypeCheck}
                    />
                  ) : null}
                  <MaterialIcons name={option.icon} size={24} color={colors.primary} />
                  <Text style={styles.lensTypeTitle}>{option.title}</Text>
                  <Text style={styles.lensTypeShort}>({option.shortLabel})</Text>
                </Pressable>
              );
            })}
          </View>

          <SectionHeader number={2} title="Order For & Quantity" />
          <View style={styles.orderForRow}>
            <View style={styles.orderForCol}>
              {RX_ORDER_FOR_OPTIONS.map((option) => {
                const selected = orderFor === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.orderForCard, selected && styles.orderForCardSelected]}
                    onPress={() => setOrderFor(option.id)}>
                    <View style={styles.orderForBadge}>
                      <Text style={styles.orderForBadgeText}>{option.badge}</Text>
                    </View>
                    <View style={styles.orderForMeta}>
                      <Text style={styles.orderForTitle}>{option.title}</Text>
                      <Text style={styles.orderForSubtitle}>{option.subtitle}</Text>
                    </View>
                    {selected ? (
                      <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.quantityCol}>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <View style={styles.quantityStepper}>
                <Pressable
                  style={styles.quantityBtn}
                  onPress={() => setPairQuantity((q) => Math.max(1, q - 1))}>
                  <MaterialIcons name="remove" size={18} color={colors.text} />
                </Pressable>
                <Text style={styles.quantityValue}>{pairQuantity}</Text>
                <Pressable
                  style={styles.quantityBtn}
                  onPress={() => setPairQuantity((q) => Math.min(99, q + 1))}>
                  <MaterialIcons name="add" size={18} color={colors.text} />
                </Pressable>
              </View>
              <Text style={styles.quantityHint}>{quantityHint}</Text>
            </View>
          </View>

          {orderFor === 'both' ? (
            <Pressable style={styles.samePowerRow} onPress={toggleSamePower}>
              <View style={[styles.checkbox, samePowerForBothEyes && styles.checkboxChecked]}>
                {samePowerForBothEyes ? (
                  <MaterialIcons name="check" size={14} color={colors.primaryText} />
                ) : null}
              </View>
              <View style={styles.samePowerMeta}>
                <Text style={styles.samePowerText}>Same power for both eyes</Text>
                <Text style={styles.samePowerHint}>
                  Enter power for Right eye, it will be applied to Left eye
                </Text>
              </View>
            </Pressable>
          ) : null}

          <SectionHeader number={3} title="Prescription" />
          <View style={styles.prescriptionCard}>
            <View style={styles.prescriptionHeaderRow}>
              <Text style={styles.prescriptionFieldLabel} />
              {showRightEye ? (
                <Text style={styles.prescriptionEyeLabel}>R</Text>
              ) : (
                <View style={styles.prescriptionEyeSpacer} />
              )}
              {showLeftEye ? (
                <Text style={styles.prescriptionEyeLabel}>L</Text>
              ) : (
                <View style={styles.prescriptionEyeSpacer} />
              )}
            </View>

            {(['sph', 'cyl', 'axis', ...(showAdd ? (['add'] as const) : [])] as PowerField[]).map(
              (field) => (
                <View key={field} style={styles.prescriptionDataRow}>
                  <Text style={styles.prescriptionFieldLabel}>
                    {field === 'sph'
                      ? 'SPH'
                      : field === 'cyl'
                        ? 'CYL'
                        : field === 'axis'
                          ? 'AXIS'
                          : 'ADD'}
                  </Text>
                  {showRightEye ? (
                    <PowerStepper
                      value={formatFieldValue(field, prescription.right[field])}
                      onDecrease={() => updateEyeField('right', field, -1)}
                      onIncrease={() => updateEyeField('right', field, 1)}
                    />
                  ) : (
                    <View style={styles.prescriptionEyeSpacer} />
                  )}
                  {showLeftEye ? (
                    <PowerStepper
                      value={formatFieldValue(field, prescription.left[field])}
                      onDecrease={() => updateEyeField('left', field, -1)}
                      onIncrease={() => updateEyeField('left', field, 1)}
                      disabled={orderFor === 'both' && samePowerForBothEyes}
                    />
                  ) : (
                    <View style={styles.prescriptionEyeSpacer} />
                  )}
                </View>
              )
            )}

            <View style={styles.prescriptionDataRow}>
              <Text style={styles.prescriptionFieldLabel}>Diameter</Text>
              {showRightEye ? (
                <DiameterField
                  value={prescription.right.diameter}
                  onChange={(value) => updateDiameter('right', value)}
                />
              ) : (
                <View style={styles.prescriptionEyeSpacer} />
              )}
              {showLeftEye ? (
                <DiameterField
                  value={prescription.left.diameter}
                  onChange={(value) => updateDiameter('left', value)}
                  disabled={orderFor === 'both' && samePowerForBothEyes}
                />
              ) : (
                <View style={styles.prescriptionEyeSpacer} />
              )}
            </View>
          </View>

          <SectionHeader number={4} title="Lens Requirements" />
          <View style={styles.requirementsCard}>
            <RequirementSelectField
              label="Feature / Type"
              value={feature}
              onChange={setFeature}
              presets={RX_LENS_FEATURE_PRESETS}
              modalTitle="Select feature / type"
              manualPlaceholder="Enter custom type"
            />
            <RequirementSelectField
              label="Index"
              value={lensIndex}
              onChange={setLensIndex}
              presets={RX_LENS_INDEX_PRESETS}
              modalTitle="Select index"
              manualPlaceholder="Enter index"
            />
            <RequirementSelectField
              label="Coating"
              value={coating}
              onChange={setCoating}
              presets={RX_LENS_COATING_PRESETS}
              modalTitle="Select coating"
              manualPlaceholder="Enter custom coating"
            />
          </View>

          <SectionHeader number={5} title="Product Name (Optional)" />
          <View style={styles.textFieldWrap}>
            <TextInput
              style={styles.textField}
              value={productName}
              onChangeText={(text) => setProductName(text.slice(0, PRODUCT_NAME_MAX))}
              placeholder="Enter product name manually. Example: Prime Blue Cut 1.67 / Zeiss SmartLife / Crizal Sapphire"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Text style={styles.charCounter}>
              {productName.length}/{PRODUCT_NAME_MAX}
            </Text>
          </View>

          <SectionHeader number={6} title="Attachments (Optional)" />
          <Pressable style={styles.attachmentCardFull} onPress={handlePrescriptionUpload}>
            {pickedPrescription ? (
              <Image source={{ uri: pickedPrescription.uri }} style={styles.attachmentPreview} />
            ) : (
              <MaterialIcons name="photo-camera" size={28} color={colors.primary} />
            )}
            <Text style={styles.attachmentTitle}>Prescription</Text>
            <Text style={styles.attachmentHint}>JPG or PNG</Text>
          </Pressable>

          <SectionHeader number={7} title="Remarks (Optional)" />
          <View style={styles.textFieldWrap}>
            <TextInput
              style={[styles.textField, styles.remarksField]}
              value={remarks}
              onChangeText={(text) => setRemarks(text.slice(0, REMARKS_MAX))}
              placeholder="Add any special instructions..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Text style={styles.charCounter}>
              {remarks.length}/{REMARKS_MAX}
            </Text>
          </View>

          <View style={styles.remarkTagsRow}>
            {RX_REMARK_TAGS.map((tag) => {
              const active = remarkTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  style={[styles.remarkTag, active && styles.remarkTagActive]}
                  onPress={() => toggleRemarkTag(tag)}>
                  <Text style={[styles.remarkTagText, active && styles.remarkTagTextActive]}>
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.scrollBottomSpacer} />
        </KeyboardAwareScroll>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <View style={styles.footerTop}>
            <View style={styles.footerSummary}>
              <Text style={styles.footerSummaryTitle}>Order Summary</Text>
              <Text style={styles.footerSummaryValue}>{orderSummaryLabel}</Text>
              <Pressable onPress={() => setShowSummary((open) => !open)}>
                <Text style={styles.footerViewDetails}>
                  {showSummary ? 'Hide details' : 'View details'}
                </Text>
              </Pressable>
              {showSummary ? <Text style={styles.footerSummaryDetails}>{summaryDetails}</Text> : null}
            </View>
            <View style={styles.footerTotal}>
              <Text style={styles.footerTotalLabel}>Est. Total</Text>
              <Text style={styles.footerTotalValue}>—</Text>
              <Text style={styles.footerTotalHint}>(Inclusive of all charges)</Text>
            </View>
          </View>

          <Pressable
            style={[styles.placeOrderBtn, placingOrder && styles.placeOrderBtnDisabled]}
            onPress={handlePlaceOrder}
            disabled={placingOrder}>
            {placingOrder ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <>
                <Text style={styles.placeOrderBtnText}>Place Order</Text>
                <MaterialIcons name="send" size={18} color={colors.primaryText} />
              </>
            )}
          </Pressable>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (c: BrandColorScheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    safe: { flex: 1 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 8,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center', gap: 3 },
    title: { color: c.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
    subtitle: { color: c.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    sectionBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionBadgeText: { color: c.primaryText, fontSize: 13, fontWeight: '900' },
    sectionTitle: { color: c.text, fontSize: 16, fontWeight: '800', flex: 1 },
    lensTypeRow: { flexDirection: 'row', gap: 8 },
    lensTypeCard: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingVertical: 14,
      paddingHorizontal: 6,
      position: 'relative',
    },
    lensTypeCardSelected: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.08)',
    },
    lensTypeCheck: { position: 'absolute', top: 6, right: 6 },
    lensTypeTitle: { color: c.text, fontSize: 11, fontWeight: '800', textAlign: 'center' },
    lensTypeShort: { color: c.textMuted, fontSize: 10, fontWeight: '600' },
    orderForRow: { flexDirection: 'row', gap: 10 },
    orderForCol: { flex: 1.4, gap: 8 },
    orderForCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    orderForCardSelected: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.08)',
    },
    orderForBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: 'rgba(240, 161, 50, 0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderForBadgeText: { color: c.primary, fontSize: 10, fontWeight: '900' },
    orderForMeta: { flex: 1, gap: 1 },
    orderForTitle: { color: c.text, fontSize: 11, fontWeight: '800' },
    orderForSubtitle: { color: c.textMuted, fontSize: 10, fontWeight: '500' },
    quantityCol: {
      flex: 0.8,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 10,
      gap: 8,
      justifyContent: 'center',
    },
    quantityLabel: { color: c.text, fontSize: 12, fontWeight: '800' },
    quantityStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.menuRow,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 4,
    },
    quantityBtn: { padding: 8 },
    quantityValue: { color: c.text, fontSize: 18, fontWeight: '900' },
    quantityHint: { color: c.textMuted, fontSize: 9, fontWeight: '500', lineHeight: 13 },
    samePowerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 2 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxChecked: { backgroundColor: c.primary, borderColor: c.primary },
    samePowerMeta: { flex: 1, gap: 2 },
    samePowerText: { color: c.text, fontSize: 13, fontWeight: '700' },
    samePowerHint: { color: c.textMuted, fontSize: 11, fontWeight: '500' },
    prescriptionCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 12,
      gap: 10,
    },
    prescriptionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    prescriptionFieldLabel: {
      width: 56,
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '800',
    },
    prescriptionEyeLabel: {
      flex: 1,
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'center',
    },
    prescriptionEyeSpacer: { flex: 1 },
    prescriptionDataRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepperWrap: { flex: 1, gap: 4 },
    stepperLabel: { color: c.textMuted, fontSize: 9, fontWeight: '700', textAlign: 'center' },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.menuRow,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 2,
      minHeight: 36,
    },
    stepperDisabled: { opacity: 0.45 },
    stepperBtn: { padding: 6 },
    stepperValue: {
      flex: 1,
      color: c.text,
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
    diameterWrap: { flex: 1, flexDirection: 'row', gap: 4 },
    diameterDropdown: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.menuRow,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 8,
      minHeight: 36,
    },
    diameterDropdownText: { color: c.text, fontSize: 12, fontWeight: '700' },
    diameterInput: {
      width: 44,
      backgroundColor: c.menuRow,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      color: c.text,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      minHeight: 36,
      paddingHorizontal: 4,
    },
    diameterModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    diameterModalCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 12,
      gap: 4,
    },
    diameterModalTitle: {
      color: c.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 6,
      paddingHorizontal: 4,
    },
    diameterOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
    },
    diameterOptionText: { color: c.text, fontSize: 14, fontWeight: '600' },
    requirementsCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 12,
      gap: 12,
    },
    requirementRow: { gap: 8 },
    requirementRowLabel: { color: c.text, fontSize: 13, fontWeight: '800' },
    requirementInputWrap: { flexDirection: 'row', gap: 8 },
    requirementDropdown: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.menuRow,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 10,
      minHeight: 40,
    },
    requirementDropdownText: {
      flex: 1,
      color: c.text,
      fontSize: 13,
      fontWeight: '700',
      marginRight: 4,
    },
    requirementManualInput: {
      flex: 1,
      backgroundColor: c.menuRow,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.cardBorder,
      color: c.text,
      fontSize: 13,
      fontWeight: '600',
      minHeight: 40,
      paddingHorizontal: 10,
    },
    textFieldWrap: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 12,
      gap: 6,
    },
    textField: {
      color: c.text,
      fontSize: 13,
      fontWeight: '500',
      minHeight: 44,
      textAlignVertical: 'top',
    },
    remarksField: { minHeight: 88 },
    charCounter: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'right',
    },
    attachmentCardFull: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingVertical: 22,
      paddingHorizontal: 12,
      minHeight: 120,
      overflow: 'hidden',
    },
    attachmentPreview: { width: 48, height: 48, borderRadius: 8 },
    attachmentTitle: { color: c.text, fontSize: 12, fontWeight: '800' },
    attachmentHint: {
      color: c.textMuted,
      fontSize: 10,
      fontWeight: '500',
      textAlign: 'center',
    },
    remarkTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    remarkTag: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    remarkTagActive: {
      borderColor: c.primary,
      backgroundColor: 'rgba(240, 161, 50, 0.1)',
    },
    remarkTagText: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
    remarkTagTextActive: { color: c.primary },
    scrollBottomSpacer: { height: 8 },
    footer: {
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
      backgroundColor: c.background,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 8,
      gap: 10,
    },
    footerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    footerSummary: { flex: 1, gap: 2 },
    footerSummaryTitle: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
    footerSummaryValue: { color: c.text, fontSize: 14, fontWeight: '900' },
    footerViewDetails: { color: c.primary, fontSize: 11, fontWeight: '700', marginTop: 2 },
    footerSummaryDetails: {
      color: c.textMuted,
      fontSize: 10,
      fontWeight: '500',
      lineHeight: 15,
      marginTop: 4,
    },
    footerTotal: { alignItems: 'flex-end', gap: 1 },
    footerTotalLabel: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
    footerTotalValue: { color: c.text, fontSize: 18, fontWeight: '900' },
    footerTotalHint: { color: c.textMuted, fontSize: 9, fontWeight: '500' },
    placeOrderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 16,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 4,
    },
    placeOrderBtnDisabled: { opacity: 0.7 },
    placeOrderBtnText: { color: c.primaryText, fontSize: 16, fontWeight: '900' },
  });
