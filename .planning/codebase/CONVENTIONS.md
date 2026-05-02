# Coding Conventions

**Analysis Date:** 2026-05-02

## Naming Patterns

**Files:**
- NestJS services: `{name}.service.ts` (e.g., `auth.service.ts`, `iiko-sync.service.ts`)
- Controllers: `{name}.controller.ts` (e.g., `auth.controller.ts`)
- DTOs: `{name}.dto.ts` (e.g., `auth.dto.ts`)
- Modules: `{name}.module.ts`
- Test files (Backend): `{name}.spec.ts` (colocated with source)
- Test files (Mobile): `{name}.test.ts` (colocated with source)
- React Native components: `{name}.tsx` (e.g., `Button.tsx`, `HeroCard.tsx`)
- Styles: `{name}.styles.ts` (e.g., `Button.styles.ts`)
- Hooks: `use{Name}.ts` (e.g., `useOperations.ts`)
- Utils: `{name}.ts` (e.g., `brand.ts`, `format.ts`)

**Functions/Methods:**
- camelCase for all functions and methods
- Private methods prefix underscore (legacy pattern seen but not enforced): `private async methodName()`
- Service methods are public and directly callable: `async generateOtp(phone: string)`
- Async methods explicitly marked with `async` keyword
- Example: `generateOtp()`, `verifyOtp()`, `findOrCreateUser()`, `issueTokens()`

**Variables:**
- camelCase for all local variables and parameters
- Constants in uppercase with underscores: `MAX_ATTEMPTS = 5`, `BLOCK_DURATION_SEC = 900`, `OTP_TTL_SEC = 300`
- Private fields in services prefixed with underscore for clarity: `private readonly logger = new Logger()`
- Redux/Zustand store names in camelCase: `brandStore`, `authStore`

**Types:**
- PascalCase for all TypeScript types and interfaces
- DTO classes: `SendOtpDto`, `VerifyOtpDto`, `RefreshTokenDto`, `BiometricVerifyDto`
- Service names: `AuthService`, `FinanceProxyService`, `IikoSyncService`
- Module names: `AuthModule`, `HealthModule`, `FinanceProxyModule`
- Enums: `UserRole`, `ButtonVariant`, `ButtonSize`, `ButtonState`
- Union types (lowercase): `'primary' | 'secondary' | 'tertiary'`
- Example: `type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive'`

## Code Style

**Formatting:**
- Tool: Prettier (^3.2.5 in root, ^3.4.2 in services)
- No custom .prettierrc file — uses defaults
- Line endings: auto (ESLint rule: `"prettier/prettier": ["error", { endOfLine: "auto" }]`)

**Linting:**
- Tool: ESLint 9.18.0 with TypeScript support (`typescript-eslint`)
- Backend config: `eslint.config.mjs` (flat config, ESM format)
- Strict mode enabled but with pragmatic exceptions:
  - `@typescript-eslint/no-explicit-any`: OFF (relaxed for external types)
  - `@typescript-eslint/no-floating-promises`: WARN
  - `@typescript-eslint/no-unsafe-argument`: WARN
- Format command: `npm run format` (applies Prettier to `**/*.{ts,tsx,md}`)
- Lint command: `npm run lint` (runs ESLint with --fix)

**TypeScript Configuration:**
- Backend strictness: `strictNullChecks: true`, `noImplicitAny: true`, `strictBindCallApply: true`
- Mobile: `tsconfig.json` extends `expo/tsconfig.base` (lenient for React Native)
- Backend tsconfig: `target: ES2023`, `module: nodenext`, `moduleResolution: nodenext`
- Feature flags: `emitDecoratorMetadata: true`, `experimentalDecorators: true` (NestJS requirement)
- `skipLibCheck: true` for faster compilation

## Import Organization

**Order (Backend Services):**
1. Node.js built-ins (e.g., `import { randomUUID } from 'crypto'`)
2. Third-party packages (e.g., `import { Injectable } from '@nestjs/common'`)
3. NestJS packages (e.g., `import { JwtService } from '@nestjs/jwt'`)
4. Database/ORM (e.g., `import { PrismaClient } from '@prisma/client'`)
5. Local modules (e.g., `import { AuthService } from './auth.service'`)
6. Shared types (e.g., `import { UserDto, AuthSuccessDto } from '@dashboard/shared-types'`)

Example from `auth.service.ts`:
```typescript
import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import {
  AuthSuccessDto,
  SendOtpResponseDto,
  UserDto,
  UserRole,
} from '@dashboard/shared-types';
```

**Path Aliases:**
- Backend: `baseUrl: ./`, no `paths` configured (relative imports used)
- Mobile: Standard relative imports with `@sentry/react-native` module name mapping for mocks

## Error Handling

**Patterns:**
- NestJS HTTP Exceptions: `HttpException`, `UnauthorizedException`, `HttpStatus.TOO_MANY_REQUESTS`
- Try/catch blocks used for external API calls (Telegram Gateway, SMS, Mobizon)
- Fire-and-forget (non-blocking) error handling: `void this.writeAuditLog()` with internal try/catch
- Critical operations wrapped with explicit error logging to Sentry context
- Example from auth.service.ts (lines 369-376):
  ```typescript
  private async writeAuditLog(...): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: { userId, action, ... } });
    } catch (e) {
      this.logger.error('AuditLog write failed', e);
    }
  }
  ```
- Silent fallbacks: SMS fallback when Telegram Gateway unavailable (no error thrown)

## Logging

**Framework:** NestJS Logger (`new Logger(ClassName.name)`)

