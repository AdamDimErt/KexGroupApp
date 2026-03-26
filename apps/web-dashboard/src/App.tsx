import { BottomNav } from './components/BottomNav';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Points } from './components/Points';
import { PointDetails } from './components/PointDetails';
import { Sales } from './components/Sales';
import { Expenses } from './components/Expenses';
import { Suppliers } from './components/Suppliers';
import { Reports } from './components/Reports';
import { useState } from 'react';

export type Screen =
  | 'login'
  | 'dashboard'
  | 'points'
  | 'point-details'
  | 'sales'
  | 'expenses'
  | 'suppliers'
  | 'reports'
  | 'notifications'
  | 'profile';

// Simple notifications screen inline
function NotificationsScreen() {
  const ui   = "'Plus Jakarta Sans', sans-serif";
  const mono = "'JetBrains Mono', monospace";
  const items = [
    { id: '1', read: false, color: '#EF4444', bg: 'rgba(239,68,68,0.10)',   title: 'Kex Кофе Абай',      body: 'Выручка ниже плана на 15%',     time: '10 мин' },
    { id: '2', read: false, color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  title: 'Kex Pizza Мега',     body: 'Выручка ниже плана на 7.5%',    time: '1 ч'    },
    { id: '3', read: true,  color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', title: 'Отчёт готов',         body: 'Недельный отчёт 4–10 марта',    time: '2 ч'    },
    { id: '4', read: true,  color: '#10B981', bg: 'rgba(16,185,129,0.10)', title: 'Kex Burgers Галерея', body: 'Превышен дневной план на 10%',  time: '3 ч'    },
    { id: '5', read: true,  color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', title: 'Синхронизация 1С',   body: 'Данные обновлены успешно',      time: '4 ч'    },
  ];
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#060E1A', paddingBottom: 88 }}>
      <div style={{ padding: '52px 20px 16px' }}>
        <h1 style={{ color: '#EFF6FF', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: ui }}>
          Уведомления
        </h1>
        <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 13, fontFamily: ui, marginTop: 4 }}>
          2 непрочитанных
        </p>
      </div>
      <div style={{ padding: '0 20px' }}>
        {items.map((n, idx) => (
          <div
            key={n.id}
            style={{
              background: '#0D1B2E',
              border: `1px solid ${n.read ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.2)'}`,
              borderRadius: 14,
              padding: '14px 16px',
              marginBottom: 8,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              animation: `fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) ${idx * 0.05}s both`,
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ color: '#EFF6FF', fontSize: 14, fontWeight: 600, fontFamily: ui }}>{n.title}</p>
                <span style={{ color: 'rgba(239,246,255,0.25)', fontSize: 11, fontFamily: ui, flexShrink: 0, marginLeft: 8 }}>{n.time}</span>
              </div>
              <p style={{ color: 'rgba(239,246,255,0.5)', fontSize: 13, fontFamily: ui, marginTop: 2 }}>{n.body}</p>
            </div>
            {!n.read && (
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', flexShrink: 0, marginTop: 5 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [currentScreen, setCurrentScreen]   = useState<Screen>('login');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated]  = useState(
    () => !!localStorage.getItem('accessToken'),
  );

  const handleLogin = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
  };

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handlePointSelect = (pointId: string) => {
    setSelectedPointId(pointId);
    setCurrentScreen('point-details');
  };

  const hasAlerts = true; // Kex Кофе Абай is below plan

  const renderScreen = () => {
    if (!isAuthenticated) return <Login onLogin={handleLogin} />;
    switch (currentScreen) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} onPointSelect={handlePointSelect} />;
      case 'points':
        return <Points onPointSelect={handlePointSelect} />;
      case 'point-details':
        return <PointDetails pointId={selectedPointId} onBack={() => setCurrentScreen('points')} onNavigate={handleNavigate} />;
      case 'sales':
        return <Sales onBack={() => setCurrentScreen('dashboard')} />;
      case 'expenses':
        return <Expenses onBack={() => setCurrentScreen('dashboard')} />;
      case 'suppliers':
        return <Suppliers onBack={() => setCurrentScreen('dashboard')} />;
      case 'reports':
        return <Reports />;
      case 'notifications':
        return <NotificationsScreen />;
      default:
        return <Dashboard onNavigate={handleNavigate} onPointSelect={handlePointSelect} />;
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 40% 30%, #0D1B2E 0%, #020508 100%)' }}
    >
      <div
        className="w-full max-w-[390px] h-[844px] rounded-[32px] overflow-hidden relative flex flex-col"
        style={{
          background: '#060E1A',
          boxShadow: '0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(59,130,246,0.08)',
        }}
      >
        {renderScreen()}
        {isAuthenticated && (
          <BottomNav
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            hasAlerts={hasAlerts}
          />
        )}
      </div>
    </div>
  );
}

export default App;