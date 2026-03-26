import { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { restaurants, getStatus, statusColor } from './Dashboard';

interface PointsProps {
  onPointSelect: (pointId: string) => void;
}

const extData: Record<string, { expenses: number; transactions: number }> = {
  '1': { expenses: 1574000, transactions: 412 },
  '2': { expenses: 1295000, transactions: 298 },
  '3': { expenses: 680000,  transactions: 248 },
  '4': { expenses: 1092000, transactions: 356 },
  '5': { expenses: 825500,  transactions: 289 },
};

export function Points({ onPointSelect }: PointsProps) {
  const [query,   setQuery]   = useState('');
  const [focused, setFocused] = useState(false);

  const ui   = "'Plus Jakarta Sans', sans-serif";
  const mono = "'JetBrains Mono', monospace";

  const maxRevenue   = Math.max(...restaurants.map(r => r.revenue));
  const totalRevenue = restaurants.reduce((s, r) => s + r.revenue, 0);

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.city.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#060E1A' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 12px' }}>
        <h1 style={{ color: '#EFF6FF', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: ui }}>
          Рестораны
        </h1>
        <p style={{ color: 'rgba(239,246,255,0.5)', fontSize: 14, fontFamily: mono, marginTop: 4 }}>
          ₸{(totalRevenue / 1000000).toFixed(2)}M сегодня
        </p>

        {/* Search */}
        <div style={{ position: 'relative', marginTop: 12 }}>
          <Search style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            width: 14, height: 14, color: 'rgba(239,246,255,0.25)',
          }} />
          <input
            type="text"
            placeholder="Поиск по ресторанам..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 38px',
              background: 'rgba(59,130,246,0.06)',
              border: `1px solid ${focused ? 'rgba(59,130,246,0.28)' : 'rgba(59,130,246,0.08)'}`,
              borderRadius: 14,
              color: '#EFF6FF',
              fontSize: 14,
              fontFamily: ui,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div
        className="hide-scrollbar"
        style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 100px' }}
      >
        {filtered.map((r) => {
          const ext    = extData[r.id];
          const status = getStatus(r.revenue, r.plan);
          const dev    = Math.round((r.revenue - r.plan) / r.plan * 100);
          const col    = statusColor[status];
          const isRed  = status === 'red';
          const margin = ext ? Math.round((r.revenue - ext.expenses) / r.revenue * 100) : 0;

          return (
            <RestaurantCard
              key={r.id}
              name={r.name}
              city={r.city}
              type={r.type}
              revenue={r.revenue}
              transactions={ext?.transactions ?? 0}
              margin={margin}
              dev={dev}
              status={status}
              col={col}
              isRed={isRed}
              planPct={Math.min(r.revenue / r.plan * 100, 100)}
              maxRevenue={maxRevenue}
              ui={ui}
              mono={mono}
              onSelect={() => onPointSelect(r.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface CardProps {
  name: string; city: string; type: string;
  revenue: number; transactions: number; margin: number;
  dev: number; status: string; col: string; isRed: boolean;
  planPct: number; maxRevenue: number;
  ui: string; mono: string;
  onSelect: () => void;
}

function RestaurantCard(p: CardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={p.onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: '#0D1B2E', borderRadius: 16, padding: 16, marginBottom: 8, display: 'block',
        border: `1px solid ${p.isRed ? 'rgba(239,68,68,0.20)' : hovered ? 'rgba(59,130,246,0.28)' : 'rgba(59,130,246,0.08)'}`,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.col, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ color: '#EFF6FF', fontSize: 14, fontWeight: 600, fontFamily: p.ui }}>{p.name}</p>
          <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 11, fontFamily: p.ui, marginTop: 1 }}>
            {p.city} · {p.transactions} чеков
          </p>
        </div>
        <div style={{ textAlign: 'right', marginRight: 4 }}>
          <p style={{ color: '#EFF6FF', fontFamily: p.mono, fontSize: 14, marginBottom: 3 }}>
            ₸{(p.revenue / 1000000).toFixed(2)}M
          </p>
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 20,
            fontSize: 11, fontWeight: 600, fontFamily: p.ui,
            background: p.dev >= 0 ? 'rgba(16,185,129,0.12)' : (p.isRed ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'),
            color: p.dev >= 0 ? '#10B981' : (p.isRed ? '#EF4444' : '#F59E0B'),
          }}>
            {p.dev > 0 ? '+' : ''}{p.dev}%
          </span>
        </div>
        <ChevronRight style={{ width: 14, height: 14, color: 'rgba(239,246,255,0.25)', flexShrink: 0 }} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(59,130,246,0.08)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p.planPct}%`, background: p.col, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>

      {/* Margin */}
      <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 11, fontFamily: p.ui, marginTop: 6 }}>
        Маржа: {p.margin}%
      </p>
    </button>
  );
}
