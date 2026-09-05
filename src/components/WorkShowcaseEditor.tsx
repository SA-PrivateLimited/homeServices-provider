import React, {useState} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadAssetFromUri} from '../services/api/assetsApi';
import {updateMyProfile} from '../services/api/providersApi';
import useTranslation from '../hooks/useTranslation';
import type {Theme} from '../utils/theme';

const MAX_SHOWCASE = 3;

type Props = {
  theme: Theme;
  photos: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export function WorkShowcaseEditor({theme, photos, onChange, disabled}: Props) {
  const {t} = useTranslation();
  const [busy, setBusy] = useState<number | null>(null);
  const slots = Array.from({length: MAX_SHOWCASE}, (_, i) => photos[i] || null);

  const pick = (index: number) => {
    if (disabled || busy != null) return;
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, async response => {
      const asset = response.assets?.[0];
      if (!asset?.uri) return;
      setBusy(index);
      try {
        const ref = await uploadAssetFromUri(asset.uri, {
          purpose: 'provider-showcase',
          contentType: asset.type || 'image/jpeg',
          fileName: asset.fileName || 'showcase.jpg',
        });
        const next = photos.slice(0, MAX_SHOWCASE);
        if (index < next.length) next[index] = ref.url;
        else if (next.length < MAX_SHOWCASE) next.push(ref.url);
        const urls = next.filter(Boolean).slice(0, MAX_SHOWCASE);
        await updateMyProfile({photos: urls});
        onChange(urls);
      } finally {
        setBusy(null);
      }
    });
  };

  const removeAt = async (index: number) => {
    if (disabled || busy != null) return;
    setBusy(index);
    try {
      const urls = photos.filter((_, i) => i !== index);
      await updateMyProfile({photos: urls});
      onChange(urls);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.wrap, {backgroundColor: theme.card, borderColor: theme.border}]}>
      <Text style={[styles.title, {color: theme.text}]}>
        {String(t('showcase.workShowcase') || 'Work photos')}
      </Text>
      <Text style={[styles.hint, {color: theme.textSecondary}]}>
        {String(t('showcase.editorHint') || 'Add up to 3 photos of your work.')}
      </Text>
      <View style={styles.row}>
        {slots.map((url, index) => (
          <View key={index} style={styles.slot}>
            <TouchableOpacity
              style={[styles.thumb, {backgroundColor: theme.background}]}
              onPress={() => pick(index)}>
              {busy === index ? (
                <ActivityIndicator color={theme.primary} />
              ) : url ? (
                <Image source={{uri: url}} style={styles.img} />
              ) : (
                <Text style={{color: theme.primary, fontWeight: '700'}}>+</Text>
              )}
            </TouchableOpacity>
            {url ? (
              <TouchableOpacity onPress={() => void removeAt(index)}>
                <Text style={{color: theme.error || '#FF3B30', fontSize: 12}}>
                  {String(t('actions.remove') || 'Remove')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  title: {fontSize: 16, fontWeight: '700'},
  hint: {fontSize: 13, lineHeight: 18},
  row: {flexDirection: 'row', gap: 8},
  slot: {flex: 1, alignItems: 'center', gap: 6},
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: {width: '100%', height: '100%'},
});
