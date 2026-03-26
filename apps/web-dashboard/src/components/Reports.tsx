import { useState } from 'react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Send, Download } from 'lucide-react';

type Period = 'day' | 'week' | 'month' | 'quarter';

// ─── Chart data ───────────────────────────────────────────────────────────────
const barDataMap: Record<Period, { name: string; fact: number; plan: number }[]> = {
  day: [
    { name: 'Галерея', fact: 2420, plan: 2200 },
    { name: 'Мега',    fact: 1850, plan: 2000 },
    { name: 'Абай',    fact: 1020, plan: 1200 },
    { name: 'Нурлы',   fact: 1680, plan: 1500 },
    { name: 'Байтерек',fact: 1270, plan: 1100 },
  ],
  week: [
    { name: 'Галерея', fact: 16940, plan: 15400 },
    { name: 'Мега',    fact: 12950, plan: 14000 },
    { name: 'Абай',    fact: 7140,  plan: 8400  },
    { name: 'Нурлы',   fact: 11760, plan: 10500 },
    { name: 'Байтерек',fact: 8890,  plan: 7700  },
  ],
  month: [
    { name: 'Галерея', fact: 72600, plan: 66000 },
    { name: 'Мега',    fact: 55500, plan: 60000 },
    { name: 'Абай',    fact: 30600, plan: 36000 },
    { name: 'Нурлы',   fact: 50400, plan: 45000 },
    { name: 'Байтерек',fact: 38100, plan: 33000 },
  ],
  quarter: [
    { name: 'Галерея', fact: 217800, plan: 198000 },
    { name: 'Мега',    fact: 166500, plan: 180000 },
    { name: 'Абай',    fact: 91800,  plan: 108000 },
    { name: 'Нурлы',   fact: 151200, plan: 135000 },
    { name: 'Байтерек',fact: 114300, plan: 99000  },
  ],
};

const kpiMap: Record<Period, { revenue: string; expenses: string; profit: string; revChg: string; expChg: string; profChg: string }> = {
  day:     { revenue: '₸8.24M',  expenses: '₸5.10M', profit: '₸3.14M',  revChg: '+12.4%', expChg: '+8.1%',  profChg: '+18.7%' },
  week:    { revenue: '₸57.7M',  expenses: '₸35.8M', profit: '₸21.9M',  revChg: '+15.2%', expChg: '+9.4%',  profChg: '+24.3%' },
  month:   { revenue: '₸247M',   expenses: '₸153M',  profit: '₸94M',    revChg: '+18.4%', expChg: '+11.2%', profChg: '+28.7%' },
  quarter: { revenue: '₸741M',   expenses: '₸459M',  profit: '₸282M',   revChg: '+21.3%', expChg: '+13.5%', profChg: '+32.1%' },
};

