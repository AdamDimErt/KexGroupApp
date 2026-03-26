import { useState } from 'react';
import { ChevronLeft, Plus, X } from 'lucide-react';

interface SalesProps {
  onBack: () => void;
}

type Category = 'all' | 'cash' | 'delivery' | 'qr';

const typeInfo: Record<string, { label: string; emoji: string; dot: string; bg: string }> = {
  cash:     { label: 'Касса',      emoji: '🏦', dot: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  delivery: { label: 'Доставка',   emoji: '🛵', dot: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  qr:       { label: 'Kaspi QR',   emoji: '📲', dot: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
};

const salesData = [
  { id: '1', date: '8 мар', time: '14:35', amount: 18500, type: 'cash',     comment: 'Заказ №1042' },
  { id: '2', date: '8 мар', time: '13:20', amount: 6200,  type: 'qr',       comment: 'Kaspi оплата' },
  { id: '3', date: '8 мар', time: '12:05', amount: 14800, type: 'delivery', comment: 'Wolt доставка' },
  { id: '4', date: '7 мар', time: '19:50', amount: 31000, type: 'cash',     comment: 'Корпоративный' },
  { id: '5', date: '7 мар', time: '17:30', amount: 8400,  type: 'qr',       comment: 'Kaspi оплата' },
  { id: '6', date: '7 мар', time: '15:10', amount: 22000, type: 'delivery', comment: 'Glovo доставка' },
  { id: '7', date: '6 мар', time: '18:25', amount: 9800,  type: 'cash',     comment: 'Заказ №1035' },
  { id: '8', date: '6 мар', time: '13:50', amount: 5600,  type: 'qr',       comment: 'Kaspi оплата' },
];

export function Sales({ onBack }: SalesProps) {
  const [filter, setFilter]  = useState<Category>('all');
  const [selId, setSelId]    = useState<string | null>(null);

  const ui   = "'Plus Jakarta Sans', sans-serif";
  const mono = "'JetBrains Mono', monospace";

  const filtered    = salesData.filter(s => filter === 'all' || s.type === filter);
  const total       = filtered.reduce((s, x) => s + x.amount, 0);
  const cashTotal   = salesData.filter(s => s.type === 'cash').reduce((s, x) => s + x.amount, 0);
  const delivTotal  = salesData.filter(s => s.type === 'delivery').reduce((s, x) => s + x.amount, 0);
  const qrTotal     = salesData.filter(s => s.type === 'qr').reduce((s, x) => s + x.amount, 0);

  const grouped: Record<string, typeof salesData> = {};
  filtered.forEach(s => { if (!grouped[s.date]) grouped[s.date] = []; grouped[s.date].push(s); });

  const selectedSale = salesData.find(s => s.id === selId);

  const pills = [
    { type: 'all',      label: 'Все',        total, dot: 'rgba(239,246,255,0.5)' },
    { type: 'cash',     label: 'Касса',      total: cashTotal,  dot: '#3B82F6' },
    { type: 'delivery', label: 'Доставка',   total: delivTotal, dot: '#10B981' },
    { type: 'qr',       label: 'Kaspi QR',   total: qrTotal,    dot: '#F59E0B' },
  ];

  const activePillStyle = {
    background: 'rgba(59,130,246,0.14)',
    border:     '1px solid rgba(59,130,246,0.28)',
    color:      '#3B82F6',
    fontWeight: 600,
  };
  const inactivePillStyle = {
    background: '#0D1B2E',
    border:     '1px solid rgba(59,130,246,0.08)',
    color:      'rgba(239,246,255,0.25)',
    fontWeight: 400,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#060E1A' }}>

      {/* ── Header ── */}
      <div style={{ padding: '52px 20px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(239,246,255,0.4)', marginBottom: 12, padding: 0, fontFamily: ui, fontSize: 13 }}>
              <ChevronLeft style={{ width: 17, height: 17 }} /> Назад
            </button>
            <p style={{ color: '#EFF6FF', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: ui }}>
              Продажи
            </p>
            <p style={{ color: '#EFF6FF', fontFamily: mono, fontSize: 28, fontWeight: 500, letterSpacing: '-0.04em', marginTop: 4 }}>
              ₸{total.toLocaleString()}
            </p>
          </div>
          {/* Add button */}
          <div style={{ marginTop: 32 }}>
            <button style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus style={{ width: 18, height: 18, color: 'white' }} />
            </button>
          </div>
        </div>

        {/* Category summary pills */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '14px -20px 0', padding: '2px 20px 4px' }}>
          {pills.map(pill => (
            <button key={pill.type} onClick={() => setFilter(pill.type as Category)} style={{
              flexShrink: 0,
              padding: '10px 14px',
              borderRadius: 20,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              ...(filter === pill.type ? activePillStyle : inactivePillStyle),
              fontFamily: ui, fontSize: 13,
              transition: 'all 0.2s',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: pill.dot, flexShrink: 0 }} />
              <span>{pill.label}</span>
              <span style={{ fontFamily: mono, fontSize: 12 }}>₸{(pill.total / 1000).toFixed(0)}k</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Transaction list ── */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 100px' }}>
        {Object.entries(grouped).map(([date, rows]) => {
          const dayTotal = rows.reduce((s, r) => s + r.amount, 0);
          return (
            <div key={date} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, padding: '0 2px' }}>
                <span style={{ color: 'rgba(239,246,255,0.25)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: ui }}>{date}</span>
                <span style={{ color: 'rgba(239,246,255,0.5)', fontFamily: mono, fontSize: 12 }}>₸{dayTotal.toLocaleString()}</span>
              </div>
              <div style={{ background: '#0D1B2E', borderRadius: 16, border: '1px solid rgba(59,130,246,0.08)', overflow: 'hidden' }}>
                {rows.map((row, idx) => {
                  const t = typeInfo[row.type];
                  return (
                    <button key={row.id} onClick={() => setSelId(row.id)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '13px 16px', background: 'transparent', border: 'none',
                      borderTop: idx > 0 ? '1px solid rgba(59,130,246,0.06)' : 'none',
                      cursor: 'pointer',
                    }}>
                      {/* Icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: '#112338',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, flexShrink: 0, position: 'relative',
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot }} />
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <p style={{ color: '#EFF6FF', fontSize: 13, fontWeight: 600, fontFamily: ui }}>{row.comment}</p>
                        <p style={{ color: 'rgba(239,246,255,0.25)', fontSize: 11, fontFamily: ui, marginTop: 1 }}>{t.label} · {row.time}</p>
                      </div>
                      <p style={{ color: '#10B981', fontFamily: mono, fontSize: 14, fontWeight: 500 }}>
                        +₸{row.amount.toLocaleString()}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detail modal ── */}
      {selectedSale && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }}
          onClick={() => setSelId(null)}>
          <div style={{ width: '100%', background: '#0D1B2E', borderRadius: '20px 20px 0 0', padding: '22px 20px 36px', border: '1px solid rgba(59,130,246,0.14)', borderBottom: 'none' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ color: '#EFF6FF', fontSize: 17, fontWeight: 700, fontFamily: ui }}>Детали продажи</p>
              <button onClick={() => setSelId(null)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 15, height: 15, color: 'rgba(239,246,255,0.5)' }} />
              </button>
            </div>
            {[
              { label: 'Сумма',    value: `+₸${selectedSale.amount.toLocaleString()}`, col: '#10B981', isMono: true },
              { label: 'Тип',      value: typeInfo[selectedSale.type]?.label ?? selectedSale.type },
              { label: 'Дата',     value: `${selectedSale.date} · ${selectedSale.time}` },
              { label: 'Описание', value: selectedSale.comment },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(59,130,246,0.06)' : 'none' }}>
                <span style={{ color: 'rgba(239,246,255,0.4)', fontSize: 13, fontFamily: ui }}>{row.label}</span>
                <span style={{ color: (row as any).col ?? '#EFF6FF', fontSize: 13, fontWeight: 600, fontFamily: row.isMono ? mono : ui }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
