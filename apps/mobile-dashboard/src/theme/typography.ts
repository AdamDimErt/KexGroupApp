import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography = {
  screenTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
  } as TextStyle,

  cardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  } as TextStyle,

  heading: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.6,
  } as TextStyle,

  body: {
    color: colors.textPrimary,
    fontSize: 14,
  } as TextStyle,

  bodySmall: {
    color: colors.textSecondary,
    fontSize: 13,
  } as TextStyle,

  caption: {
    color: colors.textTertiary,
    fontSize: 12,
  } as TextStyle,

  captionSmall: {
    color: colors.textTertiary,
    fontSize: 11,
  } as TextStyle,

  label: {
    color: colors.textLabel,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,

  kpiValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '500',
  } as TextStyle,

  kpiValueLarge: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: '500',
    letterSpacing: -1.5,
  } as TextStyle,

  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  } as TextStyle,
} as const;
