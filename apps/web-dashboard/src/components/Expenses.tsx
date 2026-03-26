import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

interface ExpensesProps {
  onBack: () => void;
}

const catMeta: Record<string, { color: string; emoji: string }> = {
  'Продукты':    { color: '#3B82F6', emoji: '🥩' },
  'Зарплата':    { color: '#F59E0B', emoji: '👥' },
  'Аренда':      { color: '#A78BFA', emoji: '🏢' },
  'Коммунальные':{ color: '#10B981', emoji: '💡' },
  'Прочее':      { color: 'rgba(239,246,255,0.2)', emoji: '📋' },
};

const expData = [
  { id: '1', date: '8 мар',  amount: 48000, category: 'Продукты',    desc: 'Закупка мяса и овощей',     point: 'Kex Burgers Галерея' },
  { id: '2', date: '8 мар',  amount: 32000, category: 'Зарплата',    desc: 'Аванс персоналу',           point: 'Kex Кофе Абай'       },
  { id: '3', date: '7 мар',  amount: 85000, category: 'Аренда',      desc: 'Аренда марта',              point: 'Kex Pizza Мега'      },
  { id: '4', date: '7 мар',  amount: 18500, category: 'Коммунальные',desc: 'Электроэнергия',            point: 'Kex Burgers Галерея' },
  { id: '5', date: '7 мар',  amount: 24000, category: 'Продукты',    desc: 'Молочная продукция',        point: 'Kex Кофе Абай'       },
  { id: '6', date: '6 мар',  amount: 15000, category: 'Прочее',      desc: 'Хоз. расходы',             point: 'Kex Diner Нурлытау'  },
  { id: '7', date: '6 мар',  amount: 41000, category: 'Зарплата',    desc: 'Выплата кассирам',          point: 'Kex Pizza Мега'      },
];

const categories = ['Все', ...Object.keys(catMeta)];

