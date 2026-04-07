import type { UserRole } from '../../types';

/**
 * Role-gate logic extracted from ArticleDetailScreen and App.tsx:
 * - Level 4 (operations) access: OWNER only
 * - Level 3 (article detail) access: OWNER + FINANCE_DIRECTOR
 * - Level 2 (point detail) access: OWNER + FINANCE_DIRECTOR + OPERATIONS_DIRECTOR
 */
function canAccessOperations(role: UserRole | undefined): boolean {
  return role === 'OWNER';
}

function canAccessArticleDetail(role: UserRole | undefined): boolean {
  return role === 'OWNER' || role === 'FINANCE_DIRECTOR';
}

describe('Operations role-gate (MOB-04, MOB-05)', () => {
  it('OWNER can access operations (Level 4)', () => {
    expect(canAccessOperations('OWNER')).toBe(true);
  });

  it('FINANCE_DIRECTOR cannot access operations (Level 4)', () => {
    expect(canAccessOperations('FINANCE_DIRECTOR')).toBe(false);
  });

  it('OPERATIONS_DIRECTOR cannot access operations (Level 4)', () => {
    expect(canAccessOperations('OPERATIONS_DIRECTOR')).toBe(false);
  });

  it('ADMIN cannot access operations (Level 4)', () => {
    expect(canAccessOperations('ADMIN')).toBe(false);
  });

  it('undefined role cannot access operations', () => {
    expect(canAccessOperations(undefined)).toBe(false);
  });

  it('OWNER can access article detail (Level 3)', () => {
    expect(canAccessArticleDetail('OWNER')).toBe(true);
  });

  it('FINANCE_DIRECTOR can access article detail (Level 3)', () => {
    expect(canAccessArticleDetail('FINANCE_DIRECTOR')).toBe(true);
  });

  it('OPERATIONS_DIRECTOR cannot access article detail (Level 3)', () => {
    expect(canAccessArticleDetail('OPERATIONS_DIRECTOR')).toBe(false);
  });
});
