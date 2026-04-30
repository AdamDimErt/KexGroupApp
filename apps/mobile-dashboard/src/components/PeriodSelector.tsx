import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useDashboardStore } from '../store/dashboard';
import { DayRangePicker } from './DayRangePicker';
import { colors } from '../theme';

type PeriodKey = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth';

export const PERIOD_OPTIONS: { key: PeriodKey; label: string; heroLabel: string }[] = [
  { key: 'today',     label: 'Сегодня',      heroLabel: 'СЕГОДНЯ'          },
  { key: 'yesterday', label: 'Вчера',        heroLabel: 'ЗА ВЧЕРА'         },
  { key: 'thisWeek',  label: 'Неделя',       heroLabel: 'ЗА НЕДЕЛЮ'       },
  { key: 'thisMonth', label: 'Месяц',        heroLabel: 'ЗА МЕСЯЦ'        },
  { key: 'lastMonth', label: 'Прошлый мес.', heroLabel: 'ЗА ПРОШЛЫЙ МЕС.' },
];

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function formatCustomLabel(customFrom: string | null, customTo: string | null): string {
  if (!customFrom || !customTo) return 'Период';
  const [fy, fm, fd] = customFrom.split('-').map(Number);
  const [ty, tm, td] = customTo.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 'Период';
  const sameDay = fy === ty && fm === tm && fd === td;
  if (sameDay) return `${fd} ${MONTHS_SHORT[fm - 1]} ${fy}`;
  if (fy === ty && fm === tm) return `${fd}–${td} ${MONTHS_SHORT[fm - 1]} ${fy}`;
  if (fy === ty) return `${fd} ${MONTHS_SHORT[fm - 1]} – ${td} ${MONTHS_SHORT[tm - 1]} ${fy}`;
  return `${fd} ${MONTHS_SHORT[fm - 1]} ${fy} – ${td} ${MONTHS_SHORT[tm - 1]} ${ty}`;
}

interface Props {
  /** Extra margin on top (default 12) */
  marginTop?: number;
}

export function PeriodSelector({ marginTop = 12 }: Props) {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  const setPeriod = useDashboardStore(s => s.setPeriod);
  const setCustomPeriod = useDashboardStore(s => s.setCustomPeriod);

  const [pickerVisible, setPickerVisible] = useState(false);

  const customLabel = formatCustomLabel(customFrom, customTo);

  const handleApply = (fromStr: string, toStr: string) => {
    setCustomPeriod(fromStr, toStr);
    setPickerVisible(false);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.row, { marginTop }]}
        contentContainerStyle={styles.rowContent}
      >
        {PERIOD_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setPeriod(opt.key)}
            style={[styles.chip, period === opt.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, period === opt.key && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Custom period chip */}
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={[styles.chip, styles.chipCustom, period === 'custom' && styles.chipActive]}
        >
          <Text style={[styles.chipText, period === 'custom' && styles.chipTextActive]}>
            {period === 'custom' ? customLabel : 'Период'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <DayRangePicker
        visible={pickerVisible}
        initialFrom={customFrom}
        initialTo={customTo}
        onApply={handleApply}
        onClose={() => setPickerVisible(false)}
      />
    </>
  );
}

/** Returns the hero label string for the current period (e.g. "ВЫРУЧКА ЗА МЕСЯЦ") */
export function usePeriodHeroLabel(prefix = 'ВЫРУЧКА'): string {
  const period = useDashboardStore(s => s.period);
  const customFrom = useDashboardStore(s => s.customFrom);
  const customTo = useDashboardStore(s => s.customTo);
  if (period === 'custom') {
    const label = formatCustomLabel(customFrom, customTo);
    return `${prefix} ${label.toUpperCase()}`;
  }
  const opt = PERIOD_OPTIONS.find(p => p.key === period) ?? PERIOD_OPTIONS[0];
  return `${prefix} ${opt.heroLabel}`;
}

const styles = StyleSheet.create({
  row: {},
  rowContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
    backgroundColor: colors.bgCard,
  },
  chipCustom: {
    borderStyle: 'dashed',
  },
  chipActive: {
    borderColor: colors.accentDefault,
    backgroundColor: colors.accentDefault,
    borderStyle: 'solid',
  },
  chipText: { color: colors.textTertiary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#FFF' },
});
