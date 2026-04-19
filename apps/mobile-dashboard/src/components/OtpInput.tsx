import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OtpState = 'empty' | 'partial' | 'error' | 'success';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  state?: OtpState;
  attemptsLeft?: number;
  resendEnabled?: boolean;
  onResend?: () => void;
  phoneHint?: string;
  autoFocus?: boolean;
  testID?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Hidden master TextInput (receives actual input, invisible)
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },

  // OTP row of cells
  row: { flexDirection: 'row', gap: 8 },

  // Individual cell
  cell: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  cellActive: {
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  cellError: {
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  cellSuccess: {
    borderWidth: 2,
    borderColor: '#22C55E',
  },

  // Cell text
  cellText: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'FiraCode-SemiBold',
    color: '#F8FAFC',
  },
  cellTextError:   { color: '#EF4444' },
  cellTextSuccess: { color: '#22C55E' },
  cellDot: {
    fontSize: 16,
    fontWeight: '400',
    color: '#475569',
  },

  // Cursor blink (active cell)
  cursor: {
    width: 2,
    height: 24,
    backgroundColor: '#60A5FA',
    borderRadius: 1,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText: { fontSize: 11, color: '#F87171' },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resendText: { fontSize: 12, fontWeight: '500', color: '#60A5FA' },

  phoneHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    textAlign: 'center',
  },
});

// ─── Blink cursor ─────────────────────────────────────────────────────────────

function BlinkCursor() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.cursor, { opacity }]} />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  state,
  attemptsLeft,
  resendEnabled,
  onResend,
  phoneHint,
  autoFocus,
  testID,
}: OtpInputProps) {

  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Resolve effective state from value length if not forced
  const effectiveState: OtpState = state ?? (
    value.length === 0 ? 'empty' :
    value.length < length ? 'partial' : 'empty'
  );

  // Shake animation on error
  useEffect(() => {
    if (effectiveState === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => null);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -4, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  4, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  4, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue:  0, duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [effectiveState, shakeAnim]);

  // Fire onComplete
  useEffect(() => {
    if (value.length === length) {
      if (effectiveState === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      }
      onComplete?.(value);
    }
  }, [value, length, onComplete, effectiveState]);

  const handleChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
  }, [onChange, length]);

  function focusInput() {
    inputRef.current?.focus();
  }

  // Per-cell style resolution
  function getCellStyle(idx: number) {
    const filled   = idx < value.length;
    const isActive = idx === value.length;
    if (effectiveState === 'error')   return styles.cellError;
    if (effectiveState === 'success') return styles.cellSuccess;
    if (isActive) return styles.cellActive;
    return {};
  }

  function getCellTextStyle() {
    if (effectiveState === 'error')   return styles.cellTextError;
    if (effectiveState === 'success') return styles.cellTextSuccess;
    return {};
  }

  return (
    <View testID={testID}>
      {/* Phone hint */}
      {phoneHint && <Text style={styles.phoneHint}>{phoneHint}</Text>}

      {/* Hidden actual input */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        accessibilityLabel={`Поле ввода OTP, ${length} цифр`}
        accessibilityHint={phoneHint}
      />

      {/* Visible cells */}
      <Animated.View
        style={[styles.row, { transform: [{ translateX: shakeAnim }] }]}
      >
        {Array.from({ length }).map((_, idx) => {
          const digit    = value[idx];
          const isActive = idx === value.length && effectiveState !== 'error' && effectiveState !== 'success';
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.cell, getCellStyle(idx)]}
              onPress={focusInput}
              activeOpacity={0.9}
              accessibilityRole="none"
            >
              {digit ? (
                <Text style={[styles.cellText, getCellTextStyle()]}>{digit}</Text>
              ) : isActive ? (
                <BlinkCursor />
              ) : (
                <Text style={styles.cellDot}>·</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Footer: error + resend */}
      {(effectiveState === 'error' || resendEnabled !== undefined) && (
        <View style={styles.footer}>
          {effectiveState === 'error' ? (
            <View style={styles.errorRow}>
              <AlertCircle size={13} strokeWidth={1.75} color="#F87171" />
              <Text style={styles.errorText}>
                {attemptsLeft !== undefined
                  ? `Неверный код · попытки ${attemptsLeft} из 3`
                  : 'Неверный код'}
              </Text>
            </View>
          ) : (
            <View /> // spacer
          )}
          {resendEnabled !== undefined && (
            <TouchableOpacity
              onPress={onResend}
              disabled={!resendEnabled}
              style={styles.resendBtn}
            >
              <RefreshCw size={13} strokeWidth={1.75} color={resendEnabled ? '#60A5FA' : '#475569'} />
              <Text style={[styles.resendText, !resendEnabled && { color: '#475569' }]}>
                Запросить новый
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