const rankingMap: Record<Period, { name: string; revenue: string; planPct: number }[]> = {
  day: [
    { name: 'Kex Burgers Галерея',  revenue: '₸2.42M', planPct: 110 },
    { name: 'Kex Diner Нурлытау',  revenue: '₸1.68M', planPct: 112 },
    { name: 'Kex Pizza Мега',       revenue: '₸1.85M', planPct: 93  },
    { name: 'Kex Burgers Байтерек', revenue: '₸1.27M', planPct: 115 },
    { name: 'Kex Кофе Абай',        revenue: '₸1.02M', planPct: 85  },
  ],
  week: [
    { name: 'Kex Burgers Галерея',  revenue: '₸16.9M', planPct: 110 },
    { name: 'Kex Pizza Мега',       revenue: '₸13.0M', planPct: 93  },
    { name: 'Kex Diner Нурлытау',  revenue: '₸11.8M', planPct: 112 },
    { name: 'Kex Burgers Байтерек', revenue: '₸8.9M',  planPct: 115 },
    { name: 'Kex Кофе Абай',        revenue: '₸7.1M',  planPct: 85  },
  ],
  month: [
    { name: 'Kex Burgers Галерея',  revenue: '₸72.6M', planPct: 110 },
    { name: 'Kex Pizza Мега',       revenue: '₸55.5M', planPct: 93  },
    { name: 'Kex Diner Нурлытау',  revenue: '₸50.4M', planPct: 112 },
    { name: 'Kex Burgers Байтерек', revenue: '₸38.1M', planPct: 115 },
    { name: 'Kex Кофе Абай',        revenue: '₸30.6M', planPct: 85  },
  ],
  quarter: [
    { name: 'Kex Burgers Галерея',  revenue: '₸217M', planPct: 110 },
    { name: 'Kex Pizza Мега',       revenue: '₸167M', planPct: 93  },
    { name: 'Kex Diner Нурлытау',  revenue: '₸151M', planPct: 112 },
    { name: 'Kex Burgers Байтерек', revenue: '₸114M', planPct: 115 },
    { name: 'Kex Кофе Абай',        revenue: '₸91.8M',planPct: 85  },
  ],
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const mono = "'JetBrains Mono', monospace";
  const ui   = "'Plus Jakarta Sans', sans-serif";
  return (
    <div style={{ background: '#112338', border: '1px solid rgba(59,130,246,0.14)', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ color: 'rgba(239,246,255,0.4)', fontSize: 11, fontFamily: ui, marginBottom: 6 }}>{label}</p>
      <p style={{ color: '#3B82F6', fontFamily: mono, fontSize: 13 }}>Факт: {payload[0]?.value}</p>
      {payload[1] && <p style={{ color: 'rgba(59,130,246,0.5)', fontFamily: mono, fontSize: 13, marginTop: 2 }}>План: {payload[1].value}</p>}
    </div>
  );
};

