import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  isOffline: boolean;
  isStale: boolean;
  cachedAt: number | null;
}

export function OfflineBanner({ isOffline, isStale, cachedAt }: Props) {
  if (!isOffline && !isStale) return null;

  const timeStr = cachedAt
    ? new Date(cachedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const bgColor = isOffline ? '#7F1D1D' : '#78350F';
  const message = isOffline
    ? `Нет соединения, данные от ${timeStr}`
    : `Данные устарели (от ${timeStr})`;

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    color: '#FCA5A5',
    fontWeight: '500',
  },
});
