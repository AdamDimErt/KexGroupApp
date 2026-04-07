import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { DataAccessInterceptor } from './data-access.interceptor';

const createMockContext = (path: string, role: string | undefined) => ({
  switchToHttp: () => ({
    getRequest: () => ({
      method: 'GET',
      path,
      headers: { 'x-user-role': role },
    }),
  }),
});

const mockNext = { handle: jest.fn().mockReturnValue(of('ok')) };

describe('DataAccessInterceptor', () => {
  let interceptor: DataAccessInterceptor;

  beforeEach(() => {
    interceptor = new DataAccessInterceptor();
    jest.clearAllMocks();
    mockNext.handle.mockReturnValue(of('ok'));
  });

  describe('Level 4 operations — OWNER only', () => {
    it('allows OWNER to access /dashboard/article/uuid-123/operations', (done) => {
      const ctx = createMockContext('/dashboard/article/uuid-123/operations', 'OWNER');
      interceptor.intercept(ctx as any, mockNext as any).subscribe({
        complete: () => {
          expect(mockNext.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('throws ForbiddenException for FINANCE_DIRECTOR on /dashboard/article/uuid-123/operations', () => {
      const ctx = createMockContext('/dashboard/article/uuid-123/operations', 'FINANCE_DIRECTOR');
      expect(() => interceptor.intercept(ctx as any, mockNext as any)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for OPERATIONS_DIRECTOR on /dashboard/article/uuid-123/operations', () => {
      const ctx = createMockContext('/dashboard/article/uuid-123/operations', 'OPERATIONS_DIRECTOR');
      expect(() => interceptor.intercept(ctx as any, mockNext as any)).toThrow(ForbiddenException);
    });

    it('matches UUID segments — /dashboard/article/550e8400-e29b-41d4-a716-446655440000/operations allows OWNER', (done) => {
      const ctx = createMockContext(
        '/dashboard/article/550e8400-e29b-41d4-a716-446655440000/operations',
        'OWNER',
      );
      interceptor.intercept(ctx as any, mockNext as any).subscribe({
        complete: () => {
          expect(mockNext.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('matches param route /dashboard/article/abc123/operations blocks FINANCE_DIRECTOR', () => {
      const ctx = createMockContext('/dashboard/article/abc123/operations', 'FINANCE_DIRECTOR');
      expect(() => interceptor.intercept(ctx as any, mockNext as any)).toThrow(ForbiddenException);
    });
  });

  describe('/dashboard/reports/dds — OWNER + FINANCE_DIRECTOR only', () => {
    it('throws ForbiddenException for OPERATIONS_DIRECTOR on /dashboard/reports/dds', () => {
      const ctx = createMockContext('/dashboard/reports/dds', 'OPERATIONS_DIRECTOR');
      expect(() => interceptor.intercept(ctx as any, mockNext as any)).toThrow(ForbiddenException);
    });

    it('allows OWNER on /dashboard/reports/dds', (done) => {
      const ctx = createMockContext('/dashboard/reports/dds', 'OWNER');
      interceptor.intercept(ctx as any, mockNext as any).subscribe({
        complete: () => {
          expect(mockNext.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('allows FINANCE_DIRECTOR on /dashboard/reports/dds', (done) => {
      const ctx = createMockContext('/dashboard/reports/dds', 'FINANCE_DIRECTOR');
      interceptor.intercept(ctx as any, mockNext as any).subscribe({
        complete: () => {
          expect(mockNext.handle).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('/dashboard/reports/kitchen — OWNER + FINANCE_DIRECTOR + OPERATIONS_DIRECTOR', () => {
    it('allows OPERATIONS_DIRECTOR on /dashboard/reports/kitchen (passthrough)', (done) => {
      const ctx = createMockContext('/dashboard/reports/kitchen', 'OPERATIONS_DIRECTOR');
      interceptor.intercept(ctx as any, mockNext as any).subscribe({
        complete: () => {
          expect(mockNext.handle).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('/dashboard/article/:groupId — OWNER + FINANCE_DIRECTOR, no OPERATIONS_DIRECTOR', () => {
    it('allows FINANCE_DIRECTOR on /dashboard/article/some-group-id', (done) => {
      const ctx = createMockContext('/dashboard/article/some-group-id', 'FINANCE_DIRECTOR');
      interceptor.intercept(ctx as any, mockNext as any).subscribe({
        complete: () => {
          expect(mockNext.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('throws ForbiddenException for OPERATIONS_DIRECTOR on /dashboard/article/some-group-id', () => {
      const ctx = createMockContext('/dashboard/article/some-group-id', 'OPERATIONS_DIRECTOR');
      expect(() => interceptor.intercept(ctx as any, mockNext as any)).toThrow(ForbiddenException);
    });
  });

  describe('Unprotected routes — passthrough regardless of role', () => {
    it('passes through any role on /dashboard (main summary, not in matrix)', (done) => {
      const ctx = createMockContext('/dashboard', 'OPERATIONS_DIRECTOR');
      interceptor.intercept(ctx as any, mockNext as any).subscribe({
        complete: () => {
          expect(mockNext.handle).toHaveBeenCalled();
          done();
        },
      });
    });

    it('passes through /dashboard/brand/some-brand-id for any role', (done) => {
      const ctx = createMockContext('/dashboard/brand/some-brand-id', 'OPERATIONS_DIRECTOR');
      interceptor.intercept(ctx as any, mockNext as any).subscribe({
        complete: () => {
          expect(mockNext.handle).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('Missing role header', () => {
    it('throws ForbiddenException with "unknown" in message when no x-user-role on protected route', () => {
      const ctx = createMockContext('/dashboard/reports/dds', undefined);
      expect(() => interceptor.intercept(ctx as any, mockNext as any)).toThrow(ForbiddenException);
    });

    it('ForbiddenException message includes the role name', () => {
      const ctx = createMockContext('/dashboard/reports/dds', 'OPERATIONS_DIRECTOR');
      try {
        interceptor.intercept(ctx as any, mockNext as any);
        fail('Expected ForbiddenException to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect((err as ForbiddenException).message).toContain('OPERATIONS_DIRECTOR');
      }
    });

    it('ForbiddenException message includes "unknown" for missing role', () => {
      const ctx = createMockContext('/dashboard/reports/dds', undefined);
      try {
        interceptor.intercept(ctx as any, mockNext as any);
        fail('Expected ForbiddenException to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect((err as ForbiddenException).message).toContain('unknown');
      }
    });
  });
});
