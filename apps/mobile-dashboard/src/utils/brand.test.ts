import {
  resolveBrand,
  computePlanAttainment,
  computePlanDelta,
  formatPlanLabel,
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
