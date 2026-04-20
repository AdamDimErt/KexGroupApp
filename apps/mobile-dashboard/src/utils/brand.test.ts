import {
  resolveBrand,
  computePlanAttainment,
  computePlanDelta,
  computeMarginPct,
  formatPlanLabel,
  formatMargin,
  formatDelta,
  formatSyncTime,
  type BrandCode,
} from './brand';

describe('BUG-11-2: resolveBrand with BRAND_MAP', () => {
  it('returns BNA for Burger na Abaya', () => {
    expect(resolveBrand('Burger na Abaya').code).toBe('BNA');
  });
  it('returns DNA for Doner na Abaya', () => {
    expect(resolveBrand('Doner na Abaya').code).toBe('DNA');
  });
  it('returns JD for Just Doner', () => {
    expect(resolveBrand('Just Doner').code).toBe('JD');
  });
  it('returns SB for Salam Bro', () => {
    expect(resolveBrand('Salam Bro').code).toBe('SB');
  });
  it('returns KEX for КексБрэндс', () => {
    expect(resolveBrand('КексБрэндс').code).toBe('KEX');
  });
  it('returns KITCHEN for Цех', () => {
    expect(resolveBrand('Цех').code).toBe('KITCHEN');
  });
  it('falls back to keyword match for "burger something"', () => {
    expect(resolveBrand('Burger New Location').code).toBe('BNA');
  });
  it('falls back to keyword match for Russian "донер"', () => {
    expect(resolveBrand('Донер Point').code).toBe('DNA');
  });
});

describe('BUG-11-4: computePlanAttainment / computePlanDelta / formatPlanLabel', () => {
  it('computePlanAttainment returns 100 when revenue equals plan', () => {
    expect(computePlanAttainment(100, 100)).toBe(100);
  });
  it('computePlanAttainment caps at 150%', () => {
    expect(computePlanAttainment(300, 100)).toBe(150);
  });
  it('computePlanAttainment returns 0 when plan is 0', () => {
    expect(computePlanAttainment(100, 0)).toBe(0);
  });
  it('computePlanDelta returns attainment minus 100', () => {
    expect(computePlanDelta(95, 100)).toBeCloseTo(-5, 2);
  });
  it('computePlanDelta for BNA case (29.28M / 30.74M) ≈ -4.75%', () => {
    const delta = computePlanDelta(29_280_000, 30_740_000);
    expect(delta).toBeGreaterThan(-5);
    expect(delta).toBeLessThan(-4);
  });
  it('formatPlanLabel null → "Нет плана"', () => {
    expect(formatPlanLabel(null).text).toBe('Нет плана');
    expect(formatPlanLabel(null).status).toBe('onplan');
  });
  it('formatPlanLabel -4.7 → "Ниже плана" with below status', () => {
    const r = formatPlanLabel(-4.7);
    expect(r.status).toBe('below');
    expect(r.text).toContain('Ниже плана');
  });
  it('formatPlanLabel 0.3 → "По плану" (within ±0.5% threshold)', () => {
    expect(formatPlanLabel(0.3).status).toBe('onplan');
  });
  it('formatPlanLabel 5.2 → "Выше плана" with above status', () => {
    const r = formatPlanLabel(5.2);
    expect(r.status).toBe('above');
    expect(r.text).toContain('Выше плана');
  });
});

describe('BUG-11-6: formatSyncTime (Asia/Almaty, UTC+5)', () => {
  it('formats 07:30 UTC as "12:30" in Almaty', () => {
    expect(formatSyncTime('2026-04-20T07:30:00Z')).toBe('12:30');
  });
  it('formats midnight UTC as "05:00" in Almaty', () => {
    expect(formatSyncTime('2026-04-20T00:00:00Z')).toBe('05:00');
  });
  it('formats 19:00 UTC as "00:00" next day in Almaty (same HH:mm)', () => {
    expect(formatSyncTime('2026-04-20T19:00:00Z')).toBe('00:00');
  });
  it('is independent of process.env.TZ', () => {
    const prev = process.env.TZ;
    process.env.TZ = 'UTC';
    expect(formatSyncTime('2026-04-20T07:30:00Z')).toBe('12:30');
    process.env.TZ = 'America/New_York';
    expect(formatSyncTime('2026-04-20T07:30:00Z')).toBe('12:30');
    if (prev !== undefined) process.env.TZ = prev;
    else delete process.env.TZ;
  });
});

describe('BUG-11-2: BrandCode type', () => {
  it('accepts all 6 valid brand codes', () => {
    const codes: BrandCode[] = ['BNA', 'DNA', 'JD', 'SB', 'KEX', 'KITCHEN'];
    expect(codes).toHaveLength(6);
  });
});

