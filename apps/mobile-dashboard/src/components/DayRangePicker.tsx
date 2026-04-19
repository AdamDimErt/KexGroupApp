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

export interface DayDate { year: number; month: number /* 1-12 */; day: number }

interface Props {
  visible: boolean;
  /** YYYY-MM-DD or null */
  initialFrom?: string | null;
  initialTo?: string | null;
  /** Returns YYYY-MM-DD strings */
  onApply: (from: string, to: string) => void;
  onClose: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MONTHS_FULL = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function pad2(n: number) { return String(n).padStart(2, '0'); }
function toISO(d: DayDate) { return `${d.year}-${pad2(d.month)}-${pad2(d.day)}`; }
function fromISO(iso: string | null | undefined): DayDate | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}
function toIdx(d: DayDate) { return d.year * 10000 + d.month * 100 + d.day; }
function daysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate(); }
/** 0=Mon..6=Sun */
function firstWeekdayMon(year: number, month: number) {
  const js = new Date(year, month - 1, 1).getDay(); // 0=Sun..6=Sat
  return js === 0 ? 6 : js - 1;
}

// ─── DayRangePicker ────────────────────────────────────────────────────────

export function DayRangePicker({ visible, initialFrom, initialTo, onApply, onClose }: Props) {
  const todayJs = new Date();
  const today: DayDate = {
    year: todayJs.getFullYear(),
    month: todayJs.getMonth() + 1,
    day: todayJs.getDate(),
  };

  const initFrom = fromISO(initialFrom);
  const [year, setYear] = useState(initFrom?.year ?? today.year);
  const [month, setMonth] = useState(initFrom?.month ?? today.month);
  const [from, setFrom] = useState<DayDate | null>(initFrom);
  const [to, setTo] = useState<DayDate | null>(fromISO(initialTo));
  const [step, setStep] = useState<'from' | 'to'>(initFrom ? 'to' : 'from');

  const handleDayTap = (day: number) => {
    const tapped: DayDate = { year, month, day };
    if (toIdx(tapped) > toIdx(today)) return;
    if (step === 'from') {
      setFrom(tapped);
      setTo(null);
      setStep('to');
    } else {
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
    onApply(toISO(from), toISO(to));
  };

  const handlePrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    if (next.y * 100 + next.m > today.year * 100 + today.month) return;
    if (next.m === 1) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  type CellState = 'from' | 'to' | 'inRange' | 'fromTo' | 'none';
  const cellState = (day: number): CellState => {
    const cur: DayDate = { year, month, day };
    const ci = toIdx(cur);
    const fi = from ? toIdx(from) : null;
    const ti = to ? toIdx(to) : null;
    if (fi !== null && ti !== null) {
      if (ci === fi && ci === ti) return 'fromTo';
      if (ci === fi) return 'from';
      if (ci === ti) return 'to';
      if (ci > fi && ci < ti) return 'inRange';
    } else if (fi !== null && ci === fi) {
      return 'from';
    }
    return 'none';
  };

  const isFutureDay = (day: number) => toIdx({ year, month, day }) > toIdx(today);
  const canApply = from !== null && to !== null;
  const dim = daysInMonth(year, month);
  const offset = firstWeekdayMon(year, month);
  // Build cells: leading blanks + days
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < offset; i++) cells.push({ day: null });
  for (let d = 1; d <= dim; d++) cells.push({ day: d });

  const isAtCurrentMonth = year === today.year && month === today.month;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <SafeAreaView style={s.sheet}>
            <View style={s.handle} />

            <View style={s.header}>
              <Text style={s.title}>Выбрать дни</Text>
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
                  {from ? `${from.day} ${MONTHS_FULL[from.month - 1].slice(0, 3).toLowerCase()} ${from.year}` : 'выберите'}
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
                  {to ? `${to.day} ${MONTHS_FULL[to.month - 1].slice(0, 3).toLowerCase()} ${to.year}` : 'выберите'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Month navigation */}
            <View style={s.monthRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={s.monthBtn} hitSlop={12}>
                <Text style={s.monthArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={s.monthText}>{MONTHS_FULL[month - 1]} {year}</Text>
              <TouchableOpacity
                onPress={handleNextMonth}
                style={[s.monthBtn, isAtCurrentMonth && s.monthBtnDisabled]}
                hitSlop={12}
                disabled={isAtCurrentMonth}
              >
                <Text style={[s.monthArrow, isAtCurrentMonth && s.monthArrowDisabled]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday header */}
            <View style={s.weekRow}>
              {WEEKDAYS.map(w => (
                <Text key={w} style={s.weekDay}>{w}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={s.grid}>
              {cells.map((cell, i) => {
                if (cell.day === null) return <View key={`b${i}`} style={s.dayWrap} />;
                const day = cell.day;
                const state = cellState(day);
                const disabled = isFutureDay(day);
                const isEdge = state === 'from' || state === 'to' || state === 'fromTo';
                const isIn = state === 'inRange';
                return (
                  <TouchableOpacity
                    key={`d${day}`}
                    onPress={() => !disabled && handleDayTap(day)}
                    activeOpacity={disabled ? 1 : 0.75}
                    style={[s.dayWrap, isIn && s.dayWrapRange]}
                    disabled={disabled}
                  >
                    {isEdge ? (
                      <LinearGradient
                        colors={['#3B82F6', '#2563EB']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.dayCell}
                      >
                        <Text style={s.dayTextActive}>{day}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[s.dayCell, disabled && s.dayCellDisabled]}>
                        <Text style={[
                          s.dayText,
                          isIn && s.dayTextRange,
                          disabled && s.dayTextDisabled,
                        ]}>
                          {day}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.hint}>
              {step === 'from' ? 'Выберите начальный день' : 'Выберите конечный день'}
            </Text>

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

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4,
  },
  title: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  closeBtn: { padding: 4 },
  closeText: { color: colors.textTertiary, fontSize: 18 },

  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 16, gap: 8 },
  stepPill: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: colors.borderColor,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  stepPillActive: { borderColor: colors.accentDefault, backgroundColor: 'rgba(37,99,235,0.10)' },
  stepLabel: {
    color: colors.textTertiary, fontSize: 10, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2,
  },
  stepValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  stepValueEmpty: { color: colors.textTertiary, fontWeight: '400' },
  stepArrow: { paddingHorizontal: 4 },
  stepArrowText: { color: colors.textTertiary, fontSize: 16 },

  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, marginBottom: 4, gap: 24,
  },
  monthBtn: { padding: 8 },
  monthBtnDisabled: { opacity: 0.25 },
  monthArrow: { color: colors.textPrimary, fontSize: 28, fontWeight: '200' },
  monthArrowDisabled: { color: colors.textTertiary },
  monthText: {
    color: colors.textPrimary, fontSize: 17, fontWeight: '700',
    minWidth: 160, textAlign: 'center',
  },

  weekRow: {
    flexDirection: 'row', paddingHorizontal: 16, marginTop: 8,
  },
  weekDay: {
    flex: 1, textAlign: 'center', color: colors.textTertiary,
    fontSize: 11, fontWeight: '600', textTransform: 'uppercase',
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, marginTop: 6, rowGap: 4,
  },
  dayWrap: {
    width: `${100 / 7}%` as `${number}%`,
    alignItems: 'center', paddingVertical: 3,
  },
  dayWrapRange: { backgroundColor: 'rgba(37,99,235,0.08)' },
  dayCell: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCellDisabled: { opacity: 0.25 },
  dayText: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  dayTextActive: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  dayTextRange: { color: colors.accentLight, fontWeight: '600' },
  dayTextDisabled: { color: colors.textTertiary },

  hint: {
    textAlign: 'center', color: colors.textTertiary,
    fontSize: 12, marginTop: 12, marginBottom: 4,
  },

  footer: { paddingHorizontal: 20, paddingTop: 12 },
  applyBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  applyText: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  applyBtnDisabled: {
    borderRadius: 16, paddingVertical: 15, alignItems: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderColor,
  },
  applyTextDisabled: { color: colors.textTertiary, fontSize: 15, fontWeight: '500' },
});
