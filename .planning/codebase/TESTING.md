# Testing Patterns

**Analysis Date:** 2026-05-02

## Test Framework

**Runner:**
- Backend (NestJS): Jest 30.0.0 (configured in package.json)
- Mobile (React Native): Jest 30.0.0 (configured in package.json)
- Config: Inline in `package.json` (no separate jest.config.js)

**Assertion Library:**
- `expect()` from Jest built-in

**Run Commands:**
```bash
npm test              # Run all tests (in root runs across monorepo)
npm run test:watch   # Watch mode (backend services)
npm run test:cov     # Generate coverage report
npm run test:debug   # Debug with Node inspector
npm run test:e2e     # Run e2e tests (if config present)
```

## Test File Organization

**Location:**
- Backend: Co-located with source (same directory as `.ts` file)
- Mobile: Co-located with source (same directory as `.tsx` file)
- Shared: `src/__tests__/` subdirectories for utilities

**Naming:**
- Backend: `{name}.spec.ts` (e.g., `auth.service.spec.ts`)
- Mobile: `{name}.test.ts` (e.g., `brand.test.ts`)
- Mobile directories: `__tests__/` subdirectory (e.g., `src/hooks/__tests__/useOperations.test.ts`)

**Structure (Backend):**
```
apps/auth-service/src/
├── auth/
│   ├── auth.service.ts
│   ├── auth.service.spec.ts       # spec = describe + beforeEach + it blocks
│   ├── auth.controller.ts
│   ├── auth.controller.spec.ts
│   └── dto/
│       └── auth.dto.ts
├── app.controller.ts
└── app.controller.spec.ts
```

**Structure (Mobile):**
```
apps/mobile-dashboard/src/
├── utils/
│   ├── brand.ts
│   └── brand.test.ts               # test = unit tests for utilities
├── hooks/
│   ├── useOperations.ts
│   └── __tests__/
│       └── useOperations.test.ts
```

## Test Structure

**Suite Organization (Backend):**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockRedis: any;
  let mockPrisma: any;

  beforeEach(async () => {
    // Setup all mocks
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: 'PRISMA_CLIENT', useValue: mockPrisma },
        // ... other mocks
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('generateOtp', () => {
    it('should generate OTP and save to Redis with 5 min TTL', async () => {
      const phone = '+77771234567';
      mockRedis.get.mockResolvedValue(null);
      
      const result = await service.generateOtp(phone);
      
      expect(result.success).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        `otp:${phone}`,
        expect.stringMatching(/^\d{6}$/),
        'EX',
        300,
      );
    });
  });
});
```

**Patterns:**
- `describe()` blocks organize tests by feature/method
- Nested `describe()` blocks for related test groups (e.g., "generateOtp — Telegram Gateway")
- `beforeEach()` initializes test module and clears all mocks
- `it()` blocks test single responsibility
- Assertion pattern: arrange → act → assert (AAA)

## Mocking

**Framework:** Jest built-in `jest.fn()` and `jest.mock()`

**Patterns for NestJS Services:**
```typescript
// Mock external service
const mockRedis = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn(),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn(),
};

// Mock JWT Service
const mockJwtService = {
  sign: jest.fn(() => 'mock.jwt.token.signed'),
  verify: jest.fn(),
  decode: jest.fn(),
};

// Custom provider in Test.createTestingModule
providers: [
  { provide: 'REDIS_CLIENT', useValue: mockRedis },
  { provide: JwtService, useValue: mockJwtService },
]
```

**Patterns for Global Mocks (Module-level):**
```typescript
// Mock ioredis before imports
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => redisMock);
});
```

**Override Guards in Integration Tests:**
```typescript
const mockJwtAuthGuard = { canActivate: (_ctx: ExecutionContext) => true };

Test.createTestingModule({
  controllers: [FinanceProxyController],
  // ...
})
  .overrideGuard(JwtAuthGuard)
  .useValue(mockJwtAuthGuard)
  .overrideGuard(RolesGuard)
  .useValue(mockRolesGuard)
  .compile();
```

**What to Mock:**
- External HTTP clients (Mobizon API, Telegram Gateway, iiko Cloud API)
- Database calls (Prisma)
- Redis operations
- JWT verification (when not testing auth flow)
- File system operations
- Time-dependent functions (via `jest.useFakeTimers()` when needed)

**What NOT to Mock:**
- Business logic within the service under test
- NestJS decorators and metadata
- Pure utility functions (test real implementation)
- Role-gate logic (test actual rules, not mocked roles)

## Fixtures and Factories

**Test Data (Backend):**
```typescript
const mockUser = {
  id: 'user-123',
  phone: '+77771234567',
  name: 'Test User',
  role: 'OPERATIONS_DIRECTOR',
  isActive: true,
  tenantId: null,
  tenant: null,
  restaurants: [],
};

