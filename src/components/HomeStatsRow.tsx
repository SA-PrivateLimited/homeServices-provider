import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {Theme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';
import {CrystalSurface} from './CrystalSurface';

type Props = {
  theme: Theme;
  newRequests: number;
  ongoing: number;
  completed: number;
  rating?: number | null;
  onOngoing: () => void;
  onCompleted: () => void;
  onRating: () => void;
};

export function HomeStatsRow({
  theme,
  newRequests,
  ongoing,
  completed,
  rating,
  onOngoing,
  onCompleted,
  onRating,
}: Props) {
  const {t} = useTranslation();
  const ratingLabel =
    typeof rating === 'number' && Number.isFinite(rating)
      ? rating.toFixed(1)
      : '0.0';

  const tiles = [
    {
      key: 'new',
      icon: 'work',
      value: String(newRequests),
      label: String(t('home.statNew') || 'New requests'),
      color: '#2563EB',
      onPress: undefined as undefined | (() => void),
    },
    {
      key: 'ongoing',
      icon: 'event',
      value: String(ongoing),
      label: String(t('home.statOngoing') || 'Ongoing jobs'),
      color: '#7C3AED',
      onPress: onOngoing,
    },
    {
      key: 'completed',
      icon: 'check-circle',
      value: String(completed),
      label: String(t('home.statCompleted') || 'Completed jobs'),
      color: '#16A34A',
      onPress: onCompleted,
    },
    {
      key: 'rating',
      icon: 'star',
      value: ratingLabel,
      label: String(t('home.statRating') || 'Rating'),
      color: '#D97706',
      onPress: onRating,
    },
  ];

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={String(t('home.statsLabel') || 'Summary')}>
      {tiles.map(tile => {
        const inner = (
          <CrystalSurface
            primary={theme.primary}
            card={theme.card}
            isDark={theme.background === '#0B1220'}
            compact
            contentStyle={styles.tileInner}>
            <View style={styles.head}>
              <Icon name={tile.icon} size={18} color={tile.color} />
              <Text style={[styles.value, {color: theme.text}]}>{tile.value}</Text>
            </View>
            <Text style={[styles.label, {color: theme.textSecondary}]}>
              {tile.label}
            </Text>
          </CrystalSurface>
        );
        if (!tile.onPress) {
          return (
            <View key={tile.key} style={styles.cell}>
              {inner}
            </View>
          );
        }
        return (
          <TouchableOpacity
            key={tile.key}
            style={styles.cell}
            onPress={tile.onPress}
            accessibilityRole="button">
            {inner}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {width: '48%', flexGrow: 1},
  tileInner: {
    padding: 12,
    gap: 6,
    minHeight: 76,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {fontSize: 20, fontWeight: '800', lineHeight: 24},
  label: {fontSize: 12, fontWeight: '600'},
});
