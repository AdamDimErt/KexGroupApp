import React from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Sun, Moon } from 'lucide-react-native';
import { colors, useThemeStore } from '../theme';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';

interface ProfileScreenProps {
  onBack: () => void;
}

interface NotifRowDef {
  type: string;
  title: string;
  description: string;
}

const NOTIF_ROWS: NotifRowDef[] = [
  {
    type: 'SYNC_FAILURE',
    title: 'Ошибки синхронизации',
    description: 'Уведомление когда синхронизация не работает > 1 часа',
  },
  {
    type: 'LOW_REVENUE',
    title: 'Низкая выручка',
    description: 'Выручка точки < 70% от среднего за 30 дней',
  },
  {
    type: 'LARGE_EXPENSE',
    title: 'Крупные расходы',
    description: 'Расход превышает пороговое значение',
  },
];

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { prefs, loading, toggle } = useNotificationPrefs();
  const { isDark, toggle: toggleTheme } = useThemeStore();

  const isEnabled = (type: string): boolean => {
    const pref = prefs.find(p => p.type === type);
    // opt-out model: no row = enabled
    return pref !== undefined ? pref.enabled : true;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Уведомления</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>НАСТРОЙКИ УВЕДОМЛЕНИЙ</Text>

          <View style={styles.card}>
            {NOTIF_ROWS.map((row, index) => (
              <View key={row.type}>
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowDesc}>{row.description}</Text>
                  </View>
                  <Switch
                    value={isEnabled(row.type)}
                    onValueChange={(val) => void toggle(row.type, val)}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor={colors.white}
                    ios_backgroundColor={colors.border}
                  />
                </View>
                {index < NOTIF_ROWS.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>ВНЕШНИЙ ВИД</Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Тёмная тема</Text>
                <Text style={styles.rowDesc}>
                  {isDark ? 'Включена — экономит заряд на OLED' : 'Выключена — светлый режим'}
                </Text>
              </View>
              <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ padding: 4 }}>
                {isDark ? (
                  <Moon size={22} color={colors.accent} />
                ) : (
                  <Sun size={22} color={colors.accent} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footnote}>
            Отключённые уведомления не будут приходить на ваше устройство.
            Настройки применяются для всех устройств аккаунта.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  footnote: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 16,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
