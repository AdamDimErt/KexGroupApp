import { Home, Store, BarChart3, Bell } from 'lucide-react';
import type { Screen } from '../App';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate:    (screen: Screen) => void;
  hasAlerts?:    boolean;
}

export function BottomNav({ currentScreen, onNavigate, hasAlerts }: BottomNavProps) {
  const ui = "'Plus Jakarta Sans', sans-serif";

  const tabs = [
    { id: 'dashboard'     as Screen, icon: Home,      label: 'Главная'     },
    { id: 'points'        as Screen, icon: Store,     label: 'Рестораны'   },
    { id: 'reports'       as Screen, icon: BarChart3, label: 'Аналитика'   },
    { id: 'notifications' as Screen, icon: Bell,      label: 'Уведомления' },
  ];

  return (
    <div
      style={{
        position:             'absolute',
        bottom:               0,
        left:                 0,
        right:                0,
        height:               68,
        background:           'rgba(6,14,26,0.97)',
        backdropFilter:       'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop:            '1px solid rgba(59,130,246,0.08)',
        display:              'flex',
        alignItems:           'center',
        zIndex:               40,
      }}
    >
      {tabs.map((tab) => {
        const Icon      = tab.icon;
        const isActive  = currentScreen === tab.id
          || (tab.id === 'points' && currentScreen === 'point-details');
        const showBadge = tab.id === 'notifications' && hasAlerts;

        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            style={{
              flex:          1,
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           3,
              background:    'transparent',
              border:        'none',
              cursor:        'pointer',
              padding:       '8px 0 6px',
              position:      'relative',
            }}
          >
            {/* ── Icon pill ── */}
            <div
              style={{
                position:       'relative',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                width:          44,
                height:         28,
                borderRadius:   10,
                background:     isActive
                  ? 'linear-gradient(135deg, rgba(37,99,235,0.28) 0%, rgba(59,130,246,0.16) 100%)'
                  : 'transparent',
                border:         isActive
                  ? '1px solid rgba(59,130,246,0.30)'
                  : '1px solid transparent',
                boxShadow:      isActive
                  ? '0 0 12px rgba(59,130,246,0.18), inset 0 1px 0 rgba(255,255,255,0.05)'
                  : 'none',
                transition:     'all 0.25s ease',
              }}
            >
              <Icon
                style={{
                  width:       17,
                  height:      17,
                  color:       isActive ? '#60A5FA' : 'rgba(239,246,255,0.25)',
                  strokeWidth: isActive ? 2.2 : 1.5,
                  transition:  'all 0.25s ease',
                }}
              />

              {/* Badge */}
              {showBadge && (
                <div style={{
                  position:     'absolute',
                  top:          -3,
                  right:        -3,
                  width:        8,
                  height:       8,
                  borderRadius: '50%',
                  background:   '#EF4444',
                  border:       '1.5px solid #060E1A',
                  boxShadow:    '0 0 5px rgba(239,68,68,0.55)',
                }} />
              )}
            </div>

            {/* ── Label ── */}
            <span
              style={{
                fontSize:   10,
                fontWeight: isActive ? 600 : 400,
                color:      isActive ? '#60A5FA' : 'rgba(239,246,255,0.22)',
                fontFamily: ui,
                transition: 'color 0.25s',
              }}
            >
              {tab.label}
            </span>

            {/* ── Static line indicator ── */}
            <div
              style={{
                height:       2,
                width:        isActive ? 22 : 0,
                borderRadius: 2,
                background:   'linear-gradient(90deg, transparent, #3B82F6, transparent)',
                opacity:      isActive ? 1 : 0,
                transition:   'width 0.3s ease, opacity 0.25s ease',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
