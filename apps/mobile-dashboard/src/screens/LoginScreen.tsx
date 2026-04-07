import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import PhoneInput from 'react-native-international-phone-number';
import { colors } from '../theme';
import { useLogin } from '../hooks/useLogin';
import { styles, phoneModalStyles } from './LoginScreen.styles';
import type { User } from '../types';

interface LoginScreenProps {
  onLogin: (accessToken: string, refreshToken: string, user: User) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const {
    step, phoneValue, setPhoneValue, selectedCountry, setSelectedCountry,
    code, loading, error, devHint, codeRefs, rawPhone, isPhoneReady,
    handlePhoneSubmit, submitCode, handleCodeChange, handleKeyPress, goBackToPhone,
    resendTimer, handleResend,
  } = useLogin(onLogin);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Логотип */}
      <View style={styles.logoWrap}>
        <View style={styles.logoBox}>
          <Text style={styles.logoLetter}>H</Text>
        </View>
        <Text style={styles.logoTitle}>HoldingView</Text>
        <Text style={styles.logoSub}>Весь холдинг — одним взглядом</Text>
      </View>

      <View style={styles.formWrap}>
        {step === 'phone' ? (
          <>
            <Text style={styles.label}>НОМЕР ТЕЛЕФОНА</Text>

            <PhoneInput
              value={phoneValue}
              onChangePhoneNumber={setPhoneValue}
              selectedCountry={selectedCountry}
              onChangeSelectedCountry={setSelectedCountry}
              defaultCountry="KZ"
              placeholder="700 000 00 00"
              placeholderTextColor={colors.textTertiary}
              theme="dark"
              phoneInputStyles={{
                container: styles.phoneContainer,
                flagContainer: styles.flagContainer,
                input: styles.phoneInput,
                callingCode: styles.callingCode,
                divider: styles.phoneDivider,
              }}
              modalStyles={phoneModalStyles}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.btn, (loading || !isPhoneReady) && styles.btnDisabled]}
              onPress={handlePhoneSubmit}
              disabled={loading || !isPhoneReady}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.btnText}>Отправляем код...</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Получить код</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>КОД ИЗ SMS</Text>
            <Text style={styles.otpHint}>Отправили на {rawPhone}</Text>
            {devHint && <Text style={[styles.otpHint, { color: '#4CAF50', marginTop: 4 }]}>{devHint}</Text>}

            <View style={styles.codeRow}>
              {code.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={ref => { codeRefs.current[idx] = ref; }}
                  style={styles.codeBox}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={val => handleCodeChange(idx, val)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(idx, nativeEvent.key)}
                  selectTextOnFocus
                />
              ))}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity onPress={goBackToPhone}>
              <Text style={styles.backLink}>← Изменить номер</Text>
            </TouchableOpacity>

            {resendTimer > 0 ? (
              <Text style={styles.resendTimer}>
                Повторная отправка через {resendTimer} сек.
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={loading}>
                <Text style={styles.resendLink}>Отправить снова</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btn, (loading || code.some(d => !d)) && styles.btnDisabled]}
              onPress={() => submitCode(code.join(''))}
              disabled={loading || code.some(d => !d)}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.btnText}>Проверяем...</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Подтвердить</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.footer}>Только для авторизованных сотрудников</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
