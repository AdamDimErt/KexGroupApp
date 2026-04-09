import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useDashboardStore } from '../store/dashboard';
import { MonthRangePicker, type MonthYear } from './MonthRangePicker';
import { colors } from '../theme';

type PeriodKey = 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth';

export const PERIOD_OPTIONS: { key: PeriodKey; label: string; heroLabel: string }[] = [
  { key: 'today',     label: 'Сегодня',      heroLabel: 'СЕГОДНЯ'          },
  { key: 'thisWeek',  label: 'Неделя',       heroLabel: 'ЗА НЕДЕЛЮ'       },
  { key: 'thisMonth', label: 'Месяц',        heroLabel: 'ЗА МЕСЯЦ'        },
  { key: 'lastMonth', label: 'Прошлый мес.', heroLabel: 'ЗА ПРОШЛЫЙ МЕС.' },
];

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function formatCustomLabel(customFrom: string | null, customTo: string | null): string {
  if (!customFrom || !customTo) return 'Период';
  const [fy, fm] = customFrom.split('-').map(Number);
  const [ty, tm] = customTo.split('-').map(Number);
  if (!fy || !fm || !ty || !tm) return 'Период';
  const fromLabel = `${MONTHS_SHORT[fm - 1]} ${fy}`;
  const toLabel = `${MONTHS_SHORT[tm - 1]} ${ty}`;
  if (fy === ty && fm === tm) return fromLabel;
  if (fy === ty) return `${MONTHS_SHORT[fm - 1]}–${MONTHS_SHORT[tm - 1]} ${ty}`;
  return `${fromLabel} – ${toLabel}`;
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

  // Parse stored YYYY-MM-DD back to MonthYear for picker initial values
  const parseStored = (iso: string | null): MonthYear | null => {
    if (!iso) return null;
    const parts = iso.split('-').map(Number);
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return { year: parts[0], month: parts[1] };
  };

  const handleApply = (from: MonthYear, to: MonthYear) => {
    // from → first day of the month; to → last day of the month
    const lastDay = new Date(to.year, to.month, 0).getDate();
    const fromStr = `${from.year}-${String(from.month).padStart(2, '0')}-01`;
    const toStr = `${to.year}-${String(to.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
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

      <MonthRangePicker
        visible={pickerVisible}
        initialFrom={parseStored(customFrom)}
        initialTo={parseStored(customTo)}
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
  rowContent: { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  chipCustom: {
    borderStyle: 'dashed',
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    borderStyle: 'solid',
  },
  chipText: { color: colors.textTertiary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#FFF' },
});
