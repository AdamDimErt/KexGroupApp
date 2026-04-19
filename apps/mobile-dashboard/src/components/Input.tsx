import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  type KeyboardTypeOptions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { AlertCircle, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react-native';
import { inputStyles as S } from './Input.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InputSize  = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'focused' | 'filled' | 'disabled';

export interface InputProps {
  label: string;
  required?: boolean;
  helperText?: string;
  errorText?: string;
  successText?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  size?: InputSize;
  state?: InputState;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  onTrailingIconPress?: () => void;
  showClearButton?: boolean;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  editable?: boolean;
  testID?: string;
}

// ─── Token resolution ─────────────────────────────────────────────────────────

const iconSizeMap: Record<InputSize, number> = { sm: 14, md: 16, lg: 20 };
const sizeRowStyle: Record<InputSize, ViewStyle> = {
  sm: S.sizeSm,
  md: S.sizeMd,
  lg: S.sizeLg,
};
const sizeInputStyle: Record<InputSize, TextStyle> = {
  sm: S.inputSm,
  md: S.inputMd,
  lg: S.inputLg,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Input({
  label,
  required,
  helperText,
  errorText,
  successText,
  value,
  onChangeText,
  placeholder,
  size = 'md',
  state,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  onTrailingIconPress,
  showClearButton,
  keyboardType = 'default',
  secureTextEntry,
  autoCapitalize = 'sentences',
  maxLength,
  editable = true,
  testID,
}: InputProps) {

  const [isFocused, setIsFocused] = useState(false);

  // Resolve effective state
  const isDisabled = editable === false || state === 'disabled';
  const hasError   = !!errorText;
  const hasSuccess = !!successText && !hasError;
  const isFilled   = value.length > 0;

  const effectiveState: InputState = (() => {
    if (isDisabled) return 'disabled';
    if (hasError)   return 'focused'; // border = error, handled separately
    if (isFocused)  return 'focused';
    if (isFilled)   return 'filled';
    return 'default';
  })();

  // Border style
  const borderStyle: ViewStyle = (() => {
    if (isDisabled) return S.borderDisabled;
    if (hasError)   return S.borderError;
    if (hasSuccess) return S.borderSuccess;
    if (isFocused)  return S.borderFocused;
    return S.borderDefault;
  })();

  // Icon color
  const iconColor = (() => {
    if (isDisabled) return '#475569';
    if (hasError)   return '#EF4444';
    if (hasSuccess) return '#22C55E';
    if (isFocused)  return '#60A5FA';
    return '#94A3B8';
  })();

  const iconSize = iconSizeMap[size];

  // Helper text (same vertical position, only color changes)
  const helperContent = errorText ?? successText ?? helperText;
  const helperStyle: TextStyle = hasError ? S.helperError : hasSuccess ? S.helperSuccess : isFocused ? S.helperFocused : S.helperDefault;

  // Clear button: show when filled + focused + no explicit trailing icon
  const showClear = showClearButton && isFilled && isFocused && !TrailingIcon;

  const handleClear = useCallback(() => onChangeText(''), [onChangeText]);

  return (
    <View style={S.field}>
      {/* Label */}
      <Text style={S.label}>
        {label}
        {required && <Text style={S.labelRequired}> *</Text>}
      </Text>

      {/* Input row */}
      <View
        style={[
          S.inputRow,
          sizeRowStyle[size],
          borderStyle,
        ]}
      >
        {/* Leading icon */}
        {LeadingIcon && (
          <LeadingIcon size={iconSize} strokeWidth={1.75} color={iconColor} />
        )}

        {/* TextInput */}
        <TextInput
          style={[
            S.input,
            sizeInputStyle[size],
            isDisabled && S.inputDisabled,
            hasError && S.inputError,
          ]}
          value={value}
          onChangeText={isDisabled ? undefined : onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDisabled ? '#475569' : '#64748B'}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          editable={!isDisabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor="#2563EB"
          cursorColor="#60A5FA"
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={helperText}
          accessibilityState={{ disabled: isDisabled }}
        />

        {/* Clear button */}
        {showClear && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <XCircle size={iconSize} strokeWidth={1.75} color="#64748B" />
          </TouchableOpacity>
        )}

        {/* Trailing icon */}
        {TrailingIcon && !showClear && (
          <TouchableOpacity
            onPress={onTrailingIconPress}
            disabled={!onTrailingIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <TrailingIcon size={iconSize} strokeWidth={1.75} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Helper / error / success — same position, only color + icon change */}
      {helperContent !== undefined && (
        <View style={S.helperRow}>
          {hasError && <AlertCircle size={13} strokeWidth={1.75} color="#F87171" />}
          {hasSuccess && <CheckCircle2 size={13} strokeWidth={1.75} color="#4ADE80" />}
          <Text style={[S.helperDefault, helperStyle]}>{helperContent}</Text>
        </View>
      )}
    </View>
  );
}
