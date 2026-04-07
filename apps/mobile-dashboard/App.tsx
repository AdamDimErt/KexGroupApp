import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  enabled: process.env.EXPO_PUBLIC_APP_ENV === 'production',
});

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity, Alert, Animated } from 'react-native';
import { LoginScreen } from './src/screens/LoginScreen';
import { getStoredTokens, clearTokens } from './src/services/auth';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  authenticateWithBiometric,
  getBiometricType,
} from './src/services/biometric';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BrandDetailScreen } from './src/screens/BrandDetailScreen';
import { PointsScreen } from './src/screens/PointsScreen';
import { PointDetailScreen } from './src/screens/PointDetailScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { BottomNav } from './src/components/BottomNav';
import { colors } from './src/theme';
import type { Screen, User } from './src/types';

// Placeholder components — will be replaced by real screens in Wave 2
const ArticleDetailScreen = ({ groupId, restaurantId, onBack, onNavigateOperation }: {
  groupId: string | null; restaurantId: string | null; onBack: () => void;
  onNavigateOperation: (articleId: string) => void;
}) => (
  <View style={{ flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff' }}>ArticleDetailScreen — Wave 2</Text>
  </View>
);

const OperationsScreen = ({ articleId, restaurantId, onBack }: {
  articleId: string | null; restaurantId: string | null; onBack: () => void;
}) => (
  <View style={{ flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff' }}>OperationsScreen — Wave 2</Text>
  </View>
);
import { useInactivityLogout } from './src/hooks/useInactivityLogout';

type AppState = 'bootstrapping' | 'biometric-prompt' | 'login' | 'biometric-setup' | 'app';
type BiometricType = 'faceid' | 'fingerprint' | 'iris' | null;

function App() {
  const [appState, setAppState] = useState<AppState>('bootstrapping');
  const [screen, setScreen]     = useState<Screen>('dashboard');
  const [brandId, setBrandId]   = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('');
  const [pointId, setPointId]   = useState<string | null>(null);
  const [articleGroupId, setArticleGroupId] = useState<string | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  const [user, setUser]         = useState<User | null>(null);
  const [biometricType, setBiometricType] = useState<BiometricType>(null);

  // ─── Запуск: проверка токена + биометрия ─────────────────────────────────
  useEffect(() => {
    void bootstrap();
  }, []);

  const bootstrap = async () => {
    const { accessToken, user: storedUser } = await getStoredTokens();

    if (!accessToken || !storedUser) {
      setAppState('login');
      return;
    }

    // Токен есть — проверяем биометрию
    const [available, enabled] = await Promise.all([
      isBiometricAvailable(),
      isBiometricEnabled(),
    ]);

    if (available && enabled) {
      // Биометрия включена — просим подтвердить
      const bType = await getBiometricType();
      setBiometricType(bType);
      setUser(storedUser);
      setAppState('biometric-prompt');
    } else {
      // Биометрия выключена или недоступна — сразу входим
      setUser(storedUser);
      setAppState('app');
    }
  };

  // ─── Биометрический вход ──────────────────────────────────────────────────
  const handleBiometricLogin = async () => {
    const type = biometricType ?? await getBiometricType();
    const msg = type === 'faceid' ? 'Войти через Face ID' : 'Войти по отпечатку пальца';
    const result = await authenticateWithBiometric(msg);

    if (result.success) {
      setAppState('app');
    } else if (result.error === 'cancel') {
      // Пользователь отменил — предложим ввести код вручную
      handleBiometricFallbackToLogin();
    } else if (result.error === 'lockout') {
      Alert.alert('Биометрия заблокирована', 'Слишком много попыток. Войдите через код.');
      handleBiometricFallbackToLogin();
    } else {
      Alert.alert('Ошибка', 'Не удалось войти. Попробуйте снова или войдите через код.');
    }
  };

  const handleBiometricFallbackToLogin = async () => {
    // Сбрасываем сессию, чтобы пользователь ввёл код заново
    await clearTokens();
    setUser(null);
    setAppState('login');
  };

  // ─── Вход через OTP ───────────────────────────────────────────────────────
  const handleLogin = async (
    _accessToken: string,
    _refreshToken: string,
    loggedUser: User,
  ) => {
    setUser(loggedUser);

    // Проверяем, доступна ли биометрия и не была ли она уже настроена
    const [available, alreadyEnabled] = await Promise.all([
      isBiometricAvailable(),
      isBiometricEnabled(),
    ]);

    if (available && !alreadyEnabled) {
      // Первый вход — предложим включить биометрию
      const bType = await getBiometricType();
      setBiometricType(bType);
      setAppState('biometric-setup');
    } else {
      setAppState('app');
    }
  };

  const handleLogout = async () => {
    await clearTokens();
    setUser(null);
    setScreen('dashboard');
    setAppState('login');
  };

  useInactivityLogout(appState === 'app', handleLogout);

  // ─── Навигация ────────────────────────────────────────────────────────────
  const handleBrandSelect = (id: string, name: string) => {
    setBrandId(id);
    setBrandName(name);
    setScreen('brand-details');
  };

  const handlePointSelect = (id: string) => {
    setPointId(id);
    setCurrentRestaurantId(id);
    setScreen('point-details');
  };

  const handleArticleGroupSelect = (groupId: string, restaurantId: string) => {
    setArticleGroupId(groupId);
    setCurrentRestaurantId(restaurantId);
    setScreen('article-detail');
  };

  const handleOperationSelect = (artId: string, restaurantId: string) => {
    setArticleId(artId);
    setCurrentRestaurantId(restaurantId);
    setScreen('operations');
  };

  // ─── Рендер ───────────────────────────────────────────────────────────────
  if (appState === 'bootstrapping') {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Экран биометрического входа (при повторном запуске)
  if (appState === 'biometric-prompt') {
    return (
      <BiometricPromptScreen
        biometricType={biometricType}
        user={user}
        onBiometric={handleBiometricLogin}
        onFallback={handleBiometricFallbackToLogin}
      />
    );
  }

  // Экран предложения включить биометрию (после первого OTP входа)
  if (appState === 'biometric-setup') {
    return (
      <BiometricSetupScreen
        biometricType={biometricType}
        onEnable={async () => {
          await setBiometricEnabled(true);
          setAppState('app');
        }}
        onSkip={() => setAppState('app')}
      />
    );
  }

  if (appState === 'login') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <LoginScreen onLogin={handleLogin} />
      </View>
    );
  }

  // Основное приложение
  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':
        return (
          <DashboardScreen
            onPointSelect={handlePointSelect}
            onNavigateBrand={handleBrandSelect}
            onNavigateNotifications={() => setScreen('notifications')}
            onLogout={handleLogout}
          />
        );
      case 'brand-details':
        return (
          <BrandDetailScreen
            brandId={brandId}
            brandName={brandName}
            onNavigateToRestaurant={handlePointSelect}
            onBack={() => setScreen('dashboard')}
          />
        );
      case 'points':
        return <PointsScreen onPointSelect={handlePointSelect} />;
      case 'point-details':
        return (
          <PointDetailScreen
            pointId={pointId}
            onBack={() => {
              setScreen(brandId ? 'brand-details' : 'dashboard');
            }}
            onNavigateArticle={(groupId: string) => {
              if (pointId) handleArticleGroupSelect(groupId, pointId);
            }}
          />
        );
      case 'article-detail':
        return (
          <ArticleDetailScreen
            groupId={articleGroupId}
            restaurantId={currentRestaurantId}
            onBack={() => setScreen('point-details')}
            onNavigateOperation={(artId: string) => {
              if (currentRestaurantId) handleOperationSelect(artId, currentRestaurantId);
            }}
          />
        );
      case 'operations':
        return (
          <OperationsScreen
            articleId={articleId}
            restaurantId={currentRestaurantId}
            onBack={() => setScreen('article-detail')}
          />
        );
      case 'reports':
        return <ReportsScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      default:
        return (
          <DashboardScreen
            onPointSelect={handlePointSelect}
            onNavigateBrand={handleBrandSelect}
            onNavigateNotifications={() => setScreen('notifications')}
            onLogout={handleLogout}
          />
        );
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {renderScreen()}
      <BottomNav current={screen} onNavigate={setScreen} hasAlerts={true} />
    </View>
  );
}

// ─── Экран биометрического входа (Kaspi-style) ───────────────────────────────

function BiometricPromptScreen({
  biometricType,
  user,
  onBiometric,
  onFallback,
}: {
  biometricType: 'faceid' | 'fingerprint' | 'iris' | null;
  user: import('./src/types').User | null;
  onBiometric: () => void;
  onFallback: () => void;
}) {
  const isTouchId = biometricType !== 'faceid';
  const pulse = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  // Имя пользователя — первое слово
  const firstName = user?.name ? user.name.split(' ')[0] : null;
  const greeting  = firstName ? `Добро пожаловать,\n${firstName}` : 'Добро пожаловать';

  // Иконка биометрии — встроенный символ
  const bioSymbol = isTouchId ? '⬡' : '⬡'; // заменим через отрисовку ниже

  // Пульсирующая анимация
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 1,    duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 0,    duration: 900, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, glow]);

  // Автоматически триггерим при открытии
  useEffect(() => {
    const t = setTimeout(() => void onBiometric(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Логотип вверху */}
      <View style={styles.bpHeader}>
        <View style={styles.bpLogoBox}>
          <Text style={styles.bpLogoLetter}>H</Text>
        </View>
        <Text style={styles.bpLogoName}>HoldingView</Text>
      </View>

      {/* Центральная зона */}
      <View style={styles.bpCenter}>
        <Text style={styles.bpGreeting}>{greeting}</Text>
        <Text style={styles.bpHint}>
          {isTouchId ? 'Приложите палец для входа' : 'Посмотрите в камеру для входа'}
        </Text>

        {/* Кнопка-иконка с пульсом */}
        <TouchableOpacity onPress={onBiometric} activeOpacity={0.75} style={styles.bpIconWrap}>
          {/* Внешний пульсирующий ореол */}
          <Animated.View style={[
            styles.bpGlowRing,
            { transform: [{ scale: pulse }], opacity: glowOpacity },
          ]} />
          {/* Основной круг */}
          <Animated.View style={[styles.bpIconCircle, { transform: [{ scale: pulse }] }]}>
            <Text style={styles.bpIconEmoji}>{isTouchId ? '⊕' : '◉'}</Text>
          </Animated.View>
        </TouchableOpacity>

        <Text style={styles.bpTapHint}>
          {isTouchId ? 'Touch ID' : 'Face ID'}
        </Text>
      </View>

      {/* Ссылка внизу */}
      <View style={styles.bpFooter}>
        <TouchableOpacity onPress={onFallback} activeOpacity={0.7} style={styles.bpFallbackBtn}>
          <Text style={styles.bpFallbackText}>Войти с кодом</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Экран настройки биометрии (после первого входа) ─────────────────────────

function BiometricSetupScreen({
  biometricType,
  onEnable,
  onSkip,
}: {
  biometricType: 'faceid' | 'fingerprint' | 'iris' | null;
  onEnable: () => void;
  onSkip: () => void;
}) {
  const isTouchId = biometricType !== 'faceid';
  const title    = isTouchId ? 'Подключить Touch ID' : 'Подключить Face ID';
  const sub      = isTouchId
    ? 'В следующий раз входите по отпечатку пальца — без кода'
    : 'В следующий раз входите одним взглядом — без кода';
  const btnLabel = isTouchId ? 'Подключить Touch ID' : 'Подключить Face ID';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.bpHeader}>
        <View style={styles.bpLogoBox}>
          <Text style={styles.bpLogoLetter}>H</Text>
        </View>
        <Text style={styles.bpLogoName}>HoldingView</Text>
      </View>

      <View style={styles.bpCenter}>
        <View style={[styles.bpIconCircle, { marginBottom: 32 }]}>
          <Text style={styles.bpIconEmoji}>{isTouchId ? '⊕' : '◉'}</Text>
        </View>
        <Text style={styles.bpSetupTitle}>{title}</Text>
        <Text style={styles.bpSetupSub}>{sub}</Text>
      </View>

      <View style={styles.bpFooter}>
        <TouchableOpacity style={styles.bpSetupBtn} onPress={onEnable} activeOpacity={0.85}>
          <Text style={styles.bpSetupBtnText}>{btnLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={styles.bpFallbackBtn}>
          <Text style={styles.bpFallbackText}>Пропустить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Стили ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Биометрия: шапка ──
  bpHeader: {
    paddingTop: 64,
    paddingBottom: 8,
    alignItems: 'center',
  },
  bpLogoBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bpLogoLetter: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  bpLogoName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  // ── Биометрия: центр ──
  bpCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  bpGreeting: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 34,
  },
  bpHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
  },
  bpIconWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bpGlowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent,
  },
  bpIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentDark,
    borderWidth: 2,
    borderColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpIconEmoji: {
    fontSize: 44,
    color: '#fff',
    lineHeight: 52,
  },
  bpTapHint: {
    fontSize: 13,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },

  // ── Биометрия: подвал ──
  bpFooter: {
    paddingHorizontal: 32,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 12,
  },
  bpFallbackBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  bpFallbackText: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  // ── Setup ──
  bpSetupTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  bpSetupSub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bpSetupBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  bpSetupBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Sentry.wrap(App);
