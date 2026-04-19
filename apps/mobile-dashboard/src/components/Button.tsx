import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Animated,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Loader2, type LucideIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { buttonStyles as S } from './Button.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant  = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive';
export type ButtonShape    = 'rounded' | 'pill';
export type ButtonSize     = 'xs' | 'sm' | 'md' | 'lg';
export type ButtonState    = 'default' | 'loading' | 'disabled' | 'pressed';

export interface ButtonProps {
  variant?:          ButtonVariant;
  shape?:            ButtonShape;
  size?:             ButtonSize;
  state?:            ButtonState;
  leadingIcon?:      LucideIcon;
  trailingIcon?:     LucideIcon;
  iconOnly?:         boolean;
  fullWidth?:        boolean;
  onPress?:          () => void;
  children?:         React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?:  string;
  testID?:           string;
}

// ─── Token resolution ─────────────────────────────────────────────────────────

type StateKey = 'default' | 'pressed' | 'disabled' | 'loading';

const containerStyle: Record<ButtonVariant, Record<StateKey, ViewStyle>> = {
  primary:     { default: S.primaryDefault,     pressed: S.primaryPressed,     disabled: S.primaryDisabled,     loading: S.primaryLoading     },
  secondary:   { default: S.secondaryDefault,   pressed: S.secondaryPressed,   disabled: S.secondaryDisabled,   loading: S.secondaryLoading   },
  tertiary:    { default: S.tertiaryDefault,     pressed: S.tertiaryPressed,    disabled: S.tertiaryDisabled,    loading: S.tertiaryLoading    },
  ghost:       { default: S.ghostDefault,        pressed: S.ghostPressed,       disabled: S.ghostDisabled,       loading: S.ghostLoading       },
  destructive: { default: S.destructiveDefault,  pressed: S.destructivePressed, disabled: S.destructiveDisabled, loading: S.destructiveLoading },
};

function getLabelColor(variant: ButtonVariant, stateKey: StateKey): TextStyle {
  if (stateKey === 'disabled') {
    return variant === 'secondary' ? S.labelSecDisabled : S.labelDisabled;
  }
  if (variant === 'primary' || variant === 'destructive') return S.labelWhite;
  if (variant === 'secondary') return S.labelDefault;
  if (variant === 'tertiary' || variant === 'ghost') return S.labelAccentLight;
  return S.labelDefault;
}

function getIconColor(variant: ButtonVariant, stateKey: StateKey): string {
  if (stateKey === 'disabled') return variant === 'secondary' ? '#475569' : '#64748B';
  if (variant === 'primary' || variant === 'destructive') return '#FFFFFF';
  if (variant === 'secondary') return '#F8FAFC';
  return '#60A5FA'; // tertiary + ghost
}

const sizeContainerStyles: Record<ButtonSize, ViewStyle> = {
  xs: S.sizeXs,
  sm: S.sizeSm,
  md: S.sizeMd,
  lg: S.sizeLg,
};

const sizeIconOnlyStyles: Record<ButtonSize, ViewStyle> = {
  xs: S.iconOnlyXs,
  sm: S.iconOnlyXs,   // xs/sm use same small square
  md: S.iconOnlyMd,
  lg: S.iconOnlyMd,
};

const labelSizeStyles: Record<ButtonSize, TextStyle> = {
  xs: S.labelXs,
  sm: S.labelSm,
  md: S.labelMd,
  lg: S.labelLg,
};

const iconSizeMap: Record<ButtonSize, number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
};

const iconOnlySizeMap: Record<ButtonSize, number> = {
  xs: 14,
  sm: 14,
  md: 20,
  lg: 20,
};

// ─── Loading spinner ──────────────────────────────────────────────────────────

function SpinnerIcon({ color, size }: { color: string; size: number }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Loader2 size={size} strokeWidth={2.5} color={color} />
    </Animated.View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Button({
  variant = 'primary',
  shape = 'rounded',
  size = 'md',
  state = 'default',
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  iconOnly = false,
  fullWidth = false,
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {

  const isDisabled = state === 'disabled';
  const isLoading  = state === 'loading';
  const stateKey: StateKey = isDisabled ? 'disabled' : isLoading ? 'loading' : 'default';

  const iconColor   = getIconColor(variant, stateKey);
  const iconSize    = iconOnly ? iconOnlySizeMap[size] : iconSizeMap[size];
  const spinnerSize = iconSize;

  // Shape resolution
  const shapeStyle: ViewStyle = shape === 'pill' ? S.shapePill : (
    iconOnly
      ? (size === 'xs' || size === 'sm' ? S.shapeIconRoundedXs : S.shapeIconRounded)
      : S.shapeRounded
  );

  // Size resolution
  const sizeStyle: ViewStyle = iconOnly ? sizeIconOnlyStyles[size] : sizeContainerStyles[size];

  // Hit slop
  const hitSlop = size === 'xs' ? { top: 10, bottom: 10, left: 10, right: 10 } : (
    size === 'sm' ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined
  );

  function handlePress() {
    if (isDisabled || isLoading) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    }
    onPress?.();
  }

  const containerStyles: ViewStyle[] = [
    S.base,
    sizeStyle,
    shapeStyle,
    containerStyle[variant][stateKey],
    fullWidth ? S.fullWidth : {},
  ];

  const labelStyle: TextStyle[] = [
    labelSizeStyles[size],
    getLabelColor(variant, stateKey),
  ];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled || isLoading}
      activeOpacity={0.85}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
    >
      <View style={containerStyles} pointerEvents={isDisabled ? 'none' : 'auto'}>
        {/* Leading icon or spinner (when loading and iconOnly) */}
        {isLoading && iconOnly ? (
          <SpinnerIcon color={iconColor} size={spinnerSize} />
        ) : isLoading ? (
          <SpinnerIcon color={iconColor} size={spinnerSize} />
        ) : LeadingIcon ? (
          <LeadingIcon size={iconSize} strokeWidth={2} color={iconColor} />
        ) : null}

        {/* Label — hidden in iconOnly */}
        {!iconOnly && children !== undefined && !isLoading && (
          <Text style={labelStyle} numberOfLines={1}>
            {children}
          </Text>
        )}
        {!iconOnly && isLoading && (
          <Text style={labelStyle} numberOfLines={1}>
            Загрузка…
          </Text>
        )}

        {/* Trailing icon */}
        {!iconOnly && !isLoading && TrailingIcon && (
          <TrailingIcon size={iconSize} strokeWidth={2} color={iconColor} />
        )}
      </View>
    </TouchableOpacity>
  );
}
