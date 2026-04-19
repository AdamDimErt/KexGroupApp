import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Home, Store, BarChart3, Bell, type LucideIcon } from 'lucide-react-native';
import { colors } from '../theme';
import type { Screen } from '../types';
import { styles } from './BottomNav.styles';

interface BottomNavProps {
  current: Screen;
  onNavigate: (screen: Screen) => void;
  hasAlerts: boolean;
}

const tabs: { id: Screen; label: string; Icon: LucideIcon }[] = [
  { id: 'dashboard',     label: 'Главная',      Icon: Home },
  { id: 'points',        label: 'Рестораны',    Icon: Store },
  { id: 'reports',       label: 'Аналитика',    Icon: BarChart3 },
  { id: 'notifications', label: 'Уведомления',  Icon: Bell },
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
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onNavigate(tab.id)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <View style={[styles.iconPill, isActive && styles.iconPillActive]}>
              <tab.Icon
                size={22}
                strokeWidth={2}
                color={isActive ? colors.accentLight : colors.textTertiary}
              />
              {tab.id === 'notifications' && hasAlerts && (
                <View style={styles.badge} />
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
