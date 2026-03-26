import { useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface LoginProps {
  onLogin: (accessToken: string, refreshToken: string) => void;
}

type Step = 'phone' | 'code';

export function Login({ onLogin }: LoginProps) {
  const [step, setStep]           = useState<Step>('phone');
  const [phone, setPhone]         = useState('');
  const [code, setCode]           = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [focused, setFocused]     = useState<string | null>(null);
  const inputRefs                 = useRef<(HTMLInputElement | null)[]>([]);

  const ui   = "'Plus Jakarta Sans', sans-serif";
  const mono = "'JetBrains Mono', monospace";

  const inputBase: React.CSSProperties = {
    background:  'rgba(59,130,246,0.06)',
    border:      '1px solid rgba(59,130,246,0.14)',
    borderRadius: 14,
    color:       '#EFF6FF',
    fontFamily:  ui,
    fontSize:    15,
    outline:     'none',
    transition:  'border-color 0.2s, box-shadow 0.2s',
    width:       '100%',
    boxSizing:   'border-box',
  };

  const inputFocused: React.CSSProperties = {
    border:    '1px solid rgba(59,130,246,0.6)',
    boxShadow: '0 0 0 3px rgba(59,130,246,0.10)',
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? 'Ошибка отправки кода');
        return;
      }
      setStep('code');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      setError('Сервер недоступен. Проверьте соединение.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = async (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[idx] = val;
    setCode(next);
    setError(null);

    if (val && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (next.every(d => d !== '') && idx === 5) {
      await submitCode(next.join(''));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const submitCode = async (fullCode: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? 'Неверный код');
        setCode(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
        return;
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.accessToken, data.refreshToken);
    } catch {
      setError('Сервер недоступен. Проверьте соединение.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = () => {
    const fullCode = code.join('');
    if (fullCode.length === 6) submitCode(fullCode);
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 28px 40px',
        background: 'radial-gradient(ellipse at 25% 0%, #0F2347 0%, #060E1A 65%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient — blue top-right */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 280, height: 280, borderRadius: '50%',
        background: 'rgba(59,130,246,0.15)',
        filter: 'blur(90px)', pointerEvents: 'none',
      }} />
      {/* Ambient — cyan bottom-left */}
      <div style={{
        position: 'absolute', bottom: -60, left: -60,
        width: 180, height: 180, borderRadius: '50%',
        background: 'rgba(16,185,129,0.08)',
        filter: 'blur(70px)', pointerEvents: 'none',
      }} />

      {/* Logo block */}
      <div style={{ marginTop: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(37,99,235,0.35)',
        }}>
          <span style={{ color: 'white', fontSize: 24, fontWeight: 700, fontFamily: ui }}>H</span>
        </div>
        <p style={{ color: '#EFF6FF', fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: ui, marginTop: 16 }}>
          HoldingView
        </p>
        <p style={{ color: 'rgba(239,246,255,0.35)', fontSize: 13, fontFamily: ui, marginTop: 5, textAlign: 'center' }}>
          Весь холдинг — одним взглядом
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 330, zIndex: 1 }}>
        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} style={{ marginTop: 52 }}>
            <p style={{
              color: 'rgba(239,246,255,0.40)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: ui,
              marginBottom: 6,
            }}>
              Номер телефона
            </p>

            <input
              type="tel"
              placeholder="+7 (___) ___-__-__"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused(null)}
              style={{
                ...inputBase,
                padding: '16px',
                ...(focused === 'phone' ? inputFocused : {}),
              }}
            />

            {error && (
              <p style={{ color: '#EF4444', fontSize: 13, fontFamily: ui, marginTop: 8 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || !phone}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none',
                borderRadius: 14,
                color: 'white',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: ui,
                cursor: (isLoading || !phone) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || !phone) ? 0.7 : 1,
                boxShadow: '0 8px 28px rgba(37,99,235,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 14,
                transition: 'opacity 0.2s',
              }}
            >
              {isLoading ? (
                <>
                  <div className="spin-anim" style={{
                    width: 17, height: 17,
                    border: '2px solid rgba(255,255,255,0.25)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                  }} />
                  Отправляем код...
                </>
              ) : 'Получить код'}
            </button>
          </form>
        ) : (
          <div style={{ marginTop: 52 }}>
            <p style={{
              color: 'rgba(239,246,255,0.40)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: ui,
              marginBottom: 6,
            }}>
              Код из SMS
            </p>
            <p style={{ color: 'rgba(239,246,255,0.5)', fontSize: 13, fontFamily: ui, marginBottom: 20 }}>
              Отправили на {phone}
            </p>

            {/* 6-digit code boxes */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  id={`code-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onFocus={() => setFocused(`code-${idx}`)}
                  onBlur={() => setFocused(null)}
                  style={{
                    ...inputBase,
                    width: 44,
                    height: 54,
                    textAlign: 'center',
                    fontSize: 20,
                    fontWeight: 600,
                    fontFamily: mono,
                    padding: 0,
                    flex: 1,
                    ...(focused === `code-${idx}` ? inputFocused : {}),
                  }}
                />
              ))}
            </div>

            {error && (
              <p style={{ color: '#EF4444', fontSize: 13, fontFamily: ui, marginBottom: 12 }}>{error}</p>
            )}

            <button
              onClick={() => { setStep('phone'); setCode(['', '', '', '', '', '']); setError(null); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(239,246,255,0.4)',
                fontSize: 13,
                fontFamily: ui,
                cursor: 'pointer',
                padding: 0,
                marginBottom: 14,
                display: 'block',
              }}
            >
              ← Изменить номер
            </button>

            <button
              onClick={handleManualSubmit}
              disabled={isLoading || code.some(d => d === '')}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none',
                borderRadius: 14,
                color: 'white',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: ui,
                cursor: (isLoading || code.some(d => d === '')) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || code.some(d => d === '')) ? 0.7 : 1,
                boxShadow: '0 8px 28px rgba(37,99,235,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              {isLoading ? (
                <>
                  <div className="spin-anim" style={{
                    width: 17, height: 17,
                    border: '2px solid rgba(255,255,255,0.25)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                  }} />
                  Проверяем...
                </>
              ) : 'Подтвердить'}
            </button>
          </div>
        )}

        <p style={{
          color: 'rgba(239,246,255,0.18)',
          fontSize: 11,
          textAlign: 'center',
          fontFamily: ui,
          marginTop: 32,
        }}>
          Только для авторизованных сотрудников
        </p>
      </div>
    </div>
  );
}
