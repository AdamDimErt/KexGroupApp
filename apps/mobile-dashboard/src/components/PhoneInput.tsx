import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { AlertCircle } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhoneInputState = 'default' | 'focused' | 'error';

export interface PhoneInputProps {
  label: string;
  value: string;                         // raw digits only (without +7)
  onChangeText: (value: string, isValid: boolean) => void;
  mask?: 'A' | 'B';                      // A: "(7NN) NNN-NN-NN" | B: "7NN NNN NN NN"
  defaultCountry?: 'KZ';
  state?: PhoneInputState;
  errorText?: string;
  helperText?: string;
  disabled?: boolean;
  testID?: string;
}

// ─── Mask formatting ──────────────────────────────────────────────────────────

function applyMask(digits: string, mask: 'A' | 'B'): string {
  // digits = up to 10 chars (local KZ digits after +7)
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (mask === 'A') {
    // (7NN) NNN-NN-NN
    if (d.length === 0) return '';
    let r = '(' + d.slice(0, 3);
    if (d.length >= 3) r += ') ';
    r += d.slice(3, 6);
    if (d.length >= 6) r += '-';
    r += d.slice(6, 8);
    if (d.length >= 8) r += '-';
    r += d.slice(8, 10);
    return r;
  } else {
    // 7NN NNN NN NN
    let r = d.slice(0, 3);
    if (d.length >= 3) r += ' ';
    r += d.slice(3, 6);
    if (d.length >= 6) r += ' ';
    r += d.slice(6, 8);
    if (d.length >= 8) r += ' ';
    r += d.slice(8, 10);
    return r;
  }
}

function isKzValid(digits: string): boolean {
  const d = digits.replace(/\D/g, '');
  return d.length === 10;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  field:   { gap: 6, marginBottom: 14 },
  label:   { fontSize: 12, fontWeight: '500', color: '#94A3B8' },

  container: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  borderDefault:  { borderColor: '#334155' },
  borderFocused:  { borderColor: '#2563EB', borderWidth: 2 },
  borderError:    { borderColor: '#EF4444', borderWidth: 2 },

  // Prefix box: "+7" static
  prefixBox: {
    width: 52,
    height: '100%',
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'FiraCode-Medium',
    color: '#94A3B8',
  },

  // Divider line (1px vertical, NOT a pipe char)
  divider: {
    width: 1,
    height: '60%',         // 60% of container height per spec
    backgroundColor: '#334155',
  },

  // Digits input
  digitsInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'FiraCode-Medium',
    letterSpacing: 0.3,
    color: '#F8FAFC',
    padding: 0,
  },
  digitsDisabled: { color: '#475569' },
  digitsError:    { color: '#F87171' },

  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  helperDefault: { fontSize: 11, color: '#94A3B8' },
  helperFocused: { color: '#60A5FA' },
  helperError:   { color: '#F87171' },
});

// ─── Component ────────────────────────────────────────────────────────────────

export function PhoneInput({
  label,
  value,
  onChangeText,
  mask = 'A',
  state,
  errorText,
  helperText,
  disabled = false,
  testID,
}: PhoneInputProps) {

  const [isFocused, setIsFocused] = useState(false);

  const hasError  = !!errorText;
  const effective = disabled ? 'default' : hasError ? 'error' : isFocused ? 'focused' : (state ?? 'default');

  const borderStyle = effective === 'focused'
    ? styles.borderFocused
    : effective === 'error'
      ? styles.borderError
      : styles.borderDefault;

  const helperContent = errorText ?? helperText;
  const helperTextStyle = hasError ? styles.helperError : isFocused ? styles.helperFocused : styles.helperDefault;

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    onChangeText(digits, isKzValid(digits));
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.container, borderStyle]}>
        {/* "+7" prefix — static, not editable */}
        <View style={styles.prefixBox}>
          <Text style={styles.prefixText}>+7</Text>
        </View>

        {/* Vertical 1px divider (NOT a pipe char) */}
        <View style={styles.divider} />

        {/* Digits */}
        <TextInput
          style={[
            styles.digitsInput,
            disabled && styles.digitsDisabled,
            hasError && styles.digitsError,
          ]}
          value={applyMask(value, mask)}
          onChangeText={handleChange}
          placeholder={mask === 'A' ? '(7NN) NNN-NN-NN' : '7NN NNN NN NN'}
          placeholderTextColor={disabled ? '#475569' : '#64748B'}
          keyboardType="phone-pad"
          maxLength={mask === 'A' ? 15 : 14} // masked length
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor="#2563EB"
          cursorColor="#60A5FA"
          testID={testID}
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
        />
      </View>

      {helperContent !== undefined && (
        <View style={styles.helperRow}>
          {hasError && <AlertCircle size={13} strokeWidth={1.75} color="#F87171" />}
          <Text style={[styles.helperDefault, helperTextStyle]}>{helperContent}</Text>
        </View>
      )}
    </View>
  );
}