// ─── BUG-11-1 regression — real-data margin range ────────────────────────────
// DECISION (see .planning/phases/11-bug-fix-pack-post-walkthrough/11-05-TRIAGE.md):
//   H3_CONFIRMED — render-layer unit contract mismatch.
// Before fix: formatMargin(70.48) = "7048%" (applied *100 to a value already
// in percentage units). After fix: formatMargin(70.48) = "70%".
// These tests codify the bug signature AND the fixed contract so future regressions fail CI.
describe('BUG-11-1 regression — real-data margin range', () => {
  // Real values captured from /api/finance/dashboard on 2026-04-20 (see 11-05-API-SAMPLE.md)
  const BNA_REVENUE = 29_275_133.01;
  const BNA_FINANCIAL_RESULT = 20_633_794.04;
  const DNA_REVENUE = 42_832_748.93;
  const DNA_FINANCIAL_RESULT = 29_260_215.23;

  it('computeMarginPct for real BNA values returns a value in 40..85 range', () => {
    const pct = computeMarginPct(BNA_REVENUE, BNA_FINANCIAL_RESULT);
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThanOrEqual(40);
    expect(pct!).toBeLessThanOrEqual(85);
    // Should be ~70.48 specifically.
    expect(pct!).toBeCloseTo(70.48, 1);
  });

  it('computeMarginPct for real DNA values returns a value in 40..85 range', () => {
    const pct = computeMarginPct(DNA_REVENUE, DNA_FINANCIAL_RESULT);
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThanOrEqual(40);
    expect(pct!).toBeLessThanOrEqual(85);
    expect(pct!).toBeCloseTo(68.31, 1);
  });

  it('computeMarginPct formula contract preserved — 10000% input returns 10000 (not reshaped)', () => {
    // Guard: the bug was NEVER in computeMarginPct. This test proves the formula
    // still returns exactly (financialResult/revenue)*100 — no division, no reshape.
    expect(computeMarginPct(100, 10000)).toBe(10000);
  });

  it('BUG SIGNATURE — computeMarginPct(29.28M, 2.06B) returns ~7048 (inflated input → formula-correct 7048%)', () => {
    // If someone passes an already-inflated financialResult (×100), the formula dutifully
    // returns 7048. This codifies the observed pre-fix screen value so we can always
    // trace ~7000% to "input was inflated, not the formula".
    const inflatedFr = BNA_FINANCIAL_RESULT * 100; // ~2.063 billion
    const pct = computeMarginPct(BNA_REVENUE, inflatedFr);
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(7000);
    expect(pct!).toBeLessThan(7100);
  });

  // ── formatMargin: percentage in, "N%" out, NO extra *100 ──
  it('formatMargin(70.48) === "70%" — NOT "7048%" (the BUG-11-1 bug)', () => {
    expect(formatMargin(70.48)).toBe('70%');
  });

  it('formatMargin(68.31) === "68%"', () => {
    expect(formatMargin(68.31)).toBe('68%');
  });

  it('formatMargin(0) === "0%"', () => {
    expect(formatMargin(0)).toBe('0%');
  });

  it('formatMargin(null) === "—"', () => {
    expect(formatMargin(null)).toBe('—');
  });

  it('formatMargin rejects the pre-fix double-multiply — 70.48 must NOT render as "7048%"', () => {
    // Regression guard: if someone re-introduces *100, this test fires.
    expect(formatMargin(70.48)).not.toBe('7048%');
  });

  // ── formatDelta: signed percentage in, "+N.N%" / "-N.N%" out ──
  it('formatDelta(-4.74) === "-4.7%" — NOT "-474.0%"', () => {
    expect(formatDelta(-4.74)).toBe('-4.7%');
  });

  it('formatDelta(0.5) === "+0.5%"', () => {
    expect(formatDelta(0.5)).toBe('+0.5%');
  });

  it('formatDelta(0) === "0.0%" (zero has no sign prefix)', () => {
    expect(formatDelta(0)).toBe('0.0%');
  });

  it('formatDelta(5.2) === "+5.2%"', () => {
    expect(formatDelta(5.2)).toBe('+5.2%');
  });

  it('formatDelta(null) === "—"', () => {
    expect(formatDelta(null)).toBe('—');
  });

  it('formatDelta rejects the pre-fix double-multiply — -4.74 must NOT render as "-474.0%"', () => {
    expect(formatDelta(-4.74)).not.toBe('-474.0%');
  });

  // ── End-to-end — computePlanDelta → formatDelta contract holds ──
  it('end-to-end: computePlanDelta(29.28M, 30.74M) piped through formatDelta renders as "-4.7%"', () => {
    const delta = computePlanDelta(29_280_000, 30_740_000);
    // delta is around -4.75 — percentage units
    expect(formatDelta(delta)).toMatch(/^-4\.[0-9]%$/);
  });
});
