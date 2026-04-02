import { useState, useRef } from 'react';
import { TextInput } from 'react-native';
import { sendOtp, verifyOtp, saveTokens } from '../services/auth';
import type { User } from '../types';

type Step = 'phone' | 'code';

export function useLogin(onLogin: (accessToken: string, refreshToken: string, user: User) => void) {
  const [step, setStep]                         = useState<Step>('phone');
  const [phoneValue, setPhoneValue]             = useState('');
  const [selectedCountry, setSelectedCountry]   = useState<any>(null);
  const [code, setCode]                         = useState(['', '', '', '', '', '']);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [devHint, setDevHint]                   = useState<string | null>(null);
  const codeRefs                                = useRef<(TextInput | null)[]>([]);

  // Полный номер: код страны + введённые цифры
  // ICountry uses idd.root (e.g. "+7") not callingCode
  const rawPhone = selectedCountry
    ? `${selectedCountry.idd?.root || ''}${phoneValue.replace(/\D/g, '')}`
    : phoneValue.replace(/\D/g, '');

  const isPhoneReady = rawPhone.replace(/\D/g, '').length >= 7;

  // Step 1: отправка OTP
  const handlePhoneSubmit = async () => {
    if (!isPhoneReady) return;
    setError(null);
    setLoading(true);
    try {
      const result = await sendOtp(rawPhone);
      if (result.message) setDevHint(result.message);
      setStep('code');
      setTimeout(() => codeRefs.current[0]?.focus(), 150);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Сервер недоступен');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: проверка OTP
  const submitCode = async (fullCode: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await verifyOtp(rawPhone, fullCode);
      await saveTokens(data.accessToken, data.refreshToken, data.user);
      onLogin(data.accessToken, data.refreshToken, data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неверный код');
      setCode(['', '', '', '', '', '']);
      setTimeout(() => codeRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[idx] = val;
    setCode(next);
    setError(null);

    if (val && idx < 5) {
      codeRefs.current[idx + 1]?.focus();
    }
    if (next.every(d => d !== '') && idx === 5) {
      submitCode(next.join(''));
    }
  };

  const handleKeyPress = (idx: number, key: string) => {
    if (key === 'Backspace' && !code[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  const goBackToPhone = () => {
    setStep('phone');
    setCode(['', '', '', '', '', '']);
    setError(null);
    setPhoneValue('');
    setSelectedCountry(null);
  };

  return {
    step,
    phoneValue,
    setPhoneValue,
    selectedCountry,
    setSelectedCountry,
    code,
    loading,
    error,
    devHint,
    codeRefs,
    rawPhone,
    isPhoneReady,
    handlePhoneSubmit,
    submitCode,
    handleCodeChange,
    handleKeyPress,
    goBackToPhone,
  };
}
