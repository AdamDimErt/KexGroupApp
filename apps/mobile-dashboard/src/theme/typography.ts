import { TextStyle } from 'react-native';

// Typography scale from MASTER.md
// Heading: Fira Code (monospace, technical feel)
// Body: Fira Sans (clean readability)
// Fallback to system fonts until Google Fonts load

export const fontFamilies = {
  heading: 'FiraCode-Bold',       // Fira Code 700
  headingMedium: 'FiraCode-Medium', // Fira Code 500
  body: 'FiraSans-Regular',       // Fira Sans 400
  bodyMedium: 'FiraSans-Medium',  // Fira Sans 500
  bodySemiBold: 'FiraSans-SemiBold', // Fira Sans 600
  bodyBold: 'FiraSans-Bold',      // Fira Sans 700
  mono: 'FiraCode-Regular',       // Fira Code 400 (for numbers/data)
} as const;

// Color-agnostic typography (color applied by theme consumer)
export const typography = {
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
  } as TextStyle,

  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  } as TextStyle,

  heading: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.6,
  } as TextStyle,

  subheading: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  } as TextStyle,

  body: {
    fontSize: 14,
    fontWeight: '400',
  } as TextStyle,

  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
  } as TextStyle,

  caption: {
    fontSize: 12,
    fontWeight: '400',
  } as TextStyle,

  captionSmall: {
    fontSize: 11,
    fontWeight: '400',
  } as TextStyle,

  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,

  kpiValue: {
    fontSize: 28,
    fontWeight: '500',
    letterSpacing: -0.5,
  } as TextStyle,

  kpiValueLarge: {
    fontSize: 36,
    fontWeight: '500',
    letterSpacing: -1.5,
  } as TextStyle,

  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  } as TextStyle,

  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  } as TextStyle,
} as const;