**Patterns:**
- Instance logging: `this.logger = new Logger(AuthService.name)` in constructor
- Levels used: `.log()` (info), `.warn()`, `.error()`
- Log important state changes: user creation, role overrides, device auth events
- Development bypass: `this.logger.warn('[DEV BYPASS] ...')` to mark non-prod code paths
- Example (auth.service.ts lines 175-177):
  ```typescript
  this.logger.warn(
    `[DEV BYPASS] Overriding role ${user.role} → OWNER for ${phone}`,
  );
  ```

## Comments

**When to Comment:**
- Complex role-gate logic: explain the business rule (e.g., "OWNER can access operations (Level 4)")
- Workarounds and TODOs: mark with `// BUG-11-7:` format for issue tracking
- Fire-and-forget patterns: clarify intentional async void
- Private field explanations: describe constants like `OTP_TTL_SEC = 300; // 5 min`
- Section headers using horizontal lines: `// ─── Section Name ─────────────────`

**JSDoc/TSDoc:**
- Not heavily used; NestJS and TypeScript provide sufficient type inference
- DTOs and interfaces are self-documenting via type annotations
- Example: DTO validators have `message:` strings instead of JSDoc

## Function Design

**Size:** 
- Backend services: 20-100 lines per method (auth.service.ts methods range 10-70 lines)
- Private helpers: extracted for reusability (see `issueTokens`, `toUserDto`, `findOrCreateUser`)
- Controllers: lean, delegate to service (3-10 lines typical)

**Parameters:**
- Maximum 4-5 parameters; use options object for larger payloads
- DTOs used for request validation: `@Body() body: SendOtpDto`
- Optional parameters with `?` syntax: `ip?: string`, `userAgent?: string`
- Type annotations required for all parameters

**Return Values:**
- Explicit return types on all public methods: `async generateOtp(phone: string): Promise<SendOtpResponseDto>`
- DTOs returned from services for serialization consistency
- Void for fire-and-forget operations: `void this.writeAuditLog()`

## Module Design

**Exports:**
- Controllers exported via `@Module({ controllers: [...] })`
- Services exported via `@Module({ providers: [...] })`
- Factories for dependency injection: `useFactory: (config) => new Redis(...)`
- Custom tokens for injected dependencies: `@Inject('REDIS_CLIENT') private readonly redis: Redis`
- Example from auth.module.ts (lines 25-54):
  ```typescript
  providers: [
    AuthService,
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6380'),
    },
  ]
  ```

**Barrel Files:**
- Not used extensively; imports reference specific files (e.g., `./auth.service`, `./auth.dto`)

## NestJS Decorator Patterns

**@Injectable():** All services marked with `@Injectable()` for NestJS DI
**@Module():** Module structure with `imports`, `controllers`, `providers`
**@Controller():** Path prefix in parentheses: `@Controller('auth')`
**@Post/@Get/@Put/@Delete:** HTTP method decorators with path: `@Post('send-otp')`
**@Body():** DTO validation automatic via `class-validator` decorators on DTO
**@Param(), @Query(), @Headers():** Extract from request
**@HttpCode():** Explicit status codes: `@HttpCode(HttpStatus.OK)`
**@SetMetadata():** Custom decorators for role gates: `Roles([UserRole.OWNER])`

## DTO Validation

**Framework:** `class-validator` (^0.14.1)

**Pattern:**
- Decorators on class fields for validation rules
- `@IsString()`, `@IsNotEmpty()`, `@Matches()`, `@Length()` for common cases
- Custom error messages in Russian: `message: 'Номер телефона обязателен'`
- Example from auth.dto.ts:
  ```typescript
  export class SendOtpDto {
    @IsString()
    @IsNotEmpty({ message: 'Номер телефона обязателен' })
    @Matches(/^\+7\d{10}$/, { message: 'Формат: +7XXXXXXXXXX (Казахстан)' })
    phone: string;
  }
  ```

## Dependency Injection

**Pattern:** NestJS Module-level providers with `useFactory`
- External clients (Redis, Prisma, Telegram Gateway) registered as custom tokens
- Constructor injection via `@Inject('TOKEN_NAME')` for named providers
- Async factory functions: `useFactory: async (config) => { ... }`
- Fallback values for optional services: `token ? new Client(token) : null`

## Commit Message Style

**Format:** Conventional Commits (semantic versioning)
- Type prefix: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`
- Scope: service/feature name in parentheses (optional): `feat(auth):`, `fix(mobile):`
- Description: present tense, lowercase, issue reference optional
- Example: `feat(mobile): legal entity drilldown + settings tab + search overlay`
- Example: `fix(11-05): BUG-11-1 root cause — render-layer unit contract mismatch`
- Multi-line messages: description, blank line, bullet details, Co-Authored-By footer

## React Native / Mobile Conventions

**Component Props:**
- Interface-based props: `interface ButtonProps { variant?: ButtonVariant; ... }`
- Optional props with defaults: `variant = 'primary'`
- Type unions for variants: `type ButtonVariant = 'primary' | 'secondary' | ...`
- Accessibility props: `accessibilityLabel`, `accessibilityHint`, `testID`

**Styling:**
- Separate `.styles.ts` file with StyleSheet definitions
- Token resolution functions: `getLabelColor()`, `getIconColor()` for state-based styling
- Record maps for variant/state combinations: `const containerStyle: Record<ButtonVariant, Record<StateKey, ViewStyle>>`

**Hooks:**
- Zustand stores for global state: `const useAuthStore`, `const useBrandStore`
- React Query for server state: `useQuery`, `useMutation`
- Custom hooks for business logic: `useOperations()`, extracted from screens
- Example pattern: `const { data } = useQuery([...], () => api.fetch(...))`

---

*Convention analysis: 2026-05-02*
