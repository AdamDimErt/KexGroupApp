import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { LoginScreen } from './src/screens/LoginScreen';
import { getStoredTokens, clearTokens } from './src/services/auth';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BrandDetailScreen } from './src/screens/BrandDetailScreen';
import { PointsScreen } from './src/screens/PointsScreen';
import { PointDetailScreen } from './src/screens/PointDetailScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { BottomNav } from './src/components/BottomNav';
import { colors } from './src/theme';
import type { Screen, User } from './src/types';

export default function App() {
  const [screen, setScreen]   = useState<Screen>('login');
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('');
  const [pointId, setPointId] = useState<string | null>(null);
  const [authed, setAuthed]   = useState(false);
  const [user, setUser]       = useState<User | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Восстанавливаем сессию при старте
  useEffect(() => {
    getStoredTokens().then(({ accessToken, user: storedUser }) => {
      if (accessToken && storedUser) {
        setUser(storedUser);
        setAuthed(true);
        setScreen('dashboard');
      }
    }).finally(() => setBootstrapping(false));
  }, []);

  const handleLogin = (_accessToken: string, _refreshToken: string, loggedUser: User) => {
    setUser(loggedUser);
    setAuthed(true);
    setScreen('dashboard');
  };

  const handleLogout = async () => {
    await clearTokens();
    setUser(null);
    setAuthed(false);
    setScreen('login');
  };

  const handleBrandSelect = (id: string, name: string) => {
    setBrandId(id);
    setBrandName(name);
    setScreen('brand-details');
  };

  const handlePointSelect = (id: string) => {
    setPointId(id);
    setScreen('point-details');
  };

  const renderScreen = () => {
    if (!authed) return <LoginScreen onLogin={handleLogin} />;
    switch (screen) {
      case 'dashboard':
        return <DashboardScreen onPointSelect={handlePointSelect} onNavigateBrand={handleBrandSelect} onNavigateNotifications={() => setScreen('notifications')} onLogout={handleLogout} />;
      case 'brand-details':
        return <BrandDetailScreen brandId={brandId} brandName={brandName} onNavigateToRestaurant={handlePointSelect} onBack={() => setScreen('dashboard')} />;
      case 'points':
        return <PointsScreen onPointSelect={handlePointSelect} />;
      case 'point-details':
        return <PointDetailScreen pointId={pointId} onBack={() => setScreen('points')} />;
      case 'reports':
        return <ReportsScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      default:
        return <DashboardScreen onPointSelect={handlePointSelect} onNavigateBrand={handleBrandSelect} onNavigateNotifications={() => setScreen('notifications')} onLogout={handleLogout} />;
    }
  };

  if (bootstrapping) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {renderScreen()}
      {authed && (
        <BottomNav
          current={screen}
          onNavigate={setScreen}
          hasAlerts={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