export function Reports() {
  const [period, setPeriod] = useState<Period>('week');
  const ui   = "'Plus Jakarta Sans', sans-serif";
  const mono = "'JetBrains Mono', monospace";

  const kpi      = kpiMap[period];
  const barData  = barDataMap[period];
  const ranking  = rankingMap[period];

  const planColor = (pct: number) => pct >= 100 ? '#10B981' : pct >= 90 ? '#F59E0B' : '#EF4444';

  const periodLabels: Record<Period, string> = { day: 'День', week: 'Неделя', month: 'Месяц', quarter: 'Квартал' };

  return (
    <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', background: '#060E1A', paddingBottom: 88 }}>
      {/* ── Header ── */}
      <div style={{ padding: '52px 20px 16px' }}>
        <h1 style={{ color: '#EFF6FF', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: ui }}>
          Аналитика
        </h1>

        {/* Period pills – full width 4 equal */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
          {(['day', 'week', 'month', 'quarter'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              flex: 1, padding: '9px 0', borderRadius: 20, fontSize: 12,
              fontWeight: period === p ? 700 : 400, fontFamily: ui, cursor: 'pointer',
              background: period === p ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : '#0D1B2E',
              border: `1px solid ${period === p ? 'transparent' : 'rgba(59,130,246,0.08)'}`,
              color: period === p ? 'white' : 'rgba(239,246,255,0.25)',
              transition: 'all 0.2s',
            }}>
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── KPI cards — horizontal scroll ── */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -20px', padding: '2px 20px 4px' }}>
          {/* Card 1 – gradient */}
          <div style={{ minWidth: 160, flexShrink: 0, background: 'linear-gradient(135deg, #1E3A6E, #2563EB)', borderRadius: 16, padding: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: ui }}>Выручка</p>
            <p style={{ color: 'white', fontFamily: mono, fontSize: 20, fontWeight: 500, marginTop: 6 }}>{kpi.revenue}</p>
            <p style={{ color: '#10B981', fontSize: 12, fontFamily: ui, marginTop: 4 }}>↑ {kpi.revChg}</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: ui, marginTop: 2 }}>iiko + 1С</p>
          </div>

          {/* Card 2 */}
          <div style={{ minWidth: 160, flexShrink: 0, background: '#0D1B2E', border: '1px solid rgba(59,130,246,0.08)', borderRadius: 16, padding: 16 }}>
            <p style={{ color: 'rgba(239,246,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: ui }}>Расходы</p>
            <p style={{ color: '#EFF6FF', fontFamily: mono, fontSize: 20, fontWeight: 500, marginTop: 6 }}>{kpi.expenses}</p>
            <p style={{ color: 'rgba(239,246,255,0.4)', fontSize: 12, fontFamily: ui, marginTop: 4 }}>↑ {kpi.expChg}</p>
            <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 10, fontFamily: ui, marginTop: 2 }}>iiko + 1С</p>
          </div>

          {/* Card 3 */}
          <div style={{ minWidth: 160, flexShrink: 0, background: '#0D1B2E', border: '1px solid rgba(59,130,246,0.08)', borderRadius: 16, padding: 16 }}>
            <p style={{ color: 'rgba(239,246,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: ui }}>Прибыль</p>
            <p style={{ color: '#EFF6FF', fontFamily: mono, fontSize: 20, fontWeight: 500, marginTop: 6 }}>{kpi.profit}</p>
            <p style={{ color: '#10B981', fontSize: 12, fontFamily: ui, marginTop: 4 }}>↑ {kpi.profChg}</p>
            <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 10, fontFamily: ui, marginTop: 2 }}>iiko + 1С</p>
          </div>
        </div>

        {/* ── Bar Chart: Факт vs План ── */}
        <div style={{ background: '#0D1B2E', border: '1px solid rgba(59,130,246,0.08)', borderRadius: 16, padding: 16 }}>
          <p style={{ color: '#EFF6FF', fontSize: 13, fontWeight: 600, fontFamily: ui, marginBottom: 14 }}>Факт vs План</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barGap={3} barCategoryGap="25%">
              <XAxis dataKey="name" tick={{ fill: 'rgba(239,246,255,0.25)', fontSize: 10, fontFamily: ui }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,0.04)' }} />
              <Bar dataKey="fact" fill="#3B82F6"               radius={[4, 4, 0, 0]} />
              <Bar dataKey="plan" fill="rgba(59,130,246,0.15)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
            {[{ col: '#3B82F6', label: 'Факт' }, { col: 'rgba(59,130,246,0.4)', label: 'План' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.col }} />
                <span style={{ color: 'rgba(239,246,255,0.4)', fontSize: 11, fontFamily: ui }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Restaurant Ranking ── */}
        <div style={{ background: '#0D1B2E', border: '1px solid rgba(59,130,246,0.08)', borderRadius: 16, padding: 16 }}>
          <p style={{ color: '#EFF6FF', fontSize: 13, fontWeight: 600, fontFamily: ui, marginBottom: 12 }}>
            Рейтинг · Выручка
          </p>
          {ranking.map((r, idx, arr) => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: idx < arr.length - 1 ? '1px solid rgba(59,130,246,0.06)' : 'none' }}>
              {/* Rank circle */}
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#112338', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'rgba(239,246,255,0.5)', fontSize: 11, fontFamily: mono }}>{idx + 1}</span>
              </div>
              <p style={{ flex: 1, color: '#EFF6FF', fontSize: 13, fontFamily: ui }}>{r.name}</p>
              <p style={{ color: '#EFF6FF', fontFamily: mono, fontSize: 13 }}>{r.revenue}</p>
              <span style={{ color: planColor(r.planPct), fontFamily: mono, fontSize: 12, fontWeight: 500, width: 38, textAlign: 'right' }}>
                {r.planPct}%
              </span>
            </div>
          ))}
        </div>

        {/* ── Export buttons ── */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { icon: Send,     label: 'Отправить' },
            { icon: Download, label: 'PDF' },
          ].map(btn => (
            <button key={btn.label} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: 12, borderRadius: 12, cursor: 'pointer',
              background: 'transparent',
              border: '1px solid rgba(59,130,246,0.28)',
              color: '#3B82F6', fontSize: 14, fontWeight: 600, fontFamily: ui,
            }}>
              <btn.icon style={{ width: 16, height: 16 }} />
              {btn.label}
            </button>
          ))}
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
