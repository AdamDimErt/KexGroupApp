import { StyleSheet } from 'react-native';
import { colors } from '../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  logoWrap: { alignItems: 'center', marginTop: 80 },
  logoBox: {
    width: 52, height: 52,
    borderRadius: 14,
    backgroundColor: colors.accentDefault,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentDefault,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },
  logoLetter: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  logoTitle: {
    color: colors.textPrimary, fontSize: 20, fontWeight: '700',
    letterSpacing: -0.6, marginTop: 16,
  },
  logoSub: { color: colors.textTertiary, fontSize: 13, marginTop: 5, textAlign: 'center' },
  formWrap: { width: '100%', maxWidth: 330, marginTop: 52 },
  label: {
    color: colors.textLabel, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  },
  phoneContainer: {
    backgroundColor: 'rgba(59,130,246,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.18)',
    borderRadius: 14,
    width: '100%',
    height: 54,
  },
  flagContainer: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 14,
  },
  phoneDivider: {
    backgroundColor: 'rgba(59,130,246,0.18)',
    width: 1,
  },
  phoneInput: {
    color: '#EFF6FF',
    fontSize: 16,
  },
  callingCode: {
    color: 'rgba(239,246,255,0.6)',
    fontSize: 16,
    marginLeft: 6,
  },
  errorText: {
    color: '#EF4444', fontSize: 13, marginTop: 8, marginBottom: 4,
  },
  btn: {
    width: '100%', padding: 16, borderRadius: 14,
    backgroundColor: colors.accentDefault,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 14,
    shadowColor: colors.accentDefault,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 28, elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  otpHint: { color: colors.textSecondary, fontSize: 13, marginBottom: 20 },
  codeRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  codeBox: {
    flex: 1, height: 58,
    backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.14)',
    borderRadius: 14, color: colors.textPrimary,
    fontSize: 20, fontWeight: '600', textAlign: 'center',
  },
  backLink: { color: colors.textLabel, fontSize: 13, marginBottom: 14 },
  resendTimer: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 14,
  },
  resendLink: {
    color: colors.accentDefault,
    fontSize: 13,
    marginBottom: 14,
  },
  footer: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 32 },
});

export const phoneModalStyles = {
  content: {
    backgroundColor: '#0D1826',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  searchInput: {
    color: colors.textPrimary,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderColor: 'rgba(59,130,246,0.18)',
    borderRadius: 12,
  },
  countryItem: {
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderColor: 'rgba(59,130,246,0.12)',
    borderRadius: 10,
  },
  countryName: { color: colors.textPrimary },
  callingCode: { color: colors.textSecondary },
  sectionTitle: { color: colors.textLabel },
  alphabetLetterText: { color: colors.textSecondary },
};
