import { ChevronLeft, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, ResponsiveContainer, ReferenceLine, Tooltip,
} from 'recharts';
import { restaurants, getStatus, statusColor } from './Dashboard';

interface PointDetailsProps {
  pointId:    string | null;
  onBack:     () => void;
  onNavigate: (screen: string) => void;
}

// ─── Per-restaurant detailed data ────────────────────────────────────────────
const detailData: Record<string, {
  expenses: number;
  checks:   number;
  hourly:   { hour: string; v: number }[];
  expBreakdown: { cat: string; amount: number }[];
}> = {
  '1': {
    expenses: 1574000, checks: 412,
    hourly: [
      { hour: '10:00', v: 180000 }, { hour: '11:00', v: 220000 },
      { hour: '12:00', v: 310000 }, { hour: '13:00', v: 340000 },
      { hour: '14:00', v: 280000 }, { hour: '15:00', v: 195000 },
      { hour: '16:00', v: 215000 }, { hour: '17:00', v: 265000 },
    ],
    expBreakdown: [
      { cat: 'Зарплата',    amount: 620000 },
      { cat: 'Продукты',    amount: 540000 },
      { cat: 'Аренда',      amount: 280000 },
      { cat: 'Коммунальные',amount: 90000  },
      { cat: 'Прочее',      amount: 44000  },
    ],
  },
  '2': {
    expenses: 1295000, checks: 298,
    hourly: [
      { hour: '10:00', v: 130000 }, { hour: '11:00', v: 180000 },
      { hour: '12:00', v: 260000 }, { hour: '13:00', v: 290000 },
      { hour: '14:00', v: 220000 }, { hour: '15:00', v: 160000 },
      { hour: '16:00', v: 195000 }, { hour: '17:00', v: 180000 },
    ],
    expBreakdown: [
      { cat: 'Зарплата',    amount: 520000 },
      { cat: 'Продукты',    amount: 420000 },
      { cat: 'Аренда',      amount: 250000 },
      { cat: 'Коммунальные',amount: 75000  },
      { cat: 'Прочее',      amount: 30000  },
    ],
  },
  '3': {
    expenses: 680000, checks: 248,
    hourly: [
      { hour: '10:00', v: 85000  }, { hour: '11:00', v: 110000 },
      { hour: '12:00', v: 185000 }, { hour: '13:00', v: 210000 },
      { hour: '14:00', v: 165000 }, { hour: '15:00', v: 95000  },
      { hour: '16:00', v: 100000 }, { hour: '17:00', v: 70000  },
    ],
    expBreakdown: [
      { cat: 'Зарплата',    amount: 280000 },
      { cat: 'Продукты',    amount: 210000 },
      { cat: 'Аренда',      amount: 120000 },
      { cat: 'Коммунальные',amount: 45000  },
      { cat: 'Прочее',      amount: 25000  },
    ],
  },
  '4': {
    expenses: 1092000, checks: 356,
    hourly: [
      { hour: '10:00', v: 145000 }, { hour: '11:00', v: 185000 },
      { hour: '12:00', v: 255000 }, { hour: '13:00', v: 280000 },
      { hour: '14:00', v: 225000 }, { hour: '15:00', v: 155000 },
      { hour: '16:00', v: 175000 }, { hour: '17:00', v: 200000 },
    ],
    expBreakdown: [
      { cat: 'Зарплата',    amount: 430000 },
      { cat: 'Продукты',    amount: 360000 },
      { cat: 'Аренда',      amount: 210000 },
      { cat: 'Коммунальные',amount: 65000  },
      { cat: 'Прочее',      amount: 27000  },
    ],
  },
  '5': {
    expenses: 825500, checks: 289,
    hourly: [
      { hour: '10:00', v: 110000 }, { hour: '11:00', v: 150000 },
      { hour: '12:00', v: 210000 }, { hour: '13:00', v: 240000 },
      { hour: '14:00', v: 185000 }, { hour: '15:00', v: 130000 },
      { hour: '16:00', v: 145000 }, { hour: '17:00', v: 165000 },
    ],
    expBreakdown: [
      { cat: 'Зарплата',    amount: 325000 },
      { cat: 'Продукты',    amount: 270000 },
      { cat: 'Аренда',      amount: 160000 },
      { cat: 'Коммунальные',amount: 50000  },
      { cat: 'Прочее',      amount: 20500  },
    ],
  },
};

const bankAccounts = [
  { bank: 'Kaspi Bank', balance: 2400000, upd: '10 мин' },
  { bank: 'Halyk Bank', balance: 890000,  upd: '10 мин' },
];

const BarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const ui   = "'Plus Jakarta Sans', sans-serif";
  const mono = "'JetBrains Mono', monospace";
  return (
    <div style={{ background: '#112338', border: '1px solid rgba(59,130,246,0.14)', borderRadius: 10, padding: '8px 12px' }}>
      <p style={{ color: '#3B82F6', fontFamily: mono, fontSize: 13 }}>₸{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

export function PointDetails({ pointId, onBack, onNavigate }: PointDetailsProps) {
  const id   = pointId ?? '3';
  const rest = restaurants.find(r => r.id === id) ?? restaurants[2];
  const det  = detailData[id] ?? detailData['3'];

  const status  = getStatus(rest.revenue, rest.plan);
  const col     = statusColor[status];
  const dev     = Math.round((rest.revenue - rest.plan) / rest.plan * 100);
  const profit  = rest.revenue - det.expenses;
  const isRed   = status === 'red';

  // Expected hourly revenue (plan / 8 working hours)
  const hourlyPlan = Math.round(rest.plan / 8);

  // Max expense for proportional bars
  const maxExp = Math.max(...det.expBreakdown.map(e => e.amount));

  const ui   = "'Plus Jakarta Sans', sans-serif";
  const mono = "'JetBrains Mono', monospace";

  const statusPillStyle: React.CSSProperties = isRed
    ? { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }
    : { background: 'rgba(16,185,129,0.12)', color: '#10B981' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#060E1A' }}>
      {/* ── Header ── */}
      <div style={{ padding: '52px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
          <ChevronLeft style={{ width: 22, height: 22, color: 'rgba(239,246,255,0.5)' }} />
        </button>
        <p style={{ color: '#EFF6FF', fontSize: 16, fontWeight: 600, fontFamily: ui, flex: 1, textAlign: 'center', marginRight: 22 }}>
          {rest.name}
        </p>
        <span style={{
          ...statusPillStyle,
          fontSize: 12, fontWeight: 600, fontFamily: ui,
          padding: '4px 10px', borderRadius: 20,
        }}>
          {isRed ? '🔴 Проблема' : '🟢 Норма'}
        </span>
      </div>

      {/* ── Scrollable body ── */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>

        {/* Alert banner */}
        {isRed && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 12,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <AlertTriangle style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ color: '#F87171', fontSize: 14, fontWeight: 600, fontFamily: ui }}>
                Выручка ниже плана на {Math.abs(dev)}%
              </p>
              <p style={{ color: 'rgba(239,246,255,0.5)', fontSize: 12, fontFamily: ui, marginTop: 3 }}>
                Ожидалось ₸{rest.plan.toLocaleString()} · Факт ₸{rest.revenue.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* ── Metrics 2×2 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {/* Card 1 — gradient, revenue */}
          <div style={{
            background: 'linear-gradient(135deg, #1E3A6E, #2563EB)',
            borderRadius: 16, padding: 16, position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: ui }}>Выручка</p>
              <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 10, borderRadius: 4, padding: '1px 5px', fontFamily: mono }}>iiko</span>
            </div>
            <p style={{ color: 'white', fontFamily: mono, fontSize: 20, fontWeight: 500, marginTop: 8 }}>
              ₸{(rest.revenue / 1000).toFixed(0)}k
            </p>
          </div>

          {/* Card 2 — expenses */}
          <div style={{ background: '#0D1B2E', border: '1px solid rgba(59,130,246,0.08)', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ color: 'rgba(239,246,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: ui }}>Расходы</p>
              <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', fontSize: 10, borderRadius: 4, padding: '1px 5px', fontFamily: mono }}>1С</span>
            </div>
            <p style={{ color: '#EFF6FF', fontFamily: mono, fontSize: 20, fontWeight: 500, marginTop: 8 }}>
              ₸{(det.expenses / 1000).toFixed(0)}k
            </p>
          </div>

          {/* Card 3 — profit */}
          <div style={{ background: '#0D1B2E', border: '1px solid rgba(59,130,246,0.08)', borderRadius: 16, padding: 16 }}>
            <p style={{ color: 'rgba(239,246,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: ui }}>Прибыль</p>
            <p style={{ color: '#10B981', fontFamily: mono, fontSize: 20, fontWeight: 500, marginTop: 8 }}>
              ₸{(profit / 1000).toFixed(0)}k
            </p>
          </div>

          {/* Card 4 — checks */}
          <div style={{ background: '#0D1B2E', border: '1px solid rgba(59,130,246,0.08)', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ color: 'rgba(239,246,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: ui }}>Чеков</p>
              <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', fontSize: 10, borderRadius: 4, padding: '1px 5px', fontFamily: mono }}>iiko</span>
            </div>
            <p style={{ color: '#EFF6FF', fontFamily: mono, fontSize: 20, fontWeight: 500, marginTop: 8 }}>
              {det.checks}
            </p>
          </div>
        </div>

        {/* ── Hourly Chart ── */}
        <div style={{ background: '#0D1B2E', border: '1px solid rgba(59,130,246,0.08)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ color: '#EFF6FF', fontSize: 13, fontWeight: 600, fontFamily: ui }}>Выручка по часам</p>
            <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 12, fontFamily: ui }}>Сегодня</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={det.hourly} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="hour"
                tick={{ fill: 'rgba(239,246,255,0.25)', fontSize: 10, fontFamily: ui }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(59,130,246,0.04)' }} />
              <ReferenceLine
                y={hourlyPlan}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4 3"
                label={{ value: 'план', fill: 'rgba(255,255,255,0.3)', fontSize: 10, position: 'insideTopRight' }}
              />
              <Bar dataKey="v" fill="#3B82F6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Expenses Breakdown ── */}
        <div style={{ background: '#0D1B2E', border: '1px solid rgba(59,130,246,0.08)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <p style={{ color: '#EFF6FF', fontSize: 13, fontWeight: 600, fontFamily: ui, marginBottom: 12 }}>
            Расходы · 1С
          </p>
          {det.expBreakdown.map((item, idx, arr) => (
            <div
              key={item.cat}
              style={{
                position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: idx < arr.length - 1 ? '1px solid rgba(59,130,246,0.06)' : 'none',
              }}
            >
              {/* Background proportion bar */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${(item.amount / maxExp) * 100}%`,
                background: 'rgba(239,68,68,0.06)', borderRadius: 4,
              }} />
              <span style={{ color: 'rgba(239,246,255,0.5)', fontSize: 13, fontFamily: ui, position: 'relative', zIndex: 1 }}>
                {item.cat}
              </span>
              <span style={{ color: '#F87171', fontFamily: mono, fontSize: 13, position: 'relative', zIndex: 1 }}>
                -₸{item.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* ── Bank Accounts ── */}
        <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: ui, marginBottom: 8 }}>
          Счета · 1С
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {bankAccounts.map(acc => (
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
      </div>
    </div>
  );
}
