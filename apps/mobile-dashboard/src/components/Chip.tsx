import React from 'react';
import { TouchableOpacity, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { X, type LucideIcon } from 'lucide-react-native';
import { chipStyles as S } from './Chip.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChipSize  = 'sm' | 'md' | 'lg';
export type ChipState = 'default' | 'active' | 'pressed' | 'focused' | 'disabled';

export interface ChipProps {
  label: string;
  variant?: 'filter';
  size?: ChipSize;
  state?: ChipState;
  leadingIcon?: LucideIcon;
  removable?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  testID?: string;
}

// ─── Token resolution ─────────────────────────────────────────────────────────

const sizeContainerMap: Record<ChipSize, ViewStyle> = {
  sm: S.sizeSm,
  md: S.sizeMd,
  lg: S.sizeLg,
};

const stateBgMap: Record<ChipState, ViewStyle> = {
  default:  S.stateDefault,
  active:   S.stateActive,
  pressed:  S.statePressed,
  focused:  S.stateDefault,   // bg same as default — focus ring is border (web-only on RN)
  disabled: S.stateDisabled,
};

const stateLabelMap: Record<ChipState, TextStyle> = {
  default:  S.labelDefault,
  active:   S.labelActive,
  pressed:  S.labelActive,
  focused:  S.labelDefault,
  disabled: S.labelDisabled,
};

const labelSizeMap: Record<ChipSize, TextStyle> = {
  sm: S.labelSm,
  md: S.labelMd,
  lg: S.labelLg,
};

const iconSizeMap: Record<ChipSize, number> = { sm: 12, md: 14, lg: 16 };

function getIconColor(state: ChipState): string {
  if (state === 'active' || state === 'pressed') return '#FFFFFF';
  if (state === 'disabled') return '#475569';
  return '#94A3B8';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Chip({
  label,
  size = 'md',
  state = 'default',
  leadingIcon: LeadingIcon,
  removable,
  onPress,
  onRemove,
  testID,
}: ChipProps) {

  const isDisabled = state === 'disabled';
  const iconColor  = getIconColor(state);
  const iconSize   = iconSizeMap[size];

  const hitSlop = size === 'sm' ? { top: 4, bottom: 4, left: 4, right: 4 } : undefined;

  return (
    <TouchableOpacity
      style={[S.chip, sizeContainerMap[size], stateBgMap[state]]}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: state === 'active', disabled: isDisabled }}
      accessibilityLabel={label}
    >
      {/* Leading icon */}
      {LeadingIcon && (
        <LeadingIcon size={iconSize} strokeWidth={1.75} color={iconColor} />
      )}

      {/* Label */}
      <Text style={[labelSizeMap[size], stateLabelMap[state]]} numberOfLines={1}>
        {label}
      </Text>

      {/* Remove button — only when removable + active */}
      {removable && (state === 'active' || state === 'pressed') && (
        <TouchableOpacity
          style={S.removeBtn}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          accessibilityLabel={`Удалить фильтр ${label}`}
        >
          <X size={12} strokeWidth={2} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
