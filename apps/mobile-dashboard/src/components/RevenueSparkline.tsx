import React, { useState } from 'react';
import { View, Text, Pressable, GestureResponderEvent } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

export interface RevenueSparklinePoint {
  date: string;
  revenue: number;
}

export interface RevenueSparklineProps {
  data: RevenueSparklinePoint[];
  width: number;
  height: number;
  color?: string;
  /** Optional second color for gradient stop. Defaults to `color` at 0% opacity. */
  fillFadeTo?: string;
  /**
   * Optional custom formatter for tooltip amount. Defaults to ₸-prefixed
   * compact form (12.5K / 1.2M).
   */
  formatAmount?: (value: number) => string;
}

/** Default ₸-prefixed compact formatter: 1234 → ₸1k, 1234567 → ₸1.2M. */
function defaultFormat(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `₸${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `₸${(v / 1_000).toFixed(1)}K`;
  return `₸${v.toFixed(0)}`;
}

/** "2026-04-27" → "27 апр" — короткая русская дата для tooltip. */
const RU_MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
function formatShortDate(dateStr: string): string {
  // Берём первые 10 символов на случай если пришла ISO-строка с временем
  const isoDate = dateStr.slice(0, 10);
  const [, m, d] = isoDate.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return dateStr;
  return `${parseInt(d, 10)} ${RU_MONTHS_SHORT[monthIdx]}`;
}

/**
 * Smooth area sparkline used inside the dashboard hero card (Binance-style).
 *
 * Interactivity:
 *   • Tap anywhere on the sparkline → pick the nearest data point and show
 *     a tooltip above the curve with date + amount.
 *   • Tap the same point again or outside the chart → tooltip closes.
 *
 * Builds a Catmull-Rom-ish path via cubic Bézier control points so the curve
 * stays gentle even on tiny widget widths. Fill is a vertical gradient that
 * fades from the line color to fully transparent at the bottom.
 */
export function RevenueSparkline({
  data,
  width,
  height,
  color = '#22C55E',
  fillFadeTo,
  formatAmount,
}: RevenueSparklineProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (!data || data.length === 0 || width <= 0 || height <= 0) {
    return <View style={{ width, height }} />;
  }

  // Tooltip-зону делаем чуть выше графика, чтобы не перекрывать линию.
  // 22px = достаточно для двух строк (дата + сумма).
  const TOOLTIP_H = 28;
  const totalH = height + TOOLTIP_H;

  // Pad so stroke isn't clipped at the edges.
  const PAD_X = 2;
  const PAD_Y = 4;
  const innerW = Math.max(1, width - PAD_X * 2);
  const innerH = Math.max(1, height - PAD_Y * 2);

  const values = data.map(d => d.revenue);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const dataSpan = dataMax - dataMin || 1;

  // Мягкий padding +20% сверху и снизу: чтобы минимум не упирался в нижнюю границу
  // (визуально это выглядит как «график провалился в ноль», хотя на деле может быть
  // спад всего в 5-7%). Делает колебания читаемыми, но не преувеличивает их.
  // Это стандартный приём для финансовых sparkline (Binance, Yahoo Finance).
  const minV = dataMin - dataSpan * 0.2;
  const maxV = dataMax + dataSpan * 0.1;
  const span = maxV - minV || 1;

  const pts = data.map((d, i) => {
    const x = PAD_X + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = PAD_Y + innerH - ((d.revenue - minV) / span) * innerH;
    return { x, y };
  });

  // Build a smooth path with cubic Bézier (tension=0.5).
  const TENSION = 0.5;
  let linePath = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * TENSION;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * TENSION;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * TENSION;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * TENSION;
    linePath += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  const baseY = (PAD_Y + innerH).toFixed(2);
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(2)} ${baseY} L ${pts[0].x.toFixed(2)} ${baseY} Z`;

  const gradId = `sparkFill-${color.replace('#', '')}`;
  const fmt = formatAmount ?? defaultFormat;

  // Touch handler — определяем индекс ближайшей точки по координате X касания.
  // locationX даёт координату в пределах SVG (0..width).
  const handlePress = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i].x - x);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    // Тап на ту же точку → закрыть tooltip
    setSelectedIdx(prev => {
      const next = prev === bestIdx ? null : bestIdx;
      // Лёгкая вибрация — сигналит что тап сработал и мы переключили точку
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return next;
    });
  };

  // Параметры tooltip для выбранной точки.
  const sel = selectedIdx != null ? pts[selectedIdx] : null;
  const selData = selectedIdx != null ? data[selectedIdx] : null;

  // Tooltip-блок плавающий в верхней зоне (выше графика).
  // Позиционируем по X центра точки, но прижимаем к краям если не помещается.
  const TOOLTIP_W = 110;
  let tooltipLeft = 0;
  if (sel) {
    tooltipLeft = sel.x - TOOLTIP_W / 2;
    if (tooltipLeft < 0) tooltipLeft = 0;
    if (tooltipLeft + TOOLTIP_W > width) tooltipLeft = width - TOOLTIP_W;
  }

  return (
    <View style={{ width, height: totalH }}>
      {/* Tooltip — показывается только при выбранной точке */}
      {sel && selData && (
        <View
          style={{
            position: 'absolute',
            left: tooltipLeft,
            top: 0,
            width: TOOLTIP_W,
            paddingVertical: 3,
            paddingHorizontal: 8,
            borderRadius: 6,
            backgroundColor: 'rgba(0,0,0,0.75)',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>
            {formatShortDate(selData.date)}
          </Text>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>
            {fmt(selData.revenue)}
          </Text>
        </View>
      )}

      {/* SVG-график + интерактивная зона */}
      <Pressable onPress={handlePress} style={{ width, height, marginTop: TOOLTIP_H }}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={fillFadeTo ?? color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill={`url(#${gradId})`} />
          <Path
            d={linePath}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Маркер выбранной точки — вертикальная линия + кружок */}
          {sel && (
            <>
              <Line
                x1={sel.x}
                y1={PAD_Y}
                x2={sel.x}
                y2={PAD_Y + innerH}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <Circle
                cx={sel.x}
                cy={sel.y}
                r={4}
                fill={color}
                stroke="#FFF"
                strokeWidth={1.5}
              />
            </>
          )}
        </Svg>
      </Pressable>
    </View>
  );
}
