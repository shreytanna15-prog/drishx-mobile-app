'use client';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BrandColorScheme } from '@/constants/brand-colors';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/lib/auth';
import { buildColorLensRouteParams } from '@/lib/color-lens-order';
import { uploadColorReference } from '@/lib/color-reference-api';
import { useBrandColors } from '@/lib/theme-provider';

type PickedImage = {
  uri: string;
  mimeType: string;
  fileName: string;
};

const MAX_BYTES = 10 * 1024 * 1024;

export default function UploadReferenceScreen() {
  const router = useRouter();
  const colors = useBrandColors();
  const styles = useThemedStyles(createStyles);
  const { getAuthHeaders } = useAuth();
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [uploading, setUploading] = useState(false);

  const applyPickedAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri) {
      Alert.alert('Upload failed', 'Could not read the selected image.');
      return;
    }

    if (asset.fileSize && asset.fileSize > MAX_BYTES) {
      Alert.alert('File too large', 'Please choose an image that is 10 MB or smaller.');
      return;
    }

    const mimeType = asset.mimeType ?? 'image/jpeg';
    const fileName =
      asset.fileName ?? `color-reference-${Date.now()}.${mimeType.includes('png') ? 'png' : 'jpg'}`;

    setPickedImage({ uri: asset.uri, mimeType, fileName });
  }, []);

  const openCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is required to capture a reference photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      applyPickedAsset(result.assets[0]);
    }
  }, [applyPickedAsset]);

  const openGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Photo library access is required to choose a reference image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      applyPickedAsset(result.assets[0]);
    }
  }, [applyPickedAsset]);

  const handleContinue = useCallback(async () => {
    if (!pickedImage || uploading) return;

    setUploading(true);
    try {
      const result = await uploadColorReference(
        pickedImage.uri,
        pickedImage.mimeType,
        pickedImage.fileName,
        getAuthHeaders()
      );

      router.push({
        pathname: '/color/lens-type',
        params: buildColorLensRouteParams({
          colorId: 'upload-reference',
          colorName: 'Color Reference',
          referenceImageUrl: result.storedImageUrl || result.imageUrl,
        }),
      } as never);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setUploading(false);
    }
  }, [getAuthHeaders, pickedImage, router, uploading]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>Upload Reference</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.uploadBox}>
            {pickedImage ? (
              <Image source={{ uri: pickedImage.uri }} style={styles.previewImage} contentFit="cover" />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <MaterialIcons name="cloud-upload" size={42} color={colors.primary} />
                <Text style={styles.uploadTitle}>Upload or Capture</Text>
                <Text style={styles.uploadSubtitle}>Lens / Color Reference</Text>
                <Text style={styles.uploadHint}>Supported: JPG, PNG (Max 10MB)</Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <Pressable style={styles.pickBtn} onPress={() => void openCamera()} disabled={uploading}>
                <MaterialIcons name="photo-camera" size={18} color={colors.primary} />
                <Text style={styles.pickBtnText}>Camera</Text>
              </Pressable>
              <Pressable style={styles.pickBtn} onPress={() => void openGallery()} disabled={uploading}>
                <MaterialIcons name="photo-library" size={18} color={colors.primary} />
                <Text style={styles.pickBtnText}>Gallery</Text>
              </Pressable>
            </View>
          </View>

        </ScrollView>

        <View style={styles.bottomPanel}>
          <Pressable
            style={[styles.analyzeBtn, (!pickedImage || uploading) && styles.analyzeBtnDisabled]}
            disabled={!pickedImage || uploading}
            onPress={() => void handleContinue()}>
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.analyzeBtnText}>{pickedImage ? 'Next' : 'Analyze Color'}</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>
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
      paddingBottom: 14,
    },
    backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.text, fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 },
    uploadBox: {
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.primary,
      backgroundColor: c.card,
      padding: 16,
      gap: 16,
      minHeight: 320,
    },
    uploadPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 24,
    },
    previewImage: {
      width: '100%',
      height: 220,
      borderRadius: 12,
      backgroundColor: c.menuRow,
    },
    uploadTitle: { color: c.text, fontSize: 17, fontWeight: '800', marginTop: 4 },
    uploadSubtitle: { color: c.textMuted, fontSize: 14, fontWeight: '600' },
    uploadHint: { color: c.textMuted, fontSize: 12, fontWeight: '500', marginTop: 4 },
    actionRow: { flexDirection: 'row', gap: 12 },
    pickBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.menuRow,
    },
    pickBtnText: { color: c.text, fontSize: 14, fontWeight: '700' },
    bottomPanel: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    analyzeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#4F46E5',
      borderRadius: 14,
      paddingVertical: 15,
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    analyzeBtnDisabled: { opacity: 0.45 },
    analyzeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  });
