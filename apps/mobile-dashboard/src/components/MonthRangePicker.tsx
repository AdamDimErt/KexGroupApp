import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MonthYear { year: number; month: number /* 1–12 */ }

interface Props {
  visible: boolean;
  initialFrom?: MonthYear | null;
  initialTo?: MonthYear | null;
  onApply: (from: MonthYear, to: MonthYear) => void;
  onClose: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function toIdx(my: MonthYear) { return my.year * 12 + (my.month - 1); }
function gtOrEq(a: MonthYear, b: MonthYear) { return toIdx(a) >= toIdx(b); }

// ─── MonthRangePicker ──────────────────────────────────────────────────────

export function MonthRangePicker({ visible, initialFrom, initialTo, onApply, onClose }: Props) {
  const today: MonthYear = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };

  const [year, setYear] = useState(initialFrom?.year ?? today.year);
  const [from, setFrom] = useState<MonthYear | null>(initialFrom ?? null);
  const [to, setTo] = useState<MonthYear | null>(initialTo ?? null);
  // step: 'from' = picking start, 'to' = picking end
  const [step, setStep] = useState<'from' | 'to'>('from');

  const handleMonthTap = (month: number) => {
    const tapped: MonthYear = { year, month };
    if (step === 'from') {
      setFrom(tapped);
      setTo(null);
      setStep('to');
    } else {
      // If tapped earlier than from, swap
      if (from && toIdx(tapped) < toIdx(from)) {
        setTo(from);
        setFrom(tapped);
      } else {
        setTo(tapped);
      }
      setStep('from');
    }
  };

  const handleApply = () => {
    if (!from || !to) return;
    onApply(from, to);
  };

  const isDisabled = (month: number) => toIdx({ year, month }) > toIdx(today);

  type CellState = 'from' | 'to' | 'inRange' | 'fromTo' | 'none';
  const cellState = (month: number): CellState => {
    const idx = toIdx({ year, month });
    const fromIdx = from ? toIdx(from) : null;
    const toIdx_ = to ? toIdx(to) : null;
    if (fromIdx !== null && toIdx_ !== null) {
      if (idx === fromIdx && idx === toIdx_) return 'fromTo';
      if (idx === fromIdx) return 'from';
      if (idx === toIdx_) return 'to';
      if (idx > fromIdx && idx < toIdx_) return 'inRange';
    } else if (fromIdx !== null && idx === fromIdx) {
      return 'from';
    }
    return 'none';
  };

  const canApply = from !== null && to !== null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <SafeAreaView style={s.sheet}>
            {/* Handle */}
            <View style={s.handle} />

            {/* Header */}
            <View style={s.header}>
              <Text style={s.title}>Выбрать период</Text>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={12}>
                <Text style={s.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Step indicator */}
            <View style={s.stepRow}>
              <TouchableOpacity
                onPress={() => setStep('from')}
                style={[s.stepPill, step === 'from' && s.stepPillActive]}
              >
                <Text style={s.stepLabel}>С</Text>
                <Text style={[s.stepValue, !from && s.stepValueEmpty]}>
                  {from ? `${MONTHS[from.month - 1]} ${from.year}` : 'выберите'}
                </Text>
              </TouchableOpacity>

              <View style={s.stepArrow}>
                <Text style={s.stepArrowText}>→</Text>
              </View>

              <TouchableOpacity
                onPress={() => from && setStep('to')}
                style={[s.stepPill, step === 'to' && s.stepPillActive]}
              >
                <Text style={s.stepLabel}>По</Text>
                <Text style={[s.stepValue, !to && s.stepValueEmpty]}>
                  {to ? `${MONTHS[to.month - 1]} ${to.year}` : 'выберите'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Year navigation */}
            <View style={s.yearRow}>
              <TouchableOpacity
                onPress={() => setYear(y => y - 1)}
                style={s.yearBtn}
                hitSlop={12}
              >
                <Text style={s.yearArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={s.yearText}>{year}</Text>
              <TouchableOpacity
                onPress={() => year < today.year && setYear(y => y + 1)}
                style={[s.yearBtn, year >= today.year && s.yearBtnDisabled]}
                hitSlop={12}
                disabled={year >= today.year}
              >
                <Text style={[s.yearArrow, year >= today.year && s.yearArrowDisabled]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Month grid */}
            <View style={s.grid}>
              {MONTHS.map((name, idx) => {
                const month = idx + 1;
                const state = cellState(month);
                const disabled = isDisabled(month);
                const isEdge = state === 'from' || state === 'to' || state === 'fromTo';
                const isIn = state === 'inRange';

                return (
                  <TouchableOpacity
                    key={month}
                    onPress={() => !disabled && handleMonthTap(month)}
                    activeOpacity={disabled ? 1 : 0.75}
                    style={[s.cellWrap, isIn && s.cellWrapRange]}
                    disabled={disabled}
                  >
                    {isEdge ? (
                      <LinearGradient
                        colors={['#3B82F6', '#2563EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.cellGradient}
                      >
                        <Text style={s.cellTextActive}>{name}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[s.cell, disabled && s.cellDisabled]}>
                        <Text style={[
                          s.cellText,
                          isIn && s.cellTextRange,
                          disabled && s.cellTextDisabled,
                        ]}>
                          {name}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Hint */}
            <Text style={s.hint}>
              {step === 'from' ? 'Выберите начальный месяц' : 'Выберите конечный месяц'}
            </Text>

            {/* Apply */}
            <View style={s.footer}>
              {canApply ? (
                <TouchableOpacity onPress={handleApply} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.applyBtn}
                  >
                    <Text style={s.applyText}>Применить</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={s.applyBtnDisabled}>
                  <Text style={s.applyTextDisabled}>Выберите период</Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const CELL_SIZE = 72;

const s = StyleSheet.create({
  // Modal structure
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  closeBtn: { padding: 4 },
  closeText: { color: colors.textTertiary, fontSize: 18 },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  stepPill: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  stepPillActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(37,99,235,0.10)',
  },
  stepLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stepValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  stepValueEmpty: { color: colors.textTertiary, fontWeight: '400' },
  stepArrow: { paddingHorizontal: 4 },
  stepArrowText: { color: colors.textTertiary, fontSize: 16 },

  // Year navigation
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 4,
    gap: 28,
  },
  yearBtn: { padding: 8 },
  yearBtnDisabled: { opacity: 0.25 },
  yearArrow: { color: colors.textPrimary, fontSize: 28, fontWeight: '200' },
  yearArrowDisabled: { color: colors.textTertiary },
  yearText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    minWidth: 60,
    textAlign: 'center',
  },

  // Month grid (3 columns)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 8,
    rowGap: 8,
  },
  cellWrap: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cellWrapRange: {
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  cell: {
    width: CELL_SIZE,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  cellGradient: {
    width: CELL_SIZE,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDisabled: {
    opacity: 0.2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  cellText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  cellTextActive: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cellTextRange: {
    color: colors.accentLight,
    fontWeight: '600',
  },
  cellTextDisabled: { color: colors.textTertiary },

  // Hint
  hint: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 12,
    marginBottom: 4,
  },

  // Footer
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  applyBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyText: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  applyBtnDisabled: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applyTextDisabled: { color: colors.textTertiary, fontSize: 15, fontWeight: '500' },
});