export function Expenses({ onBack }: ExpensesProps) {
  const [selCat, setSelCat] = useState('Все');
  const [selId, setSelId]   = useState<string | null>(null);

  const ui   = "'Plus Jakarta Sans', sans-serif";
  const mono = "'JetBrains Mono', monospace";

  const filtered = selCat === 'Все' ? expData : expData.filter(e => e.category === selCat);
  const totalAll  = expData.reduce((s, e) => s + e.amount, 0);
  const totalFilt = filtered.reduce((s, e) => s + e.amount, 0);

  const breakdown = Object.keys(catMeta).map(cat => {
    const t = expData.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return { cat, total: t, pct: Math.round(t / totalAll * 100) };
  }).filter(b => b.total > 0).sort((a, b) => b.total - a.total);

  const selExp = expData.find(e => e.id === selId);

  const activePill  = { background: 'rgba(59,130,246,0.14)', border: '1px solid rgba(59,130,246,0.28)', color: '#3B82F6', fontWeight: 600 };
  const inactivePill = { background: '#0D1B2E', border: '1px solid rgba(59,130,246,0.08)', color: 'rgba(239,246,255,0.25)', fontWeight: 400 };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#060E1A', position: 'relative' }}>

      {/* ── Header ── */}
      <div style={{ padding: '52px 20px 12px' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(239,246,255,0.4)', marginBottom: 12, padding: 0, fontFamily: ui, fontSize: 13 }}>
          <ChevronLeft style={{ width: 17, height: 17 }} /> Назад
        </button>
        <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: ui }}>Расходы</p>
        <p style={{ color: '#EFF6FF', fontFamily: mono, fontSize: 32, fontWeight: 500, letterSpacing: '-0.04em', marginTop: 4, marginBottom: 16 }}>
          ₸{totalFilt.toLocaleString()}
        </p>

        {/* Stacked bar */}
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
          {breakdown.map(b => (
            <div key={b.cat} style={{ width: `${b.pct}%`, background: catMeta[b.cat]?.color ?? '#3B82F6', transition: 'width 0.4s' }} />
          ))}
        </div>

        {/* Legend 2-col */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 14 }}>
          {breakdown.map(b => (
            <div key={b.cat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: catMeta[b.cat]?.color ?? '#3B82F6', flexShrink: 0 }} />
              <span style={{ color: 'rgba(239,246,255,0.5)', fontSize: 12, fontFamily: ui, flex: 1 }}>{b.cat}</span>
              <span style={{ color: '#EFF6FF', fontFamily: mono, fontSize: 12 }}>₸{(b.total / 1000).toFixed(0)}k</span>
              <span style={{ color: 'rgba(239,246,255,0.25)', fontSize: 11, fontFamily: ui, width: 28, textAlign: 'right' }}>{b.pct}%</span>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -20px', padding: '2px 20px 4px' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelCat(cat)} style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: 20,
              fontSize: 13, fontFamily: ui, cursor: 'pointer',
              ...(selCat === cat ? activePill : inactivePill),
              transition: 'all 0.2s',
            }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 100px' }}>
        <div style={{ background: '#0D1B2E', borderRadius: 16, border: '1px solid rgba(59,130,246,0.08)', overflow: 'hidden' }}>
          {filtered.length === 0 && (
            <p style={{ color: 'rgba(239,246,255,0.25)', textAlign: 'center', padding: '24px 0', fontFamily: ui }}>
              Нет данных
            </p>
          )}
          {filtered.map((exp, idx) => {
            const m = catMeta[exp.category];
            return (
              <button key={exp.id} onClick={() => setSelId(exp.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px', background: 'transparent', border: 'none',
                borderTop: idx > 0 ? '1px solid rgba(59,130,246,0.06)' : 'none',
                cursor: 'pointer',
              }}>
                {/* Icon */}
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#112338', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {m?.emoji ?? '📋'}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ color: '#EFF6FF', fontSize: 13, fontWeight: 600, fontFamily: ui }}>{exp.desc}</p>
                  <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 11, fontFamily: ui, marginTop: 1 }}>{exp.category} · {exp.point}</p>
                </div>
                <p style={{ color: '#F87171', fontFamily: mono, fontSize: 14, flexShrink: 0, marginRight: 4 }}>
                  -₸{exp.amount.toLocaleString()}
                </p>
                <ChevronRight style={{ width: 14, height: 14, color: 'rgba(239,246,255,0.25)', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── FAB ── */}
      <button style={{
        position: 'absolute', right: 20, bottom: 88,
        width: 52, height: 52, borderRadius: '50%',
        background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(37,99,235,0.40)', zIndex: 10,
      }}>
        <Plus style={{ width: 22, height: 22, color: 'white' }} />
      </button>

      {/* ── Detail modal ── */}
      {selExp && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
          onClick={() => setSelId(null)}>
          <div style={{ width: '100%', background: '#0D1B2E', borderRadius: '20px 20px 0 0', padding: '22px 20px 36px', border: '1px solid rgba(59,130,246,0.14)', borderBottom: 'none' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ color: '#EFF6FF', fontSize: 17, fontWeight: 700, fontFamily: ui }}>Детали расхода</p>
              <button onClick={() => setSelId(null)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 15, height: 15, color: 'rgba(239,246,255,0.5)' }} />
              </button>
            </div>
            {[
              { label: 'Сумма',    value: `-₸${selExp.amount.toLocaleString()}`, col: '#F87171', isMono: true },
              { label: 'Категория',value: selExp.category },
              { label: 'Дата',     value: selExp.date },
              { label: 'Точка',    value: selExp.point },
              { label: 'Описание', value: selExp.desc },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(59,130,246,0.06)' : 'none' }}>
                <span style={{ color: 'rgba(239,246,255,0.4)', fontSize: 13, fontFamily: ui }}>{row.label}</span>
                <span style={{ color: (row as any).col ?? '#EFF6FF', fontSize: 13, fontWeight: 600, fontFamily: row.isMono ? mono : ui, maxWidth: '60%', textAlign: 'right' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
