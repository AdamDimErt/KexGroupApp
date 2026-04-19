import React from 'react';
import { View } from 'react-native';
import { KPICard, type KPICardProps } from './KPICard';
import { kpiStyles as S } from './KPICard.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KPIRowProps {
  revenue:  KPICardProps;
  expenses: KPICardProps;
  balance:  KPICardProps;
  periodLabel: string;      // single source — overrides each card's period
}

// ─── Component ────────────────────────────────────────────────────────────────
// Layout: always 3 cards in flex row, equal width. NEVER show 2/3 cards.

export function KPIRow({ revenue, expenses, balance, periodLabel }: KPIRowProps) {
  return (
    <View style={S.row}>
      <KPICard {...revenue}  kind="revenue"  periodLabel={periodLabel} />
      <KPICard {...expenses} kind="expenses" periodLabel={periodLabel} />
      <KPICard {...balance}  kind="balance"  periodLabel={periodLabel} />
    </View>
  );
}