const mockAxiosResponse = {
  data: {},
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
};
```

**Test Data (Mobile):**
```typescript
// In brand.test.ts
const BNA_REVENUE = 29_275_133.01;
const BNA_FINANCIAL_RESULT = 20_633_794.04;
const DNA_REVENUE = 42_832_748.93;
const DNA_FINANCIAL_RESULT = 29_260_215.23;
```

**Location:**
- Defined inline in test files (no separate factory files)
- Reused within a single test suite via `const mockXxx = { ... }`
- Real API sample data captured in separate `.md` files for reference (e.g., `11-05-API-SAMPLE.md`)

## Coverage

**Requirements:** No explicit coverage target enforced in CI

**View Coverage (Backend):**
```bash
npm run test:cov
```

Output written to `coverage/` directory (specified in jest config as `coverageDirectory: ../coverage`)

**Mobile Coverage:**
```bash
npm test -- --coverage
```

**Target approach:** Functional coverage prioritized over % targets
- All auth paths tested (OTP success, failure, rate limiting, bypass)
- All role-gate paths tested (OWNER vs non-OWNER access)
- Real-world bug regressions captured as test contracts

## Test Types

**Unit Tests:**
- Scope: Single service method or utility function
- Isolation: All dependencies mocked
- Speed: <100ms per test
- Example: `auth.service.spec.ts` tests `generateOtp()`, `verifyOtp()`, `refresh()` in isolation
- Example: `brand.test.ts` tests pure utility functions like `formatMargin()`, `computeMarginPct()`
- Firebase/Sentry mocks allow "unit" scope without real backend (see `__mocks__/@sentry/`)

**Integration Tests:**
- Scope: Multiple services interacting
- Isolation: Real module compilation via `Test.createTestingModule()`
- Example: `finance-proxy.controller.spec.ts` tests controller → service → forward pattern
- Guards overridden to focus on controller logic (guard tests separate)
- Database mocked but full request/response cycle tested

**E2E Tests:**
- Framework: Jest + supertest (configured but limited usage)
- Config: `test/jest-e2e.json` files present in backend services
- Scope: Full HTTP request → response through all layers
- Status: Minimal (one placeholder test in api-gateway per comments in config)
- Coverage: Focus on critical auth flows

## Common Patterns

**Async Testing (Backend):**
```typescript
it('should return AuthSuccessDto when OTP is correct', async () => {
  mockRedis.get.mockImplementation((key: string) => {
    if (key === `otp:${phone}`) return validCode;
    if (key === `otp_attempts:${phone}`) return null;
    return null;
  });

  mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

  const result = await service.verifyOtp(phone, validCode);

  expect(result.accessToken).toBe('mock.jwt.token.signed');
  expect(result.refreshToken).toBeDefined();
});
```

**Fire-and-Forget Testing (Non-blocking Audit Logs):**
```typescript
it('should write AuditLog on successful OTP verification', async () => {
  mockRedis.get.mockImplementation((key: string) => {
    if (key === `otp:${phone}`) return validCode;
    if (key === `otp_attempts:${phone}`) return null;
    return null;
  });
  mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

  await service.verifyOtp(phone, validCode, '127.0.0.1', 'TestAgent');

  // Give fire-and-forget a tick to execute
  await new Promise((resolve) => setImmediate(resolve));

  expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
    data: {
      userId: 'user-123',
      action: 'LOGIN',
      ip: '127.0.0.1',
      userAgent: 'TestAgent',
      entity: undefined,
    },
  });
});
```

**Error Testing (Rate Limiting):**
```typescript
it('should handle rate limiting - too many attempts', async () => {
  const phone = '+77771234567';
  mockRedis.get.mockResolvedValue('5'); // 5 attempts already

  await expect(service.generateOtp(phone)).rejects.toThrow(
    new HttpException(
      'Слишком много попыток. Попробуйте через 15 минут.',
      HttpStatus.TOO_MANY_REQUESTS,
    ),
  );
});
```

**Testing Dev Bypass Logic (Role Override):**
```typescript
it('returns OWNER role when bypass code used with listed phone in development', async () => {
  mockRedis.get.mockImplementation((key: string) => {
    if (key === `otp:${bypassPhone}`) return bypassCode;
    if (key === `otp_attempts:${bypassPhone}`) return null;
    return null;
  });
  mockPrisma.user.findUnique.mockResolvedValue(mockOwnerUser as any);

  const result = await service.verifyOtp(bypassPhone, bypassCode);

  // Role in the returned UserDto must be OWNER regardless of what DB has
  expect(result.user.role).toBe('OWNER');
});
```

**Regression Testing (Real Data Contracts):**
```typescript
describe('BUG-11-1 regression — real-data margin range', () => {
  // Real values captured from /api/finance/dashboard on 2026-04-20
  const BNA_REVENUE = 29_275_133.01;
  const BNA_FINANCIAL_RESULT = 20_633_794.04;

  it('computeMarginPct for real BNA values returns a value in 40..85 range', () => {
    const pct = computeMarginPct(BNA_REVENUE, BNA_FINANCIAL_RESULT);
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThanOrEqual(40);
    expect(pct!).toBeLessThanOrEqual(85);
    expect(pct!).toBeCloseTo(70.48, 1); // Real observed value
  });

  it('formatMargin(70.48) === "70%" — NOT "7048%" (the BUG-11-1 bug)', () => {
    expect(formatMargin(70.48)).toBe('70%');
  });
});
```

## Test Coverage Summary

**Well-Tested:**
- Auth service: OTP generation, verification, refresh, logout, biometric (50+ tests)
- Auth controller: HTTP layer request/response mapping (implicit via guard tests)
- Finance proxy controller: Role-gate defense, empty scope short-circuit (15+ tests)
- Brand utilities: Naming resolution, margin calculations, timezone formatting (40+ tests)
- Role-gate logic: OWNER-only vs. multi-role access patterns (5+ tests)

**Partially Tested:**
- Mobile components: Props + state, not full render cycles (Button, Badge have simple contracts)
- IikoSync: Structure/brand sync tested, financial snapshot sync less covered
- 1C sync: Core logic tested, fallback scenarios less covered

**Untested/Gaps:**
- Mobile navigation: screen transitions, routing logic
- Mobile API integration: actual axios calls (mocked)
- Worker health checks: retry logic, circuit breaker
- Cost allocation: edge cases (zero revenue, single restaurant)
- Notification delivery: FCM integration
- Biometric auth on mobile: platform-specific behavior

---

*Testing analysis: 2026-05-02*
