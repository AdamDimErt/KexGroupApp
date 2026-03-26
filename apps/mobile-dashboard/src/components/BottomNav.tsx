import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';
import type { Screen } from '../types';
import { styles } from './BottomNav.styles';

interface BottomNavProps {
  current: Screen;
  onNavigate: (s: Screen) => void;
  hasAlerts: boolean;
}

const tabs: { id: Screen; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'dashboard', label: 'Главная', icon: 'home' },
  { id: 'points', label: 'Рестораны', icon: 'shopping-bag' },
  { id: 'reports', label: 'Аналитика', icon: 'bar-chart-2' },
  { id: 'notifications', label: 'Уведомления', icon: 'bell' },
];

function isTabActive(current: Screen, tabId: Screen): boolean {
  return current === tabId || (tabId === 'points' && current === 'point-details');
}

export function BottomNav({ current, onNavigate, hasAlerts }: BottomNavProps) {
  return (
    <View style={styles.bar}>
      {tabs.map(tab => {
        const isActive = isTabActive(current, tab.id);
        return (
          <TouchableOpacity key={tab.id} style={styles.tab} onPress={() => onNavigate(tab.id)} activeOpacity={0.7}>
            <View style={[styles.iconPill, isActive && styles.iconPillActive]}>
              <Feather
                name={tab.icon}
                size={18}
                color={isActive ? colors.accentLight : colors.textTertiary}
              />
              {tab.id === 'notifications' && hasAlerts && (
                <View style={styles.badge} />
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            {isActive && <View style={styles.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
