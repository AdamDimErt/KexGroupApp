import { BellRing, ChevronRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { Screen } from '../App';

// ─── Shared restaurant data ───────────────────────────────────────────────────
export const restaurants = [
  { id: '1', name: 'Kex Burgers Галерея',  city: 'Алматы', type: 'Fast Food', revenue: 2420000, plan: 2200000 },
  { id: '2', name: 'Kex Pizza Мега',        city: 'Астана',  type: 'Пицца',    revenue: 1850000, plan: 2000000 },
  { id: '3', name: 'Kex Кофе Абай',         city: 'Алматы', type: 'Кофейня',  revenue: 1020000, plan: 1200000 },
  { id: '4', name: 'Kex Diner Нурлытау',   city: 'Астана',  type: 'Diner',    revenue: 1680000, plan: 1500000 },
  { id: '5', name: 'Kex Burgers Байтерек', city: 'Астана',  type: 'Fast Food', revenue: 1270000, plan: 1100000 },
];

export function getStatus(revenue: number, plan: number): 'green' | 'yellow' | 'red' {
  const r = revenue / plan;
  if (r >= 1)    return 'green';
  if (r >= 0.9)  return 'yellow';
  return 'red';
}

export const statusColor = { green: '#10B981', yellow: '#F59E0B', red: '#EF4444' };

// ─── Sparkline data ───────────────────────────────────────────────────────────
const heroSparkline = [
  { v: 5800000 }, { v: 6200000 }, { v: 5500000 }, { v: 7100000 },
  { v: 6800000 }, { v: 7600000 }, { v: 8240000 },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface DashboardProps {
  onNavigate:   (screen: Screen) => void;
  onPointSelect: (pointId: string) => void;
}

export function Dashboard({ onNavigate, onPointSelect }: DashboardProps) {
  const ui   = "'Plus Jakarta Sans', sans-serif";
  const mono = "'JetBrains Mono', monospace";

  const hasAlerts = restaurants.some(r => getStatus(r.revenue, r.plan) !== 'green');

  return (
    <div
      className="hide-scrollbar"
      style={{ flex: 1, overflowY: 'auto', background: '#060E1A', paddingBottom: 88, position: 'relative' }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: -100, right: -60, width: 250, height: 250,
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        padding: '52px 20px 0', position: 'relative', zIndex: 1,
      }}>
        <div>
          <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 12, fontFamily: ui }}>Доброе утро 👋</p>
          <p style={{ color: '#EFF6FF', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: ui, marginTop: 2 }}>
            Kex Group
          </p>
        </div>
        <button
          onClick={() => onNavigate('notifications')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', padding: 4 }}
        >
          <BellRing style={{ width: 22, height: 22, color: 'rgba(239,246,255,0.5)' }} />
          {hasAlerts && (
            <div style={{
              position: 'absolute', top: 2, right: 2, width: 8, height: 8,
              background: '#EF4444', borderRadius: '50%', border: '1.5px solid #060E1A',
            }} />
          )}
        </button>
      </div>

      <div style={{ padding: '16px 20px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── Hero Card ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A6E 0%, #1D4ED8 60%, #2563EB 100%)',
          borderRadius: 20, padding: 22,
          border: '1px solid rgba(59,130,246,0.3)', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: ui }}>
              Выручка сегодня
            </p>
            <div style={{ display: 'flex', gap: 4 }}>
              {['iiko', '1С'].map(src => (
                <span key={src} style={{
                  background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: 10,
                  borderRadius: 4, padding: '2px 6px', fontFamily: mono,
                }}>
                  {src}
                </span>
              ))}
            </div>
          </div>

          <p style={{
            color: 'white', fontSize: 38, fontWeight: 500,
            fontFamily: mono, letterSpacing: '-0.04em', marginTop: 6,
          }}>
            ₸ 8 240 000
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
            <p style={{ color: '#4ADE80', fontSize: 12, fontFamily: ui }}>↑ 12.4% к плану</p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: ui }}>Расходы: ₸5.1M</p>
          </div>

          <div style={{ marginTop: 14 }}>
            <ResponsiveContainer width="100%" height={52}>
              <AreaChart data={heroSparkline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="white" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="white" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="white" strokeWidth={1.5}
                  fill="url(#heroFill)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Restaurant Status List ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
          <p style={{ color: '#EFF6FF', fontSize: 13, fontWeight: 600, fontFamily: ui }}>Рестораны</p>
          <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 12, fontFamily: ui }}>5 точек</p>
        </div>

        {restaurants.map((r) => {
          const status  = getStatus(r.revenue, r.plan);
          const dev     = Math.round((r.revenue - r.plan) / r.plan * 100);
          const planPct = Math.min((r.revenue / r.plan) * 100, 100);
          const isRed   = status === 'red';
          const col     = statusColor[status];

          return (
            <button
              key={r.id}
              onClick={() => onPointSelect(r.id)}
              className="fade-up"
              style={{
                width: '100%', background: '#0D1B2E', textAlign: 'left', cursor: 'pointer',
                border: `1px solid ${isRed ? 'rgba(239,68,68,0.22)' : 'rgba(59,130,246,0.08)'}`,
                borderRadius: 16, padding: 16, marginBottom: 8, display: 'block',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: col, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#EFF6FF', fontSize: 14, fontWeight: 600, fontFamily: ui }}>{r.name}</p>
                  <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 11, fontFamily: ui, marginTop: 2 }}>
                    {r.city} · {r.type}
                  </p>
                </div>
                <div style={{ textAlign: 'right', marginRight: 4 }}>
                  <p style={{ color: '#EFF6FF', fontFamily: mono, fontSize: 14, marginBottom: 3 }}>
                    ₸{(r.revenue / 1000000).toFixed(2)}M
                  </p>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                    fontSize: 11, fontWeight: 600, fontFamily: ui,
                    background: dev >= 0 ? 'rgba(16,185,129,0.12)' : (isRed ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'),
                    color: dev >= 0 ? '#10B981' : (isRed ? '#EF4444' : '#F59E0B'),
                  }}>
                    {dev > 0 ? '+' : ''}{dev}%
                  </span>
                </div>
                <ChevronRight style={{ width: 14, height: 14, color: 'rgba(239,246,255,0.25)', flexShrink: 0 }} />
              </div>

              {/* Plan progress bar */}
              <div style={{ height: 3, background: 'rgba(59,130,246,0.08)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${planPct}%`, background: col, borderRadius: 2, transition: 'width 0.5s ease' }} />
              </div>
            </button>
          );
        })}

        {/* ── Bank Balances ── */}
        <p style={{
          color: 'rgba(239,246,255,0.25)', fontSize: 11, textTransform: 'uppercase',
          letterSpacing: 0.8, fontFamily: ui, marginTop: 8, marginBottom: 8,
        }}>
          Остатки на счетах · 1С
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { bank: 'Kaspi Bank', balance: 2400000, upd: '10 мин' },
            { bank: 'Halyk Bank', balance: 890000,  upd: '10 мин' },
          ].map((acc) => (
            <div key={acc.bank} style={{
              flex: 1, background: '#0D1B2E', border: '1px solid rgba(59,130,246,0.08)',
              borderRadius: 12, padding: '12px 14px',
            }}>
              <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 11, fontFamily: ui }}>{acc.bank}</p>
              <p style={{ color: '#EFF6FF', fontFamily: mono, fontSize: 15, marginTop: 2 }}>
                ₸{(acc.balance / 1000000).toFixed(2)}M
              </p>
              <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 10, fontFamily: ui, marginTop: 2 }}>
                {acc.upd} назад
              </p>
            </div>
          ))}
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
